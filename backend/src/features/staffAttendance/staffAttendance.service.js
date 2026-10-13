import crypto from 'crypto';
import mongoose from 'mongoose';
import staffAttendanceRepository from './staffAttendance.repository.js';
import staffAttendanceEvents from './staffAttendance.events.js';
import technicianService from '../technician/technician.service.js';
import staffUnitAssociationService from '../staffUnitAssociation/staffUnitAssociation.service.js';
import staffNotificationService from '../staffNotification/staffNotification.service.js';
import HttpError from '../../utils/httpError.utils.js';

class StaffAttendanceService {
  /**
   * Parses scanned QR/barcode string to extract technician identifier.
   */
  parseScanPayload(rawPayload) {
    if (!rawPayload || typeof rawPayload !== 'string') {
      throw new HttpError(400, 'Scanned QR payload is empty or invalid.');
    }

    const trimmed = rawPayload.trim();

    // 1. Nahom standard barcode format: MMG:SERVICE:{CODE}:{TECH_ID}:{NAME}[:{SIGNATURE}]
    if (/^MMG[:\-_]/i.test(trimmed)) {
      const parts = trimmed.replace(/^MMG[:\-_]/i, '').split(':');
      if (parts.length >= 2) {
        const type = parts[0]?.toUpperCase().trim();
        const code = parts[1]?.trim();
        const passId = parts[2]?.trim();
        let rawName = undefined;
        let signature = undefined;

        if (parts.length >= 5) {
          rawName = parts[3]?.replace(/_/g, ' ').trim();
          signature = parts[4]?.trim();
        } else if (parts.length === 4) {
          rawName = parts[3]?.replace(/_/g, ' ').trim();
        }

        const isObjectId = passId && /^[0-9a-fA-F]{24}$/.test(passId);
        return {
          technicianId: isObjectId ? passId : (/^[0-9a-fA-F]{24}$/.test(code) ? code : null),
          staffCode: code,
          name: rawName,
          signature,
        };
      }
    }

    // 2. Token format: STF:{TECH_ID}:{SIGNATURE}
    if (/^STF:/i.test(trimmed)) {
      const parts = trimmed.split(':');
      if (parts.length >= 2) {
        const techId = parts[1]?.trim();
        const signature = parts[2]?.trim();
        return {
          technicianId: /^[0-9a-fA-F]{24}$/.test(techId) ? techId : null,
          signature,
        };
      }
    }

    // 3. JSON payload: {"app":"Nahom", "type":"SERVICE", "technicianId":"...", ...}
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        const techId = parsed.technicianId || parsed.passId || parsed.id || parsed._id;
        const code = parsed.staffCode || parsed.code;
        return {
          technicianId: techId && /^[0-9a-fA-F]{24}$/.test(techId) ? techId : null,
          staffCode: code ? String(code).trim() : null,
          signature: parsed.signature,
        };
      } catch {
        // Fall through
      }
    }

    // 4. Direct 24-hex ObjectId
    if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
      return { technicianId: trimmed };
    }

    // 5. Direct staffCode (e.g. STF-001 or numeric code)
    return { staffCode: trimmed };
  }

  /**
   * Validates HMAC cryptographic signature using constant-time comparison.
   */
  validateStaffSignature(technician, orgId, providedSignature) {
    if (
      !providedSignature ||
      typeof providedSignature !== 'string' ||
      !/^[0-9a-fA-F]{16}$/.test(providedSignature)
    ) {
      throw new HttpError(401, 'Invalid or tampered staff QR code signature.');
    }
    const rawStaffCode = technician.staffCode || String(technician._id);
    const techId = String(technician._id);

    // Expiry check if configured on technician
    const now = new Date();
    if (technician.qrValidFrom && now < new Date(technician.qrValidFrom)) {
      throw new HttpError(403, 'Staff QR pass is not yet active.');
    }
    if (technician.qrValidUntil && now > new Date(technician.qrValidUntil)) {
      throw new HttpError(403, 'Staff QR pass has expired. Please contact Community Admin for renewal.');
    }

    let activeSecret = process.env.QR_HMAC_SECRET;
    if (!activeSecret && process.env.NODE_ENV === 'production') {
      throw new HttpError(
        500,
        'Cryptographic configuration error: QR_HMAC_SECRET must be explicitly configured in production.'
      );
    }
    activeSecret = activeSecret || process.env.JWT_SECRET || 'secret';
    if (process.env.NODE_ENV === 'production') {
      if (activeSecret === 'secret' || activeSecret.length < 32) {
        throw new HttpError(500, 'Cryptographic secret does not meet security requirements.');
      }
    }

    const secretsToTry = [activeSecret];
    if (process.env.QR_HMAC_SECRET_PREVIOUS) {
      secretsToTry.push(process.env.QR_HMAC_SECRET_PREVIOUS);
    }

    const providedBuf = Buffer.from(providedSignature, 'hex');
    const validUntilIso = technician.qrValidUntil ? new Date(technician.qrValidUntil).toISOString() : '';

    for (const secret of secretsToTry) {
      // 1. Try modern timestamped signature
      const expectedSigWithTime = crypto
        .createHmac('sha256', secret)
        .update(`${orgId}:${techId}:${rawStaffCode}:${validUntilIso}`)
        .digest('hex')
        .slice(0, 16);

      const expectedBufWithTime = Buffer.from(expectedSigWithTime, 'hex');
      if (
        providedBuf.length === expectedBufWithTime.length &&
        crypto.timingSafeEqual(providedBuf, expectedBufWithTime)
      ) {
        return true;
      }

      // 2. Backward compatibility with un-timestamped signature
      const expectedSigLegacy = crypto
        .createHmac('sha256', secret)
        .update(`${orgId}:${techId}:${rawStaffCode}`)
        .digest('hex')
        .slice(0, 16);

      const expectedBufLegacy = Buffer.from(expectedSigLegacy, 'hex');
      if (
        providedBuf.length === expectedBufLegacy.length &&
        crypto.timingSafeEqual(providedBuf, expectedBufLegacy)
      ) {
        return true;
      }
    }

    throw new HttpError(401, 'Invalid or tampered staff QR token signature.');
  }

  /**
   * Resolves active Technician document strictly within the active organization.
   */
  async resolveTechnician(parsed, orgId) {
    let technician = null;

    if (parsed.technicianId) {
      technician = await technicianService.getTechnicianById(parsed.technicianId, orgId);
    } else if (parsed.staffCode) {
      const list = await technicianService.getTechnicians(orgId, {
        staffCode: parsed.staffCode,
        isDeleted: false,
      });
      if (list && list.length > 0) {
        technician = list[0];
      }
    }

    if (!technician || technician.isDeleted) {
      throw new HttpError(404, 'Staff member not found in this community.');
    }

    if (technician.status !== 'Active') {
      throw new HttpError(400, 'Staff member account is not active.');
    }

    return technician;
  }

  /**
   * Concurrency-safe gate attendance scan handler.
   * State Machine:
   * - No open session -> create open session (ENTRY)
   * - Active open session exists -> close session (EXIT)
   */
  async recordGateScan({
    scannedPayload,
    gateId = 'Main Gate',
    guardId,
    orgId,
    idempotencyKey,
    action = 'AUTO',
    notes = '',
    isManualEntry = false,
  }) {
    if (!orgId) {
      throw new HttpError(400, 'Organization ID is required.');
    }
    if (!guardId) {
      throw new HttpError(401, 'Guard identification is required.');
    }

    // 1. Check idempotency key for replay/duplicate request
    if (idempotencyKey) {
      const existing = await staffAttendanceRepository.findByIdempotencyKey(orgId, idempotencyKey);
      if (existing) {
        return {
          action: existing.status === 'Open' ? 'ENTRY' : 'EXIT',
          session: existing,
          technician: existing.technicianId,
          isDuplicate: true,
          message: `Attendance ${existing.status === 'Open' ? 'check-in' : 'check-out'} already processed.`,
        };
      }
    }

    // 2. Parse payload and resolve technician
    const parsed = this.parseScanPayload(scannedPayload);
    const technician = await this.resolveTechnician(parsed, orgId);

    // Cryptographic signature verification:
    // Scanned QR payloads MUST contain a valid cryptographic signature.
    // Unsigned payloads (raw IDs, codes, legacy 4-part barcodes) are strictly rejected
    // unless submitted via an explicitly authorized manual override.
    const allowLegacyUnsigned =
      process.env.NODE_ENV !== 'production' &&
      process.env.ALLOW_LEGACY_UNSIGNED_STAFF_SCANS === 'true';

    if (parsed.signature) {
      this.validateStaffSignature(technician, orgId, parsed.signature);
    } else if (!isManualEntry && !allowLegacyUnsigned) {
      throw new HttpError(
        401,
        'Unsigned staff QR payload is not authorized for gate attendance. Valid cryptographic signature is required.'
      );
    }

    // 3. Resolve active unit associations (cross-feature call to staffUnitAssociationService)
    const associations = await staffUnitAssociationService.getActiveAssociationsForStaff(
      technician._id,
      orgId
    );
    const associatedUnits = (associations || []).map((a) => {
      const v = a.villaId;
      return {
        _id: v?._id || a.villaId,
        unitNumber: v?.unitNumber || '',
        blockOrBuilding: v?.blockOrBuilding || '',
        status: v?.status || '',
      };
    });

    // 4. Query current open session for this technician in this organization
    const openSession = await staffAttendanceRepository.findActiveSession(orgId, technician._id);

    const now = new Date();
    const cleanAction = action ? action.toUpperCase().trim() : 'AUTO';

    // 5. Execute state machine transitions
    if (cleanAction === 'ENTRY') {
      if (openSession) {
        // Duplicate scan check: if checked in within the last 15 seconds, return idempotently
        const diffSeconds = (now.getTime() - new Date(openSession.checkInTime).getTime()) / 1000;
        if (diffSeconds < 15) {
          return {
            action: 'ENTRY',
            session: openSession,
            technician,
            associatedUnits,
            isDuplicate: true,
            message: 'Staff member was just checked in.',
          };
        }
        throw new HttpError(409, 'Staff member already has an active open session. Please check out first.');
      }

      // Create new open session
      const newSession = await staffAttendanceRepository.createSession({
        orgId,
        technicianId: technician._id,
        staffCode: technician.staffCode || '',
        status: 'Open',
        checkInTime: now,
        checkInGate: gateId || 'Main Gate',
        checkInGuardId: guardId,
        idempotencyKey: idempotencyKey || null,
        notes: notes || '',
        isManualEntry: isManualEntry === true,
      });

      // Enqueue durable outbox event for crash-resilient notification delivery
      try {
        await staffNotificationService.enqueueStaffEntryNotification({
          session: newSession,
          technician,
          orgId,
          guardId,
          gateId,
        });
      } catch (err) {
        // Attendance persistence must remain successful even if notification enqueue fails
      }

      // Emit domain event for future consumers (notifications, socket events)
      staffAttendanceEvents.emit('staff_entry', {
        session: newSession,
        technician,
        associatedUnits,
        orgId,
        guardId,
      });

      return {
        action: 'ENTRY',
        session: newSession,
        technician,
        associatedUnits,
        message: 'Staff check-in recorded successfully.',
      };
    }

    if (cleanAction === 'EXIT') {
      if (!openSession) {
        throw new HttpError(400, 'Staff member does not have an active open session to check out.');
      }

      const closedSession = await staffAttendanceRepository.closeSession(openSession._id, orgId, {
        checkOutTime: now,
        exitGate: gateId || 'Main Gate',
        exitGuardId: guardId,
        notes: notes || openSession.notes,
      });

      staffAttendanceEvents.emit('staff_exit', {
        session: closedSession,
        technician,
        associatedUnits,
        orgId,
        guardId,
      });

      return {
        action: 'EXIT',
        session: closedSession,
        technician,
        associatedUnits,
        message: 'Staff check-out recorded successfully.',
      };
    }

    // Default 'AUTO' toggle: If open -> close (EXIT); If closed/none -> open (ENTRY)
    if (openSession) {
      // Toggle to EXIT
      const closedSession = await staffAttendanceRepository.closeSession(openSession._id, orgId, {
        checkOutTime: now,
        exitGate: gateId || 'Main Gate',
        exitGuardId: guardId,
        notes: notes || openSession.notes,
      });

      staffAttendanceEvents.emit('staff_exit', {
        session: closedSession,
        technician,
        associatedUnits,
        orgId,
        guardId,
      });

      return {
        action: 'EXIT',
        session: closedSession,
        technician,
        associatedUnits,
        message: 'Staff check-out recorded successfully.',
      };
    } else {
      // Toggle to ENTRY
      const newSession = await staffAttendanceRepository.createSession({
        orgId,
        technicianId: technician._id,
        staffCode: technician.staffCode || '',
        status: 'Open',
        checkInTime: now,
        checkInGate: gateId || 'Main Gate',
        checkInGuardId: guardId,
        idempotencyKey: idempotencyKey || null,
        notes: notes || '',
        isManualEntry: isManualEntry === true,
      });

      // Enqueue durable outbox event for crash-resilient notification delivery
      try {
        await staffNotificationService.enqueueStaffEntryNotification({
          session: newSession,
          technician,
          orgId,
          guardId,
          gateId,
        });
      } catch (err) {
        // Attendance persistence must remain successful even if notification enqueue fails
      }

      staffAttendanceEvents.emit('staff_entry', {
        session: newSession,
        technician,
        associatedUnits,
        orgId,
        guardId,
      });

      return {
        action: 'ENTRY',
        session: newSession,
        technician,
        associatedUnits,
        message: 'Staff check-in recorded successfully.',
      };
    }
  }

  /**
   * Retrieves paginated attendance history for the community.
   */
  async getAttendanceHistory(orgId, query = {}) {
    const filter = {};
    if (query.technicianId) filter.technicianId = query.technicianId;
    if (query.status) filter.status = query.status;
    if (query.startDate) filter.startDate = query.startDate;
    if (query.endDate) filter.endDate = query.endDate;

    const pagination = {
      page: query.page || 1,
      limit: query.limit || 20,
    };

    return await staffAttendanceRepository.findHistory(orgId, filter, pagination);
  }

  /**
   * Retrieves attendance records for the authenticated staff member.
   */
  async getMyAttendance(userId, orgId, query = {}, userDetails = {}) {
    const technician = await technicianService.getMyProfile(userId, orgId, userDetails);
    const filter = { technicianId: technician._id };
    if (query.status) filter.status = query.status;
    if (query.startDate) filter.startDate = query.startDate;
    if (query.endDate) filter.endDate = query.endDate;

    const pagination = {
      page: query.page || 1,
      limit: query.limit || 20,
    };

    return await staffAttendanceRepository.findHistory(orgId, filter, pagination);
  }

  /**
   * Returns all currently open sessions in the community for live gate monitoring.
   */
  async getActiveSessions(orgId) {
    return await staffAttendanceRepository.getActiveSessions(orgId);
  }

  /**
   * Retrieves single attendance session by ID.
   */
  async getSessionById(id, orgId) {
    const session = await staffAttendanceRepository.findById(id, orgId);
    if (!session) {
      throw new HttpError(404, 'Attendance session not found.');
    }
    return session;
  }

  /**
   * Retrieves summary statistics for community staff attendance.
   */
  async getAttendanceStats(orgId, query = {}) {
    return await staffAttendanceRepository.getAttendanceStats(orgId, query);
  }

  /**
   * Retrieves recent sessions for outbox event reconciliation.
   */
  async getRecentSessionsForReconciliation(filter = {}) {
    return await staffAttendanceRepository.findRecentSessions(filter);
  }

  /**
   * Manually checks out an open attendance session (administrative resolution for stuck sessions).
   */
  async manualCheckout(sessionId, orgId, adminUserId, options = {}) {
    if (!sessionId || !orgId) {
      throw new HttpError(400, 'Session ID and Organization ID are required.');
    }

    const session = await staffAttendanceRepository.findById(sessionId, orgId);
    if (!session) {
      throw new HttpError(404, 'Attendance session not found.');
    }

    if (session.status !== 'Open') {
      throw new HttpError(400, 'Attendance session is already closed.');
    }

    const checkOutTime = options.checkOutTime ? new Date(options.checkOutTime) : new Date();
    if (isNaN(checkOutTime.getTime())) {
      throw new HttpError(400, 'Invalid checkout date/time format.');
    }

    if (checkOutTime < new Date(session.checkInTime)) {
      throw new HttpError(400, 'Checkout time cannot be earlier than checkin time.');
    }

    const now = new Date();
    if (checkOutTime.getTime() > now.getTime() + 5 * 60 * 1000) {
      throw new HttpError(400, 'Checkout time cannot be in the future.');
    }

    const adminNote = options.notes
      ? `${options.notes} (Manual checkout by admin ${adminUserId})`
      : `Manual checkout by admin ${adminUserId}`;

    const updateData = {
      checkOutTime,
      exitGate: options.gateId || 'Admin Console',
      exitGuardId: adminUserId,
      notes: session.notes ? `${session.notes} | ${adminNote}` : adminNote,
    };

    const closedSession = await staffAttendanceRepository.closeSession(session._id, orgId, updateData);

    staffAttendanceEvents.emit('staff_exit', {
      session: closedSession,
      technician: closedSession.technicianId,
      orgId,
      guardId: adminUserId,
    });

    return {
      session: closedSession,
      message: 'Attendance session checked out manually by administrator.',
    };
  }
}

export default new StaffAttendanceService();

import mongoose from 'mongoose';
import staffAttendanceRepository from './staffAttendance.repository.js';
import staffAttendanceEvents from './staffAttendance.events.js';
import technicianService from '../technician/technician.service.js';
import staffUnitAssociationService from '../staffUnitAssociation/staffUnitAssociation.service.js';
import staffNotificationService from '../staffNotification/staffNotification.service.js';
import HttpError from '../../utils/httpError.utils.js';
import logger from '../../utils/logger.utils.js';
import { verifyStaffQrSignature, assertStaffQrWithinValidity } from '../../utils/staffQr.utils.js';
import { buildStaffPhotoUrl } from '../../utils/staffPhoto.utils.js';

// An open session older than this is treated as a forgotten checkout rather than a live visit.
const STALE_SESSION_MS = 18 * 60 * 60 * 1000;
// Re-scans inside this window are treated as an accidental double scan.
const DUPLICATE_SCAN_WINDOW_SECONDS = 15;

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
  validateStaffSignature(technician, orgId, providedSignature, options = {}) {
    return verifyStaffQrSignature(orgId, technician, providedSignature, options);
  }

  /**
   * Scanned QR payloads MUST carry a valid cryptographic signature. Unsigned payloads (raw IDs, codes,
   * legacy barcodes) are rejected unless an authorized manual override or the dev-only legacy flag applies.
   */
  assertScanAuthenticity(parsed, technician, orgId, isManualEntry = false, options = {}) {
    const allowLegacyUnsigned =
      process.env.NODE_ENV !== 'production' &&
      process.env.ALLOW_LEGACY_UNSIGNED_STAFF_SCANS === 'true';

    if (parsed.signature) {
      this.validateStaffSignature(technician, orgId, parsed.signature, options);
    } else if (!isManualEntry && !allowLegacyUnsigned) {
      throw new HttpError(
        401,
        'Unsigned staff QR payload is not authorized for gate attendance. Valid cryptographic signature is required.'
      );
    }
  }

  async resolveAssociatedUnits(technicianId, orgId) {
    const associations = await staffUnitAssociationService.getActiveAssociationsForStaff(technicianId, orgId);
    return (associations || []).map((a) => {
      const v = a.villaId;
      return {
        _id: v?._id || a.villaId,
        unitNumber: v?.unitNumber || '',
        blockOrBuilding: v?.blockOrBuilding || '',
        status: v?.status || '',
      };
    });
  }

  /**
   * Read-only gate preview: verifies the scanned pass exactly like a real scan and reports whether the
   * staff member is currently inside, WITHOUT recording anything. The guard then explicitly chooses
   * Check In or Check Out, which is submitted as an ENTRY / EXIT scan.
   */
  async lookupStaffForScan({ scannedPayload, orgId }) {
    if (!orgId) {
      throw new HttpError(400, 'Organization ID is required.');
    }
    const parsed = this.parseScanPayload(scannedPayload);
    const technician = await this.resolveTechnician(parsed, orgId, { allowInactive: true });
    // Authenticity first (no database work for forged passes); validity is checked once we know if they are inside.
    this.assertScanAuthenticity(parsed, technician, orgId, false, { allowOutsideValidity: true });

    const [associatedUnits, openSession] = await Promise.all([
      this.resolveAssociatedUnits(technician._id, orgId),
      staffAttendanceRepository.findActiveSession(orgId, technician._id),
    ]);
    if (parsed.signature && !openSession) assertStaffQrWithinValidity(technician);

    const isActive = technician.status === 'Active';
    return {
      technician: {
        _id: technician._id,
        name: technician.name,
        phone: technician.phone,
        department: technician.department,
        designation: technician.designation || '',
        type: technician.type,
        staffCode: technician.staffCode || '',
        status: technician.status,
        photoUrl: buildStaffPhotoUrl(technician),
      },
      associatedUnits,
      isInside: Boolean(openSession),
      openSession: openSession
        ? { _id: openSession._id, checkInTime: openSession.checkInTime, checkInGate: openSession.checkInGate }
        : null,
      // Deactivated staff can only be checked out, never in.
      canCheckIn: isActive && !openSession,
      canCheckOut: Boolean(openSession),
    };
  }

  /**
   * Resolves active Technician document strictly within the active organization.
   */
  async resolveTechnician(parsed, orgId, { allowInactive = false } = {}) {
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

    if (technician.status !== 'Active' && !allowInactive) {
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
        const replayedAction = existing.idempotencyKey === idempotencyKey ? 'ENTRY' : 'EXIT';
        return {
          action: replayedAction,
          session: existing,
          technician: existing.technicianId,
          isDuplicate: true,
          message: `Attendance ${replayedAction === 'ENTRY' ? 'check-in' : 'check-out'} already processed.`,
        };
      }
    }

    // 2. Parse payload and resolve technician
    const parsed = this.parseScanPayload(scannedPayload);
    const technician = await this.resolveTechnician(parsed, orgId, { allowInactive: true });

    // Deactivated staff may only be checked OUT (so a session never gets stuck open); never in.
    // Checked before signature verification so an inactive pass is rejected without further work.
    if (technician.status !== 'Active') {
      const requested = action ? String(action).toUpperCase().trim() : 'AUTO';
      if (requested === 'ENTRY') {
        throw new HttpError(400, 'Staff member account is not active.');
      }
      const stuckSession = await staffAttendanceRepository.findActiveSession(orgId, technician._id);
      if (!stuckSession) {
        throw new HttpError(400, 'Staff member account is not active.');
      }
    }

    // Cryptographic signature verification:
    // Scanned QR payloads MUST contain a valid cryptographic signature.
    // Unsigned payloads (raw IDs, codes, legacy 4-part barcodes) are strictly rejected
    // unless submitted via an explicitly authorized manual override.
    this.assertScanAuthenticity(parsed, technician, orgId, isManualEntry, { allowOutsideValidity: true });

    const requestedAction = typeof action === 'string' && action.trim() ? action.toUpperCase().trim() : 'AUTO';
    let openSession = await staffAttendanceRepository.findActiveSession(orgId, technician._id);
    // Only getting in needs a pass inside its validity window; an expired pass can still check its holder out.
    if (parsed.signature && (requestedAction === 'ENTRY' || !openSession)) assertStaffQrWithinValidity(technician);

    // 3. Resolve active unit associations (cross-feature call to staffUnitAssociationService)
    const associatedUnits = await this.resolveAssociatedUnits(technician._id, orgId);

    const now = new Date();
    const cleanAction = requestedAction;
    if (!['AUTO', 'ENTRY', 'EXIT'].includes(cleanAction)) {
      throw new HttpError(400, `Unsupported attendance action '${action}'.`);
    }

    // 5. A forgotten checkout must not invert every following scan (entry -> exit -> entry...).
    // Close the stale session without inventing a checkout time, then treat this scan as a fresh ENTRY.
    let staleClosed = null;
    if (openSession && cleanAction !== 'EXIT') {
      const ageMs = now.getTime() - new Date(openSession.checkInTime).getTime();
      if (ageMs > STALE_SESSION_MS) {
        const staleNote = `${openSession.notes ? `${openSession.notes} | ` : ''}Auto-closed: no checkout recorded before next scan.`;
        staleClosed = await staffAttendanceRepository.autoCloseSession(openSession._id, orgId, staleNote);
        openSession = null;
      }
    }

    const context = { technician, associatedUnits, orgId, guardId, gateId, idempotencyKey, notes, isManualEntry, now };
    const withStale = (result) => (staleClosed ? { ...result, staleSessionClosed: staleClosed } : result);

    // 6. State machine: ENTRY, EXIT, or AUTO toggle
    if (cleanAction === 'ENTRY' || (cleanAction === 'AUTO' && !openSession)) {
      return withStale(await this._checkIn(context, openSession));
    }

    // EXIT or AUTO with an open session
    if (!openSession) {
      throw new HttpError(400, 'Staff member does not have an active open session to check out.');
    }

    if (cleanAction === 'AUTO') {
      const diffSeconds = (now.getTime() - new Date(openSession.checkInTime).getTime()) / 1000;
      if (diffSeconds < DUPLICATE_SCAN_WINDOW_SECONDS) {
        // Guard double-tapped the same pass: do not immediately check the person back out.
        return {
          action: 'ENTRY',
          session: openSession,
          technician,
          associatedUnits,
          isDuplicate: true,
          message: 'Staff member was just checked in.',
        };
      }
    }
    return await this._checkOut(context, openSession);
  }

  /**
   * Opens a session (ENTRY). Handles the concurrent-scan race on the unique open-session index.
   */
  async _checkIn(ctx, existingOpenSession) {
    const { technician, associatedUnits, orgId, guardId, gateId, idempotencyKey, notes, isManualEntry, now } = ctx;

    if (existingOpenSession) {
      const diffSeconds = (now.getTime() - new Date(existingOpenSession.checkInTime).getTime()) / 1000;
      if (diffSeconds < DUPLICATE_SCAN_WINDOW_SECONDS) {
        return {
          action: 'ENTRY',
          session: existingOpenSession,
          technician,
          associatedUnits,
          isDuplicate: true,
          message: 'Staff member was just checked in.',
        };
      }
      throw new HttpError(409, 'Staff member already has an active open session. Please check out first.');
    }

    let newSession;
    try {
      newSession = await staffAttendanceRepository.createSession({
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
    } catch (err) {
      if (err?.statusCode === 409 || err?.status === 409) {
        // A concurrent scan won the race. Resolve idempotently instead of surfacing a failure.
        const winner = await staffAttendanceRepository.findActiveSession(orgId, technician._id);
        if (winner) {
          return {
            action: 'ENTRY',
            session: winner,
            technician,
            associatedUnits,
            isDuplicate: true,
            message: 'Staff member was just checked in.',
          };
        }
      }
      throw err;
    }

    await this._notify('enqueueStaffEntryNotification', {
      session: newSession,
      technician,
      orgId,
      guardId,
      gateId,
    });
    staffAttendanceEvents.emit('staff_entry', { session: newSession, technician, associatedUnits, orgId, guardId });

    return {
      action: 'ENTRY',
      session: newSession,
      technician,
      associatedUnits,
      message: 'Staff check-in recorded successfully.',
    };
  }

  /**
   * Closes a session (EXIT). The close is atomic, so a concurrent second EXIT gets a clean 409.
   */
  async _checkOut(ctx, openSession) {
    const { technician, associatedUnits, orgId, guardId, gateId, idempotencyKey, notes, now } = ctx;

    const closedSession = await staffAttendanceRepository.closeSession(openSession._id, orgId, {
      checkOutTime: now,
      exitGate: gateId || 'Main Gate',
      exitGuardId: guardId,
      exitIdempotencyKey: idempotencyKey || null,
      notes: notes || openSession.notes,
    });
    if (!closedSession) {
      throw new HttpError(409, 'Attendance session was already checked out by another scan.');
    }

    await this._notify('enqueueStaffExitNotification', {
      session: closedSession,
      technician,
      orgId,
      guardId,
      gateId,
    });
    staffAttendanceEvents.emit('staff_exit', { session: closedSession, technician, associatedUnits, orgId, guardId });

    return {
      action: 'EXIT',
      session: closedSession,
      technician,
      associatedUnits,
      message: 'Staff check-out recorded successfully.',
    };
  }

  /**
   * Attendance persistence must remain successful even if notification enqueue fails.
   */
  async _notify(method, params) {
    try {
      await staffNotificationService[method](params);
    } catch (err) {
      logger.warn(`[StaffAttendance] ${method} failed for session ${params.session?._id}: ${err.message}`);
    }
  }

  /**
   * Retrieves paginated attendance history for the community.
   */
  async getAttendanceHistory(orgId, query = {}) {
    const filter = {};
    // Query-string objects (?status[$ne]=x) must never reach Mongo as operators.
    const text = (value) => (typeof value === 'string' && value ? value : undefined);
    const set = (key, value) => { if (text(value)) filter[key] = value; };
    set('technicianId', query.technicianId);
    set('status', query.status);
    set('gateId', query.gateId);
    set('startDate', query.startDate);
    set('endDate', query.endDate);
    set('department', query.department);
    set('type', query.type);
    set('search', query.search);

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
   * Staff currently inside the community who are allocated to the caller's units.
   * Residents only ever see staff tied to units they are authorized for; admins see all units.
   * Returns a privacy-trimmed view (no phone/email).
   */
  async getActiveStaffForMyUnits(userId, orgId, isAdmin = false) {
    const { unitIds, units } = await staffUnitAssociationService.resolveUserAuthorizedUnitIds(userId, orgId, isAdmin);
    if (unitIds.length === 0) return [];

    const associations = await staffUnitAssociationService.getAssociations(
      userId,
      orgId,
      { status: 'Active' },
      isAdmin
    );
    const unitLabels = new Map(units.map((u) => [String(u._id), u.unitNumber]));
    const unitsByTech = new Map();
    for (const assoc of associations) {
      const techId = String(assoc.technicianId?._id || assoc.technicianId);
      const villaId = String(assoc.villaId?._id || assoc.villaId);
      if (!unitIds.includes(villaId)) continue;
      if (!unitsByTech.has(techId)) unitsByTech.set(techId, new Set());
      unitsByTech.get(techId).add(unitLabels.get(villaId) || assoc.villaId?.unitNumber || 'Unit');
    }
    if (unitsByTech.size === 0) return [];

    const sessions = await staffAttendanceRepository.getActiveSessionsForTechnicians(orgId, [...unitsByTech.keys()]);
    return sessions.map((s) => ({
      sessionId: s._id,
      technicianId: s.technicianId?._id,
      name: s.technicianId?.name,
      department: s.technicianId?.department,
      designation: s.technicianId?.designation || '',
      photoUrl: buildStaffPhotoUrl(s.technicianId),
      checkInTime: s.checkInTime,
      checkInGate: s.checkInGate,
      unitNumbers: [...(unitsByTech.get(String(s.technicianId?._id)) || [])],
    }));
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
    if (!closedSession) {
      throw new HttpError(409, 'Attendance session was already closed.');
    }

    await this._notify('enqueueStaffExitNotification', {
      session: closedSession,
      technician: closedSession.technicianId,
      orgId,
      guardId: adminUserId,
      gateId: options.gateId || 'Admin Console',
    });

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

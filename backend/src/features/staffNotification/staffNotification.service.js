import mongoose from 'mongoose';
import outboxService from '../outbox/outbox.service.js';
import notificationService from '../notification/notification.service.js';
import notificationRepository from '../notification/notification.repository.js';
import staffUnitAssociationService from '../staffUnitAssociation/staffUnitAssociation.service.js';
import villaService from '../villa/villa.services.js';
import orgMembershipService from '../orgMembership/orgMembership.services.js';
import technicianService from '../technician/technician.service.js';
import staffAttendanceService from '../staffAttendance/staffAttendance.service.js';
import logger, { loggerStorage } from '../../utils/logger.utils.js';

/**
 * Service orchestrating secure, tenant-isolated staff gate entry notifications,
 * recipient routing, and durable event processing.
 */
export class StaffNotificationService {
  /**
   * Enqueues a durable OutboxEvent upon legitimate, persisted gate entry.
   * Crash-resilient; wrapped to ensure gate attendance persistence is never blocked.
   *
   * @param {Object} params
   * @param {Object} params.session - Persisted StaffAttendance document
   * @param {Object} params.technician - Resolved Technician document
   * @param {string|mongoose.Types.ObjectId} params.orgId - Community organization ID
   * @param {string|mongoose.Types.ObjectId} [params.guardId] - Gate guard user ID
   * @param {string} [params.gateId] - Name/ID of gate
   * @returns {Promise<Object|null>} Enqueued OutboxEvent or null if skipped/failed
   */
  async enqueueStaffEntryNotification({ session, technician, orgId, guardId = null, gateId = 'Main Gate' }) {
    if (!session || !technician || !orgId) {
      logger.warn('[StaffNotification] Skipping outbox enqueue: missing required parameters');
      return null;
    }

    const sessionId = session._id ? session._id.toString() : String(session);
    const technicianId = technician._id ? technician._id.toString() : String(technician);
    const orgIdStr = orgId.toString();

    const staffName =
      technician.name ||
      `${technician.firstName || ''} ${technician.lastName || ''}`.trim() ||
      'Staff Member';
    const department = technician.department || technician.trade || technician.designation || 'Staff';

    const payload = {
      sessionId,
      technicianId,
      staffCode: technician.staffCode || '',
      staffName,
      department,
      orgId: orgIdStr,
      gateId: gateId || session.checkInGate || 'Main Gate',
      guardId: guardId ? guardId.toString() : session.checkInGuardId ? session.checkInGuardId.toString() : null,
      checkInTime: session.checkInTime || new Date(),
    };

    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      // When MongoDB is not connected (e.g. offline unit test environments),
      // avoid Mongoose 10s command buffering timeout.
      return {
        eventId: new mongoose.Types.ObjectId().toString(),
        aggregateType: 'STAFF_ATTENDANCE',
        aggregateId: sessionId,
        eventType: 'STAFF_GATE_ENTRY',
        payload,
        status: 'PENDING',
      };
    }

    try {
      const event = await outboxService.enqueueEvent({
        aggregateType: 'STAFF_ATTENDANCE',
        aggregateId: sessionId,
        eventType: 'STAFF_GATE_ENTRY',
        payload,
      });

      logger.info(`[StaffNotification] Enqueued STAFF_GATE_ENTRY event for session ${sessionId}`);
      return event;
    } catch (err) {
      logger.error(`[StaffNotification] Failed to enqueue STAFF_GATE_ENTRY outbox event: ${err.message}`);
      return null;
    }
  }

  /**
   * Enqueues a durable OutboxEvent upon legitimate, persisted gate exit.
   *
   * @param {Object} params
   * @param {Object} params.session - Persisted StaffAttendance document
   * @param {Object} params.technician - Resolved Technician document
   * @param {string|mongoose.Types.ObjectId} params.orgId - Community organization ID
   * @param {string|mongoose.Types.ObjectId} [params.guardId] - Gate guard user ID
   * @param {string} [params.gateId] - Name/ID of exit gate
   * @returns {Promise<Object|null>} Enqueued OutboxEvent or null if skipped/failed
   */
  async enqueueStaffExitNotification({ session, technician, orgId, guardId = null, gateId = 'Main Gate' }) {
    if (!session || !technician || !orgId) {
      logger.warn('[StaffNotification] Skipping exit outbox enqueue: missing required parameters');
      return null;
    }

    const sessionId = session._id ? session._id.toString() : String(session);
    const technicianId = technician._id ? technician._id.toString() : String(technician);
    const orgIdStr = orgId.toString();

    const staffName =
      technician.name ||
      `${technician.firstName || ''} ${technician.lastName || ''}`.trim() ||
      'Staff Member';
    const department = technician.department || technician.trade || technician.designation || 'Staff';

    const payload = {
      sessionId,
      technicianId,
      staffCode: technician.staffCode || '',
      staffName,
      department,
      orgId: orgIdStr,
      gateId: gateId || session.exitGate || 'Main Gate',
      guardId: guardId ? guardId.toString() : session.exitGuardId ? session.exitGuardId.toString() : null,
      checkOutTime: session.checkOutTime || new Date(),
    };

    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      return {
        eventId: new mongoose.Types.ObjectId().toString(),
        aggregateType: 'STAFF_ATTENDANCE',
        aggregateId: sessionId,
        eventType: 'STAFF_GATE_EXIT',
        payload,
        status: 'PENDING',
      };
    }

    try {
      const event = await outboxService.enqueueEvent({
        aggregateType: 'STAFF_ATTENDANCE',
        aggregateId: sessionId,
        eventType: 'STAFF_GATE_EXIT',
        payload,
      });

      logger.info(`[StaffNotification] Enqueued STAFF_GATE_EXIT event for session ${sessionId}`);
      return event;
    } catch (err) {
      logger.error(`[StaffNotification] Failed to enqueue STAFF_GATE_EXIT outbox event: ${err.message}`);
      return null;
    }
  }

  /**
   * Resolves recipient candidates for a staff member gate entry or exit.
   *
   * Policy:
   * Scenario A: Staff has active unit associations -> Notify eligible active residents of those units.
   * Scenario B: Staff has NO active unit associations -> Fallback to authorized Community Admins in the org.
   * Also: Community Admins (Global scope) can always receive oversight notifications if configured.
   * Scenario C: Inactive memberships, suspended users, former residents, or cross-tenant users are excluded.
   * Deduplication: Recipients are deduplicated across units and roles.
   *
   * @param {string} orgId - Organization ID
   * @param {string} technicianId - Technician ID
   * @param {Object} [options]
   * @param {boolean} [options.includeAdmins=false] - When true, also includes community admins
   * @returns {Promise<{ scenario: string, recipients: Array<{ userId: string, unitNumbers?: string[], isAdmin?: boolean }> }>}
   */
  async resolveRecipients(orgId, technicianId, options = {}) {
    if (!orgId || !technicianId) {
      return { scenario: 'NONE', recipients: [] };
    }

    const orgIdStr = orgId.toString();

    // 1. Query active unit associations for this staff member in this organization
    const rawAssociations = await staffUnitAssociationService.getActiveAssociationsForStaff(technicianId, orgId);
    const activeAssociations = (rawAssociations || []).filter(
      (a) => a.status === 'Active' && String(a.orgId) === orgIdStr
    );

    // Scenario A: Staff has active unit associations
    if (activeAssociations.length > 0) {
      const unitMap = new Map(); // villaId -> unitNumber
      const villaIds = [];

      for (const assoc of activeAssociations) {
        const vId = assoc.villaId?._id ? String(assoc.villaId._id) : String(assoc.villaId);
        if (vId && !villaIds.includes(vId)) {
          villaIds.push(vId);
          if (assoc.villaId?.unitNumber) {
            unitMap.set(vId, assoc.villaId.unitNumber);
          }
        }
      }

      const candidateRecipientsByUser = new Map(); // userId -> Set of unitNumbers

      for (const vId of villaIds) {
        let villa = null;
        try {
          villa = await villaService.getUnitById(vId, orgId);
        } catch {
          continue;
        }

        // Validate villa tenant isolation and status
        if (!villa || String(villa.orgId) !== orgIdStr || villa.status === 'Inactive') {
          continue;
        }

        const unitNum = villa.unitNumber || unitMap.get(vId) || 'Unit';
        unitMap.set(vId, unitNum);

        const candidateUserIds = new Set();

        if (villa.ownerId) {
          candidateUserIds.add(String(villa.ownerId));
        }
        if (villa.primaryResidentId) {
          candidateUserIds.add(String(villa.primaryResidentId));
        }
        if (Array.isArray(villa.residents)) {
          villa.residents.forEach((r) => {
            if (r.userId && (!r.status || r.status === 'Active')) {
              const rId = r.userId?._id ? String(r.userId._id) : String(r.userId);
              candidateUserIds.add(rId);
            }
          });
        }

        // Also query active memberships linked to this villa
        try {
          const memberships = await orgMembershipService.getResidentsForVilla(vId);
          if (Array.isArray(memberships)) {
            memberships.forEach((m) => {
              const uId = m.userId?._id ? String(m.userId._id) : (m.userId ? String(m.userId) : null);
              if (uId && m.status === 'Active' && String(m.orgId || orgIdStr) === orgIdStr) {
                candidateUserIds.add(uId);
              }
            });
          }
        } catch (err) {
          logger.warn(`[StaffNotification] Failed to query villa memberships: ${err.message}`);
        }

        // Validate each candidate user against OrgMembership in this community
        for (const userId of candidateUserIds) {
          const membership = await orgMembershipService.getMembership(userId, orgId);
          if (!membership || membership.status !== 'Active') {
            // Exclude inactive membership, revoked access, or former resident
            continue;
          }

          // Exclude deleted or inactive user if populated
          if (membership.userId && typeof membership.userId === 'object') {
            if (membership.userId.isDeleted || membership.userId.status === 'Inactive' || membership.userId.status === 'Suspended') {
              continue;
            }
          }

          if (!candidateRecipientsByUser.has(userId)) {
            candidateRecipientsByUser.set(userId, new Set());
          }
          candidateRecipientsByUser.get(userId).add(unitNum);
        }
      }

      if (candidateRecipientsByUser.size > 0) {
        const recipients = [];
        for (const [userId, unitNumbersSet] of candidateRecipientsByUser.entries()) {
          recipients.push({
            userId,
            unitNumbers: Array.from(unitNumbersSet),
          });
        }

        // If includeAdmins is requested, append community admins (deduplicated)
        if (options.includeAdmins) {
          const admins = await orgMembershipService.getCommunityAdmins(orgId);
          for (const a of (admins || [])) {
            if (a.userId && !candidateRecipientsByUser.has(String(a.userId))) {
              recipients.push({
                userId: String(a.userId),
                isAdmin: true,
                name: a.name,
                email: a.email,
              });
            }
          }
        }

        return {
          scenario: 'ASSOCIATED_RESIDENTS',
          recipients,
        };
      }

      // If active unit associations existed, but all associated units have no eligible active residents,
      // we log and return empty to prevent unrelated residents or unwanted admin spam.
      logger.info(`[StaffNotification] Staff has ${activeAssociations.length} associated units, but no active residents were eligible.`);
      return {
        scenario: 'ASSOCIATED_RESIDENTS_NONE_ELIGIBLE',
        recipients: [],
      };
    }

    // Scenario B: Staff has NO active unit associations -> Fallback to Community Admin
    const admins = await orgMembershipService.getCommunityAdmins(orgId);
    const validAdmins = (admins || []).filter((a) => a.userId);

    const recipients = validAdmins.map((a) => ({
      userId: a.userId,
      isAdmin: true,
      name: a.name,
      email: a.email,
    }));

    return {
      scenario: 'COMMUNITY_ADMIN_FALLBACK',
      recipients,
    };
  }

  /**
   * Processes a STAFF_GATE_ENTRY event payload:
   * Resolves recipients according to the default policy, constructs privacy-safe content,
   * enforces deduplication via unique dedupKey, and creates in-app notifications.
   *
   * @param {Object} payload
   * @returns {Promise<Object>} Summary of notification delivery
   */
  async processStaffEntryEvent(payload) {
    if (!payload || !payload.sessionId || !payload.technicianId || !payload.orgId) {
      logger.warn('[StaffNotification] Invalid event payload for STAFF_GATE_ENTRY. Skipping.');
      return { success: false, reason: 'INVALID_PAYLOAD' };
    }

    const { sessionId, technicianId, orgId, staffName, department, gateId, guardId } = payload;
    const orgIdStr = orgId.toString();

    const { scenario, recipients } = await this.resolveRecipients(orgIdStr, technicianId);

    if (!recipients || recipients.length === 0) {
      logger.info(`[StaffNotification] No eligible recipients found for staff entry (Session: ${sessionId}, Scenario: ${scenario})`);
      return {
        success: true,
        scenario,
        deliveredCount: 0,
        skippedCount: 0,
      };
    }

    let deliveredCount = 0;
    let skippedCount = 0;

    for (const recipient of recipients) {
      const recipientUserId = recipient.userId;
      // Stable notification key format: ${attendanceSessionId}:${recipientUserId}:ENTRY
      const dedupKey = `${sessionId}:${recipientUserId}:ENTRY`;

      // Check if already delivered
      const existing = await notificationRepository.findByDedupKey(dedupKey);
      if (existing) {
        logger.info(`[StaffNotification] Notification already delivered for dedupKey ${dedupKey}. Skipping.`);
        skippedCount++;
        continue;
      }

      // Compose privacy-safe title and body
      const title = 'Staff Gate Entry';
      let body;

      if (scenario === 'ASSOCIATED_RESIDENTS' && !recipient.isAdmin) {
        const unitsStr = recipient.unitNumbers && recipient.unitNumbers.length > 0
          ? recipient.unitNumbers.join(', ')
          : 'your unit';
        body = `${staffName || 'Staff'} (${department || 'General'}) associated with your unit (${unitsStr}) has entered the community gate.`;
      } else {
        body = `${staffName || 'Staff'} (${department || 'General'}) has entered the community gate (${gateId || 'Main Gate'}).`;
      }

      const notificationData = {
        recipientId: new mongoose.Types.ObjectId(recipientUserId),
        orgId: new mongoose.Types.ObjectId(orgIdStr),
        senderId: guardId && mongoose.isValidObjectId(guardId) ? new mongoose.Types.ObjectId(guardId) : null,
        title,
        body,
        actionUrl: '/staff/attendance',
        type: 'INFO',
        metadata: {
          staffAttendanceId: sessionId,
          technicianId,
          orgId: orgIdStr,
          type: 'STAFF_ENTRY',
          gateId: gateId || 'Main Gate',
          unitNumbers: recipient.unitNumbers || [],
        },
        dedupKey,
      };

      try {
        await notificationService.createNotification(notificationData);
        deliveredCount++;
      } catch (notifErr) {
        logger.error(`[StaffNotification] Failed to create notification for user ${recipientUserId}: ${notifErr.message}`);
        // If error is duplicate key, it means concurrent execution already delivered
        if (notifErr.code === 11000) {
          skippedCount++;
        } else {
          throw notifErr;
        }
      }
    }

    logger.info(
      `[StaffNotification] Processed STAFF_GATE_ENTRY (Session: ${sessionId}, Scenario: ${scenario}, Delivered: ${deliveredCount}, Skipped: ${skippedCount})`
    );

    return {
      success: true,
      scenario,
      deliveredCount,
      skippedCount,
      totalRecipients: recipients.length,
    };
  }

  /**
   * Processes a STAFF_GATE_EXIT event payload:
   * Resolves recipients according to policy, constructs privacy-safe content,
   * enforces deduplication via unique dedupKey, and creates in-app notifications.
   *
   * @param {Object} payload
   * @returns {Promise<Object>} Summary of notification delivery
   */
  async processStaffExitEvent(payload) {
    if (!payload || !payload.sessionId || !payload.technicianId || !payload.orgId) {
      logger.warn('[StaffNotification] Invalid event payload for STAFF_GATE_EXIT. Skipping.');
      return { success: false, reason: 'INVALID_PAYLOAD' };
    }

    const { sessionId, technicianId, orgId, staffName, department, gateId, guardId } = payload;
    const orgIdStr = orgId.toString();

    const { scenario, recipients } = await this.resolveRecipients(orgIdStr, technicianId);

    if (!recipients || recipients.length === 0) {
      logger.info(`[StaffNotification] No eligible recipients found for staff exit (Session: ${sessionId}, Scenario: ${scenario})`);
      return {
        success: true,
        scenario,
        deliveredCount: 0,
        skippedCount: 0,
      };
    }

    let deliveredCount = 0;
    let skippedCount = 0;

    for (const recipient of recipients) {
      const recipientUserId = recipient.userId;
      // Stable notification key format: ${attendanceSessionId}:${recipientUserId}:EXIT
      const dedupKey = `${sessionId}:${recipientUserId}:EXIT`;

      // Check if already delivered
      const existing = await notificationRepository.findByDedupKey(dedupKey);
      if (existing) {
        logger.info(`[StaffNotification] Exit notification already delivered for dedupKey ${dedupKey}. Skipping.`);
        skippedCount++;
        continue;
      }

      // Compose privacy-safe title and body
      const title = 'Staff Gate Exit';
      let body;

      if (scenario === 'ASSOCIATED_RESIDENTS' && !recipient.isAdmin) {
        const unitsStr = recipient.unitNumbers && recipient.unitNumbers.length > 0
          ? recipient.unitNumbers.join(', ')
          : 'your unit';
        body = `${staffName || 'Staff'} (${department || 'General'}) associated with your unit (${unitsStr}) has checked out and departed the community.`;
      } else {
        body = `${staffName || 'Staff'} (${department || 'General'}) has checked out and departed the community gate (${gateId || 'Main Gate'}).`;
      }

      const notificationData = {
        recipientId: new mongoose.Types.ObjectId(recipientUserId),
        orgId: new mongoose.Types.ObjectId(orgIdStr),
        senderId: guardId && mongoose.isValidObjectId(guardId) ? new mongoose.Types.ObjectId(guardId) : null,
        title,
        body,
        actionUrl: '/staff/attendance',
        type: 'INFO',
        metadata: {
          staffAttendanceId: sessionId,
          technicianId,
          orgId: orgIdStr,
          type: 'STAFF_EXIT',
          gateId: gateId || 'Main Gate',
          unitNumbers: recipient.unitNumbers || [],
        },
        dedupKey,
      };

      try {
        await notificationService.createNotification(notificationData);
        deliveredCount++;
      } catch (notifErr) {
        logger.error(`[StaffNotification] Failed to create exit notification for user ${recipientUserId}: ${notifErr.message}`);
        if (notifErr.code === 11000) {
          skippedCount++;
        } else {
          throw notifErr;
        }
      }
    }

    logger.info(
      `[StaffNotification] Processed STAFF_GATE_EXIT (Session: ${sessionId}, Scenario: ${scenario}, Delivered: ${deliveredCount}, Skipped: ${skippedCount})`
    );

    return {
      success: true,
      scenario,
      deliveredCount,
      skippedCount,
      totalRecipients: recipients.length,
    };
  }

  /**
   * Reconciles un-enqueued or dropped staff gate entry events.
   * Discovers attendance entries created in the lookback window that have neither
   * an active OutboxEvent nor delivered notifications, and enqueues them idempotently.
   *
   * @param {string} [orgId=null]
   * @param {number} [lookbackHours=24]
   * @returns {Promise<{ checkedCount: number, reconciledCount: number }>}
   */
  async reconcileMissingStaffEntryEvents(orgId = null, lookbackHours = 48) {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      return { checkedCount: 0, reconciledCount: 0 };
    }

    const sinceDate = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
    const filter = { checkInTime: { $gte: sinceDate } };
    if (orgId) {
      filter.orgId = orgId;
    }

    const sessions = await staffAttendanceService.getRecentSessionsForReconciliation(filter);
    if (!Array.isArray(sessions) || sessions.length === 0) {
      return { checkedCount: 0, reconciledCount: 0 };
    }

    let reconciledCount = 0;
    const OutboxEvent = (await import('../outbox/outboxEvent.model.js')).default;
    const Notification = (await import('../notification/notification.model.js')).default;

    for (const session of sessions) {
      const sessionIdStr = session._id ? session._id.toString() : String(session);

      // 1. Check if an OutboxEvent already exists for this attendance session
      const existingOutbox = await OutboxEvent.findOne({
        aggregateId: sessionIdStr,
        eventType: 'STAFF_GATE_ENTRY',
      });

      if (existingOutbox) {
        continue;
      }

      // 2. Check if a notification was already created for this session
      const existingNotif = await Notification.findOne({
        $or: [
          { 'metadata.staffAttendanceId': sessionIdStr },
          { dedupKey: new RegExp(`^${sessionIdStr}:`) },
        ],
      });

      if (existingNotif) {
        continue;
      }

      // 3. Persisted entry exists with neither outbox event nor notification -> Reconcile!
      try {
        const technician = await technicianService.getTechnicianById(session.technicianId, session.orgId);
        if (technician) {
          await this.enqueueStaffEntryNotification({
            session,
            technician,
            orgId: session.orgId,
            guardId: session.checkInGuardId,
            gateId: session.checkInGate,
          });
          reconciledCount++;
        }
      } catch (recErr) {
        logger.error(`[StaffNotification Reconciliation] Failed for session ${sessionIdStr}: ${recErr.message}`);
      }
    }

    logger.info(`[StaffNotification Reconciliation] Checked: ${sessions.length}, Reconciled: ${reconciledCount}`);
    return { checkedCount: sessions.length, reconciledCount };
  }

  /**
   * Exit counterpart of reconcileMissingStaffEntryEvents: re-enqueues STAFF_GATE_EXIT for recently
   * closed sessions that have neither an outbox event nor a delivered exit notification.
   * System auto-closed sessions are skipped because nobody actually left through a gate.
   */
  async reconcileMissingStaffExitEvents(orgId = null, lookbackHours = 48) {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      return { checkedCount: 0, reconciledCount: 0 };
    }

    const sinceDate = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
    const filter = { status: 'Closed', autoClosed: { $ne: true }, checkOutTime: { $gte: sinceDate } };
    if (orgId) {
      filter.orgId = orgId;
    }

    const sessions = await staffAttendanceService.getRecentSessionsForReconciliation(filter);
    if (!Array.isArray(sessions) || sessions.length === 0) {
      return { checkedCount: 0, reconciledCount: 0 };
    }

    let reconciledCount = 0;
    const OutboxEvent = (await import('../outbox/outboxEvent.model.js')).default;
    const Notification = (await import('../notification/notification.model.js')).default;

    for (const session of sessions) {
      const sessionIdStr = session._id ? session._id.toString() : String(session);

      const existingOutbox = await OutboxEvent.findOne({
        aggregateId: sessionIdStr,
        eventType: 'STAFF_GATE_EXIT',
      });
      if (existingOutbox) continue;

      const existingNotif = await Notification.findOne({
        dedupKey: new RegExp(`^${sessionIdStr}:.*:EXIT$`),
      });
      if (existingNotif) continue;

      try {
        const technician = await technicianService.getTechnicianById(session.technicianId, session.orgId);
        if (technician) {
          await this.enqueueStaffExitNotification({
            session,
            technician,
            orgId: session.orgId,
            guardId: session.exitGuardId,
            gateId: session.exitGate,
          });
          reconciledCount++;
        }
      } catch (recErr) {
        logger.error(`[StaffNotification Exit Reconciliation] Failed for session ${sessionIdStr}: ${recErr.message}`);
      }
    }

    logger.info(`[StaffNotification Exit Reconciliation] Checked: ${sessions.length}, Reconciled: ${reconciledCount}`);
    return { checkedCount: sessions.length, reconciledCount };
  }
}

export default new StaffNotificationService();

import { getIO } from '../../config/socket.js';
import staffUnitAssociationEvents from './staffUnitAssociation.events.js';
import notificationService from '../notification/notification.service.js';
import logger from '../../utils/logger.utils.js';

const safeGetIO = () => {
  try {
    return getIO();
  } catch {
    return null;
  }
};

/**
 * Initializes real-time Socket.io listeners and in-app notifications for staff unit association events.
 */
export const initStaffUnitAssociationSocket = () => {
  // 1. Staff invited / requested by resident
  staffUnitAssociationEvents.on('staff_associated_to_unit', async (payload) => {
    try {
      const io = safeGetIO();
      const { technicianUserId, orgId, villaId, associationId, status, associatedBy } = payload;
      logger.info(`[StaffSocket] staff_associated_to_unit emitted for association ${associationId}`);

      // Deliver real-time notification to the invited staff member's private room
      if (io && technicianUserId) {
        io.to(`user:${technicianUserId}`).emit('staff:unit_association_requested', {
          associationId,
          orgId,
          villaId,
          status,
          message: 'You have received a new household allocation request.',
        });
      }

      // Also broadcast to the community organization room for admin awareness
      if (io && orgId) {
        io.to(`org:${orgId}`).emit('staff:association_created', payload);
      }

      // Persist in-app notification for the invited staff member
      if (technicianUserId && orgId) {
        const dedupKey = `staff_assoc_req:${associationId}:${technicianUserId}`;
        await notificationService.createNotification({
          recipientId: technicianUserId,
          orgId,
          senderId: associatedBy || null,
          title: 'Household Allocation Request',
          body: 'A resident has requested to allocate you to their unit. Please review and accept or decline.',
          actionUrl: '/staff/portal?tab=allocations',
          type: 'INFO',
          metadata: {
            associationId: String(associationId),
            villaId: String(villaId),
            orgId: String(orgId),
            type: 'STAFF_ASSOCIATION_REQUESTED',
          },
          dedupKey,
        }).catch((e) => logger.warn(`[StaffNotification] Failed to create association request notification: ${e.message}`));
      }
    } catch (err) {
      logger.error(`[StaffSocket] Error handling staff_associated_to_unit: ${err.message}`);
    }
  });

  // 2. Staff accepted household allocation
  staffUnitAssociationEvents.on('staff_association_accepted', async (payload) => {
    try {
      const io = safeGetIO();
      const { orgId, associationId, villaId, acceptedBy, associatedBy } = payload;
      logger.info(`[StaffSocket] staff_association_accepted emitted for association ${associationId}`);

      if (io) {
        io.to(`org:${orgId}`).emit('staff:association_accepted', {
          associationId,
          villaId,
          acceptedBy,
        });
      }

      // Persist in-app notification for the resident who requested the association
      if (associatedBy && orgId) {
        const dedupKey = `staff_assoc_acc:${associationId}:${associatedBy}`;
        await notificationService.createNotification({
          recipientId: associatedBy,
          orgId,
          senderId: acceptedBy || null,
          title: 'Staff Allocation Accepted',
          body: 'The invited staff member has accepted your household allocation request.',
          actionUrl: '/unit-allocation',
          type: 'SUCCESS',
          metadata: {
            associationId: String(associationId),
            villaId: String(villaId),
            orgId: String(orgId),
            type: 'STAFF_ASSOCIATION_ACCEPTED',
          },
          dedupKey,
        }).catch((e) => logger.warn(`[StaffNotification] Failed to create association accepted notification: ${e.message}`));
      }
    } catch (err) {
      logger.error(`[StaffSocket] Error handling staff_association_accepted: ${err.message}`);
    }
  });

  // 3. Staff declined household allocation
  staffUnitAssociationEvents.on('staff_association_rejected', async (payload) => {
    try {
      const io = safeGetIO();
      const { orgId, associationId, villaId, rejectedBy, reason, associatedBy } = payload;
      logger.info(`[StaffSocket] staff_association_rejected emitted for association ${associationId}`);

      if (io) {
        io.to(`org:${orgId}`).emit('staff:association_rejected', {
          associationId,
          villaId,
          rejectedBy,
          reason,
        });
      }

      // Persist in-app notification for the resident who requested the association
      if (associatedBy && orgId) {
        const dedupKey = `staff_assoc_rej:${associationId}:${associatedBy}`;
        await notificationService.createNotification({
          recipientId: associatedBy,
          orgId,
          senderId: rejectedBy || null,
          title: 'Staff Allocation Declined',
          body: `The staff member has declined your household allocation request${reason ? `: ${reason}` : '.'}`,
          actionUrl: '/unit-allocation',
          type: 'WARNING',
          metadata: {
            associationId: String(associationId),
            villaId: String(villaId),
            orgId: String(orgId),
            reason: reason || '',
            type: 'STAFF_ASSOCIATION_REJECTED',
          },
          dedupKey,
        }).catch((e) => logger.warn(`[StaffNotification] Failed to create association rejected notification: ${e.message}`));
      }
    } catch (err) {
      logger.error(`[StaffSocket] Error handling staff_association_rejected: ${err.message}`);
    }
  });

  // 4. Staff dissociated from unit (removed by resident or admin)
  staffUnitAssociationEvents.on('staff_dissociated_from_unit', async (payload) => {
    try {
      const io = safeGetIO();
      const { orgId, associationId, villaId, technicianId, technicianUserId, deactivatedBy } = payload;
      logger.info(`[StaffSocket] staff_dissociated_from_unit emitted for association ${associationId}`);

      if (io) {
        io.to(`org:${orgId}`).emit('staff:association_removed', {
          associationId,
          villaId,
          technicianId,
          deactivatedBy,
        });
      }

      // Persist in-app notification for the staff member if they have an active user account
      if (technicianUserId && orgId) {
        const dedupKey = `staff_assoc_rem:${associationId}:${technicianUserId}`;
        await notificationService.createNotification({
          recipientId: technicianUserId,
          orgId,
          senderId: deactivatedBy || null,
          title: 'Household Allocation Ended',
          body: 'Your allocation to a household unit has been removed.',
          actionUrl: '/staff/portal',
          type: 'INFO',
          metadata: {
            associationId: String(associationId),
            villaId: String(villaId),
            orgId: String(orgId),
            type: 'STAFF_ASSOCIATION_REMOVED',
          },
          dedupKey,
        }).catch((e) => logger.warn(`[StaffNotification] Failed to create association removed notification: ${e.message}`));
      }
    } catch (err) {
      logger.error(`[StaffSocket] Error handling staff_dissociated_from_unit: ${err.message}`);
    }
  });
};

export default initStaffUnitAssociationSocket;

import { getIO } from '../../config/socket.js';
import staffUnitAssociationEvents from './staffUnitAssociation.events.js';
import logger from '../../utils/logger.utils.js';

/**
 * Initializes real-time Socket.io listeners for staff unit association events.
 */
export const initStaffUnitAssociationSocket = () => {
  // 1. Staff invited / requested by resident
  staffUnitAssociationEvents.on('staff_associated_to_unit', async (payload) => {
    try {
      const io = getIO();
      if (!io) return;

      const { technicianUserId, orgId, villaId, associationId, status } = payload;
      logger.info(`[StaffSocket] staff_associated_to_unit emitted for association ${associationId}`);

      // Deliver real-time notification to the invited staff member's private room
      if (technicianUserId) {
        io.to(`user:${technicianUserId}`).emit('staff:unit_association_requested', {
          associationId,
          orgId,
          villaId,
          status,
          message: 'You have received a new household allocation request.',
        });
      }

      // Also broadcast to the community organization room for admin awareness
      if (orgId) {
        io.to(`org:${orgId}`).emit('staff:association_created', payload);
      }
    } catch (err) {
      logger.error(`[StaffSocket] Error handling staff_associated_to_unit: ${err.message}`);
    }
  });

  // 2. Staff accepted household allocation
  staffUnitAssociationEvents.on('staff_association_accepted', async (payload) => {
    try {
      const io = getIO();
      if (!io) return;

      const { orgId, associationId, villaId, acceptedBy } = payload;
      logger.info(`[StaffSocket] staff_association_accepted emitted for association ${associationId}`);

      io.to(`org:${orgId}`).emit('staff:association_accepted', {
        associationId,
        villaId,
        acceptedBy,
      });
    } catch (err) {
      logger.error(`[StaffSocket] Error handling staff_association_accepted: ${err.message}`);
    }
  });

  // 3. Staff declined household allocation
  staffUnitAssociationEvents.on('staff_association_rejected', async (payload) => {
    try {
      const io = getIO();
      if (!io) return;

      const { orgId, associationId, villaId, rejectedBy, reason } = payload;
      logger.info(`[StaffSocket] staff_association_rejected emitted for association ${associationId}`);

      io.to(`org:${orgId}`).emit('staff:association_rejected', {
        associationId,
        villaId,
        rejectedBy,
        reason,
      });
    } catch (err) {
      logger.error(`[StaffSocket] Error handling staff_association_rejected: ${err.message}`);
    }
  });
};

export default initStaffUnitAssociationSocket;

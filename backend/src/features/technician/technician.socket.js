import { getIO } from '../../config/socket.js';
import technicianEvents from './technician.events.js';
import logger from '../../utils/logger.utils.js';

/**
 * Initializes real-time Socket.io listeners for technician / staff profile events.
 */
export const initTechnicianSocket = () => {
  try {
    technicianEvents.on('technician_created', ({ orgId, technician }) => {
      const io = getIO();
      if (!io) return;

      logger.info(`[TechnicianSocket] technician_created emitted for staff ${technician._id} in org ${orgId}`);

      if (orgId) {
        io.to(`org:${orgId}`).emit('staff:created', { technician, orgId });
      }

      if (technician.userId) {
        io.to(`user:${technician.userId}`).emit('staff:profile_updated', { technician, orgId });
      }
    });

    technicianEvents.on('technician_updated', ({ orgId, technician }) => {
      const io = getIO();
      if (!io) return;

      logger.info(`[TechnicianSocket] technician_updated emitted for staff ${technician._id} in org ${orgId}`);

      if (orgId) {
        io.to(`org:${orgId}`).emit('staff:profile_updated', { technician, orgId });
      }

      if (technician.userId) {
        io.to(`user:${technician.userId}`).emit('staff:profile_updated', { technician, orgId });
      }
    });

    technicianEvents.on('technician_deleted', ({ orgId, technicianId, technician }) => {
      const io = getIO();
      if (!io) return;

      logger.info(`[TechnicianSocket] technician_deleted emitted for staff ${technicianId} in org ${orgId}`);

      if (orgId) {
        io.to(`org:${orgId}`).emit('staff:deleted', { technicianId, technician, orgId });
      }

      if (technician?.userId) {
        io.to(`user:${technician.userId}`).emit('staff:deleted', { technicianId, orgId });
      }
    });
  } catch (err) {
    logger.error(`[TechnicianSocket] Failed to init technician socket listeners: ${err.message}`);
  }
};

export default initTechnicianSocket;

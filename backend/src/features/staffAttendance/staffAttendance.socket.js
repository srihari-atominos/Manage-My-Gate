import { getIO } from '../../config/socket.js';
import staffAttendanceEvents from './staffAttendance.events.js';
import logger from '../../utils/logger.utils.js';

/**
 * Initializes real-time Socket.io listeners for staff attendance check-in and check-out events.
 */
export const initStaffAttendanceSocket = () => {
  try {
    staffAttendanceEvents.on('staff_entry', async (payload) => {
      const io = getIO();
      if (!io) return;

      const { session, technician, associatedUnits, orgId, guardId } = payload;
      logger.info(`[StaffAttendanceSocket] staff_entry emitted for session ${session?._id} in org ${orgId}`);

      const eventPayload = {
        action: 'ENTRY',
        session,
        technician,
        associatedUnits,
        orgId,
        guardId,
        timestamp: session?.checkInTime || new Date(),
      };

      // Broadcast to organization room (for admin dashboard, live attendance logs, summary cards)
      if (orgId) {
        io.to(`org:${orgId}`).emit('staff:attendance_updated', eventPayload);
        io.to(`org:${orgId}`).emit('staff:entry', eventPayload);
      }

      // If staff has a linked user account, notify their private room for immediate dashboard refresh
      if (technician?.userId) {
        io.to(`user:${technician.userId}`).emit('staff:attendance_updated', eventPayload);
      }
    });

    staffAttendanceEvents.on('staff_exit', async (payload) => {
      const io = getIO();
      if (!io) return;

      const { session, technician, associatedUnits, orgId, guardId } = payload;
      logger.info(`[StaffAttendanceSocket] staff_exit emitted for session ${session?._id} in org ${orgId}`);

      const eventPayload = {
        action: 'EXIT',
        session,
        technician,
        associatedUnits,
        orgId,
        guardId,
        timestamp: session?.checkOutTime || new Date(),
      };

      // Broadcast to organization room
      if (orgId) {
        io.to(`org:${orgId}`).emit('staff:attendance_updated', eventPayload);
        io.to(`org:${orgId}`).emit('staff:exit', eventPayload);
      }

      // If staff has a linked user account, notify their private room
      if (technician?.userId) {
        io.to(`user:${technician.userId}`).emit('staff:attendance_updated', eventPayload);
      }
    });
  } catch (err) {
    logger.error(`[StaffAttendanceSocket] Failed to init staff attendance socket listeners: ${err.message}`);
  }
};

export default initStaffAttendanceSocket;

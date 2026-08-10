import { getIO } from '../../config/socket.js';
import logger from '../../utils/logger.utils.js';

/**
 * Dispatches walk-in pending event to the target resident's socket room.
 * @param {Object} log - The visitor log document.
 */
export const dispatchWalkInPending = (log) => {
  try {
    const residentId = log.residentId;
    if (!residentId) {
      logger.info('Walk-in request created without target resident; skipping socket dispatch.');
      return;
    }

    const io = getIO();
    const roomName = `user:${residentId}`;

    logger.info(`Dispatching GATE_APPROVAL_REQUEST to room ${roomName} for log ${log._id}`);
    
    // Safely emit to room
    io.to(roomName).emit('GATE_APPROVAL_REQUEST', log);
  } catch (error) {
    logger.error('Failed to emit GATE_APPROVAL_REQUEST via Socket.io:', error);
    // Safe try/catch prevents this error from crashing the main Node execution thread
  }
};

/**
 * Dispatches walk-in resolution (approved/rejected) to the organization guards socket room.
 * @param {Object} log - The visitor log document.
 */
export const dispatchWalkInResolved = (log) => {
  try {
    const io = getIO();

    if (log.orgId) {
      const guardRoom = `org:${log.orgId}:guards`;
      logger.info(`Dispatching GATE_APPROVAL_RESOLVED to guard room ${guardRoom} for log ${log._id} with status ${log.logStatus}`);
      io.to(guardRoom).emit('GATE_APPROVAL_RESOLVED', log);
    }

    if (log.residentId) {
      const residentRoom = `user:${log.residentId}`;
      logger.info(`Dispatching GATE_APPROVAL_RESOLVED to resident room ${residentRoom} for log ${log._id} with status ${log.logStatus}`);
      io.to(residentRoom).emit('GATE_APPROVAL_RESOLVED', log);
    }
  } catch (error) {
    logger.error('Failed to emit GATE_APPROVAL_RESOLVED via Socket.io:', error);
    // Safe try/catch prevents this error from crashing the main Node execution thread
  }
};

export default {
  dispatchWalkInPending,
  dispatchWalkInResolved,
};

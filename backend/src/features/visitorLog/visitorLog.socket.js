import { getIO } from '../../config/socket.js';
import logger from '../../utils/logger.utils.js';

/**
 * Dispatches walk-in pending event to the target resident's socket room.
 * @param {Object} log - The visitor log document.
 */
export const dispatchWalkInPending = (log) => {
  try {
    const io = getIO();

    if (log.residentId) {
      const roomName = `user:${log.residentId}`;
      logger.info(`Dispatching GATE_APPROVAL_REQUEST to room ${roomName} for log ${log._id}`);
      io.to(roomName).emit('GATE_APPROVAL_REQUEST', log);
    }

    if (log.orgId) {
      const guardRoom = `org:${log.orgId}:guards`;
      logger.info(`Dispatching GATE_APPROVAL_REQUEST to guard room ${guardRoom} for log ${log._id}`);
      io.to(guardRoom).emit('GATE_APPROVAL_REQUEST', log);
    }
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

/**
 * Tells the community that a visitor log changed (checked in / out) so open Visitor Management screens
 * refetch. The payload carries ids and status only, no visitor details; each client reloads through the
 * REST API, which applies its own role and tenant scoping.
 * @param {Object} log - The visitor log document.
 * @param {string} action - 'checked_in' | 'checked_out'
 */
export const dispatchVisitorLogChanged = (log, action) => {
  try {
    if (!log?.orgId) return;
    const io = getIO();
    io.to(`org:${log.orgId}`).emit('visitor:log_changed', {
      logId: log._id ? String(log._id) : '',
      orgId: String(log.orgId),
      action,
      logStatus: log.logStatus,
      entryType: log.entryType,
    });
  } catch (error) {
    logger.error('Failed to emit visitor:log_changed via Socket.io:', error);
  }
};

export default {
  dispatchWalkInPending,
  dispatchWalkInResolved,
  dispatchVisitorLogChanged,
};

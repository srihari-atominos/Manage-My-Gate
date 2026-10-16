import { getIO } from '../../config/socket.js';
import logger from '../../utils/logger.utils.js';
import { SECURITY_LOG_CREATED, SECURITY_LOG_DELETED } from './securityLog.events.js';

/**
 * Dispatch real-time event when a security log is created.
 * @param {Object} savedLog - The persisted security log record
 */
export const dispatchSecurityLogCreated = (savedLog) => {
  try {
    const io = getIO();
    if (io && savedLog?.orgId) {
      const guardRoom = `org:${savedLog.orgId.toString()}:guards`;
      const adminRoom = `org:${savedLog.orgId.toString()}:role:admin`;
      logger.info(`[SecurityLog Socket] Dispatching ${SECURITY_LOG_CREATED} to rooms: ${guardRoom}, ${adminRoom}`);
      io.to(guardRoom).to(adminRoom).emit(SECURITY_LOG_CREATED, savedLog);
    }
  } catch (error) {
    logger.error(`[SecurityLog Socket] Failed to emit ${SECURITY_LOG_CREATED}:`, error?.message || error);
  }
};

/**
 * Dispatch real-time event when a security log is deleted.
 * @param {string} logId - The ID of the deleted log
 * @param {string} orgId - The organization context ID
 */
export const dispatchSecurityLogDeleted = (logId, orgId) => {
  try {
    const io = getIO();
    if (io && orgId) {
      const guardRoom = `org:${orgId.toString()}:guards`;
      const adminRoom = `org:${orgId.toString()}:role:admin`;
      logger.info(`[SecurityLog Socket] Dispatching ${SECURITY_LOG_DELETED} to rooms: ${guardRoom}, ${adminRoom}`);
      io.to(guardRoom).to(adminRoom).emit(SECURITY_LOG_DELETED, { id: logId });
    }
  } catch (error) {
    logger.error(`[SecurityLog Socket] Failed to emit ${SECURITY_LOG_DELETED}:`, error?.message || error);
  }
};

export default {
  dispatchSecurityLogCreated,
  dispatchSecurityLogDeleted,
};

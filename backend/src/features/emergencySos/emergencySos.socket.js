import { getIO } from '../../config/socket.js';
import logger from '../../utils/logger.utils.js';

/**
 * Dispatch real-time emergency SOS triggered event to guardhouse, org, and resident rooms.
 */
export const dispatchSosTriggered = (sosAlert) => {
  try {
    const io = getIO();
    if (!io || !sosAlert?.orgId) return;

    const orgIdStr = sosAlert.orgId.toString();
    const guardRoom = `org:${orgIdStr}:guards`;
    const orgRoom = `org:${orgIdStr}`;
    const userRoom = sosAlert.userId ? `user:${sosAlert.userId.toString()}` : null;

    logger.info(`[Emergency SOS Socket] Broadcasting SOS_TRIGGERED to ${guardRoom}`);
    io.to(guardRoom).emit('SOS_TRIGGERED', sosAlert);
    io.to(orgRoom).emit('SOS_TRIGGERED', sosAlert);

    if (userRoom) {
      io.to(userRoom).emit('SOS_TRIGGERED', sosAlert);
    }
  } catch (error) {
    logger.error('[Emergency SOS Socket] Failed to dispatch SOS_TRIGGERED:', error);
  }
};

/**
 * Dispatch real-time emergency SOS status updated event (acknowledged, resolved, cancelled).
 */
export const dispatchSosStatusUpdated = (sosAlert) => {
  try {
    const io = getIO();
    if (!io || !sosAlert?.orgId) return;

    const orgIdStr = sosAlert.orgId.toString();
    const guardRoom = `org:${orgIdStr}:guards`;
    const orgRoom = `org:${orgIdStr}`;
    const userRoom = sosAlert.userId ? `user:${sosAlert.userId.toString()}` : null;

    logger.info(`[Emergency SOS Socket] Broadcasting SOS_STATUS_UPDATED (${sosAlert.status}) to ${guardRoom}`);
    io.to(guardRoom).emit('SOS_STATUS_UPDATED', sosAlert);
    io.to(orgRoom).emit('SOS_STATUS_UPDATED', sosAlert);

    if (userRoom) {
      io.to(userRoom).emit('SOS_STATUS_UPDATED', sosAlert);
    }
  } catch (error) {
    logger.error('[Emergency SOS Socket] Failed to dispatch SOS_STATUS_UPDATED:', error);
  }
};

export default {
  dispatchSosTriggered,
  dispatchSosStatusUpdated,
};

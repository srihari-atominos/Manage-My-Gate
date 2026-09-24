import { getIO } from '../../config/socket.js';
import logger from '../../utils/logger.utils.js';

export const dispatchNoticeCreated = (notice) => {
  try {
    const io = getIO();
    if (notice.orgId) {
      const room = `org:${notice.orgId.toString()}`;
      logger.info(`Dispatching notice:created to room: ${room}`);
      io.to(room).emit('notice:created', notice);
    }
  } catch (error) {
    logger.error('Failed to emit notice:created:', error);
  }
};

export const dispatchNoticeUpdated = (notice) => {
  try {
    const io = getIO();
    if (notice.orgId) {
      const room = `org:${notice.orgId.toString()}`;
      logger.info(`Dispatching notice:updated to room: ${room}`);
      io.to(room).emit('notice:updated', notice);
    }
  } catch (error) {
    logger.error('Failed to emit notice:updated:', error);
  }
};

export const dispatchNoticeDeleted = (id, orgId, userId) => {
  try {
    const io = getIO();
    if (orgId) {
      const room = `org:${orgId.toString()}`;
      logger.info(`Dispatching notice:deleted to room: ${room}`);
      io.to(room).emit('notice:deleted', { id, deletedBy: userId });
    }
  } catch (error) {
    logger.error('Failed to emit notice:deleted:', error);
  }
};

export const dispatchNoticePinnedToggled = (notice) => {
  try {
    const io = getIO();
    if (notice.orgId) {
      const room = `org:${notice.orgId.toString()}`;
      logger.info(`Dispatching notice:pinned_toggled to room: ${room}`);
      io.to(room).emit('notice:pinned_toggled', notice);
    }
  } catch (error) {
    logger.error('Failed to emit notice:pinned_toggled:', error);
  }
};

export const dispatchNoticeExpired = (notice) => {
  try {
    const io = getIO();
    if (notice.orgId) {
      const room = `org:${notice.orgId.toString()}`;
      logger.info(`Dispatching notice:expired to room: ${room}`);
      io.to(room).emit('notice:expired', notice);
    }
  } catch (error) {
    logger.error('Failed to emit notice:expired:', error);
  }
};

export const dispatchNoticeAcknowledgementReminder = (payload) => {
  try {
    const io = getIO();
    if (payload.orgId) {
      const room = `org:${payload.orgId.toString()}`;
      logger.info(`Dispatching notice:acknowledgement_reminder to room: ${room}`);
      io.to(room).emit('notice:acknowledgement_reminder', payload);
    }
  } catch (error) {
    logger.error('Failed to emit notice:acknowledgement_reminder:', error);
  }
};

export default {
  dispatchNoticeCreated,
  dispatchNoticeUpdated,
  dispatchNoticeDeleted,
  dispatchNoticePinnedToggled,
  dispatchNoticeExpired,
  dispatchNoticeAcknowledgementReminder,
};

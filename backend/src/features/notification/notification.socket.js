import { getIO } from '../../config/socket.js';
import logger from '../../utils/logger.utils.js';

/**
 * Safely dispatches a new notification to a specific recipient over Socket.io room.
 * @param {string} recipientId - The user ID of the recipient
 * @param {object} notification - The notification document/payload containing fields to emit
 */
export const dispatchIncomingNotification = (recipientId, notification) => {
  try {
    const io = getIO();
    const room = `user:${recipientId}`;

    logger.info(`Dispatching INCOMING_NOTIFICATION to room: ${room}`);

    const payload = {
      id: notification._id.toString(),
      recipientId: notification.recipientId.toString(),
      senderId: notification.senderId ? notification.senderId.toString() : null,
      title: notification.title,
      body: notification.body,
      actionUrl: notification.actionUrl,
      type: notification.type,
      isRead: notification.isRead,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    };

    io.to(room).emit('INCOMING_NOTIFICATION', payload);
  } catch (error) {
    // Swallowing errors inside safe try/catch blocks so socket network drops never crash the application thread.
    logger.error('Failed to emit real-time socket notification:', error);
  }
};

export default {
  dispatchIncomingNotification,
};

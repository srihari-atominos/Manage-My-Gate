import { getIO } from '../../config/socket.js';
import directoryMessageEvents from './directoryMessage.events.js';
import logger from '../../utils/logger.utils.js';

export const initDirectoryMessageSockets = () => {
  directoryMessageEvents.on('message:created', ({ message, conversation, receiverId }) => {
    try {
      const io = getIO();
      // Emit to recipient's personal socket room
      io.to(`user:${receiverId}`).emit('message:new', {
        message,
        conversation,
      });
      // Emit notification update
      io.to(`user:${receiverId}`).emit('notification:new', {
        type: 'DIRECTORY_MESSAGE',
        title: 'New Message',
        body: message.text,
        conversationId: conversation._id,
      });
    } catch (err) {
      logger.error('Failed to emit message:new socket event', err);
    }
  });

  directoryMessageEvents.on('message:read', ({ conversationId, userId, senderId }) => {
    try {
      const io = getIO();
      if (senderId) {
        io.to(`user:${senderId}`).emit('message:read', {
          conversationId,
          readByUserId: userId,
        });
      }
    } catch (err) {
      logger.error('Failed to emit message:read socket event', err);
    }
  });
};

export default initDirectoryMessageSockets;

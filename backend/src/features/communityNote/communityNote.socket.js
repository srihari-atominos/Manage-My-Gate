import { getIO } from '../../config/socket.js';
import communityNoteEvents from './communityNote.events.js';
import logger from '../../utils/logger.utils.js';

export const initCommunityNoteSockets = () => {
  communityNoteEvents.on('note:created', (note) => {
    try {
      const io = getIO();
      if (note?.orgId) {
        io.to(`org:${note.orgId}`).emit('communityNote:created', note);
      }
    } catch (err) {
      logger.error('Failed to emit communityNote:created socket event', err);
    }
  });

  communityNoteEvents.on('note:expired', (payload) => {
    try {
      const io = getIO();
      if (payload?.orgId) {
        io.to(`org:${payload.orgId}`).emit('communityNote:expired', payload);
      }
    } catch (err) {
      logger.error('Failed to emit communityNote:expired socket event', err);
    }
  });
};

export default initCommunityNoteSockets;

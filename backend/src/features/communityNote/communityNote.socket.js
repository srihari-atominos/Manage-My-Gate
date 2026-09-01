import { getIO } from '../../config/socket.js';
import communityNoteEvents from './communityNote.events.js';
import logger from '../../utils/logger.utils.js';

export const initCommunityNoteSockets = () => {
  communityNoteEvents.on('note:created', (note) => {
    try {
      const io = getIO();
      const rawOrgId = note?.orgId;
      const orgIdStr =
        typeof rawOrgId === 'object' && rawOrgId !== null
          ? String(rawOrgId._id || rawOrgId.id || rawOrgId)
          : String(rawOrgId || '');

      if (orgIdStr && orgIdStr !== '[object Object]') {
        io.to(`org:${orgIdStr}`).emit('communityNote:created', note);
      }
    } catch (err) {
      logger.error('Failed to emit communityNote:created socket event', err);
    }
  });

  communityNoteEvents.on('note:expired', (payload) => {
    try {
      const io = getIO();
      const rawOrgId = payload?.orgId;
      const orgIdStr =
        typeof rawOrgId === 'object' && rawOrgId !== null
          ? String(rawOrgId._id || rawOrgId.id || rawOrgId)
          : String(rawOrgId || '');

      if (orgIdStr && orgIdStr !== '[object Object]') {
        io.to(`org:${orgIdStr}`).emit('communityNote:expired', payload);
      }
    } catch (err) {
      logger.error('Failed to emit communityNote:expired socket event', err);
    }
  });
};

export default initCommunityNoteSockets;

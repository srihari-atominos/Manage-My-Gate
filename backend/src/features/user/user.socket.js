import { getIO } from '../../config/socket.js';
import userEvents from './user.events.js';
import logger from '../../utils/logger.utils.js';

/**
 * Initializes socket event listeners for User-related events.
 * Listens to internal Node EventEmitter and dispatches to connected WebSocket clients.
 */
export const initUserSocket = () => {
  userEvents.on('USER_UPDATED', async (payload) => {
    try {
      const { userId, orgId, action, roles, permissions } = payload;
      let targetOrgId = orgId;
      
      // If orgId is not provided in payload, resolve primary organization membership
      if (!targetOrgId) {
        const orgMembershipService = (await import('../orgMembership/orgMembership.services.js')).default;
        const membership = await orgMembershipService.getFirstMembership(userId);
        if (membership) {
          targetOrgId = membership.organization || membership.orgId;
        }
      }
      
      const io = getIO();
      const socketData = {
        type: 'USER',
        userId: userId ? userId.toString() : '',
        action,
        roles: roles || [],
        permissions: permissions || [],
      };

      if (targetOrgId) {
        io.to(`org:${targetOrgId.toString()}`).emit('RECORD_UPDATED', socketData);
        io.to(`org:${targetOrgId.toString()}`).emit('USER_UPDATED', socketData);
      }

      // Broadcast globally so connected target client's session updates in real-time
      io.emit('RECORD_UPDATED', socketData);
      io.emit('USER_UPDATED', socketData);
      
      logger.info(`Socket emitted RECORD_UPDATED/USER_UPDATED for user: ${userId}`);
    } catch (error) {
      logger.error('Failed to emit RECORD_UPDATED socket event for user:', error);
    }
  });
};

export default initUserSocket;

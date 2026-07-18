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
      const { userId, orgId, action } = payload;
      let targetOrgId = orgId;
      
      // If orgId is not provided in payload (e.g. from updateProfile), we need to resolve it
      if (!targetOrgId) {
        const orgMembershipService = (await import('../orgMembership/orgMembership.services.js')).default;
        // Assuming we emit to the first/primary org of the user, or fetch all memberships
        const membership = await orgMembershipService.getFirstMembership(userId);
        if (membership) {
          targetOrgId = membership.organization || membership.orgId; // Depending on schema
        }
      }
      
      if (!targetOrgId) return; // Cannot broadcast if org is unknown

      const io = getIO();
      // Emit to the organization's room
      io.to(`org:${targetOrgId.toString()}`).emit('RECORD_UPDATED', {
        type: 'USER',
        userId,
        action,
      });
      
      logger.info(`Socket emitted RECORD_UPDATED to org:${targetOrgId.toString()} for user: ${userId}`);
    } catch (error) {
      logger.error('Failed to emit RECORD_UPDATED socket event for user:', error);
    }
  });
};

export default initUserSocket;

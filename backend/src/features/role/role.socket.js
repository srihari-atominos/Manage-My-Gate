import { getIO } from '../../config/socket.js';
import roleEvents from './role.events.js';
import logger from '../../utils/logger.utils.js';

/**
 * Initializes socket event listeners for Role-related events.
 * Listens to internal Node EventEmitter and dispatches to connected WebSocket clients.
 */
export const initRoleSocket = () => {
  roleEvents.on('rolePermissionsUpdated', async (payload) => {
    try {
      const { roleId } = payload;
      const roleService = (await import('./role.services.js')).default;
      const role = await roleService.getRoleById(roleId);
      
      if (!role) return;

      const io = getIO();
      // Emit to the organization's room
      io.to(`org:${role.orgId.toString()}`).emit('ROLE_UPDATED', {
        roleId: role._id,
        roleName: role.name,
      });
      
      logger.info(`Socket emitted ROLE_UPDATED to org:${role.orgId.toString()} for role: ${role.name}`);
    } catch (error) {
      logger.error('Failed to emit ROLE_UPDATED socket event:', error);
    }
  });
};

export default initRoleSocket;

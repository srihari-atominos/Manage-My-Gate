import { getIO } from '../../config/socket.js';
import orgEventEmitter from './organization.events.js';
import logger from '../../utils/logger.utils.js';

/**
 * Initializes socket event listeners for Organization & Workspace lifecycle events.
 * Listens to internal Node EventEmitter and dispatches real-time socket events to connected clients.
 */
export const initOrganizationSocket = () => {
  orgEventEmitter.on('ORG_STATUS_CHANGED', async (payload) => {
    try {
      const io = getIO();
      const socketPayload = {
        orgId: payload.targetId ? payload.targetId.toString() : null,
        targetId: payload.targetId ? payload.targetId.toString() : null,
        oldStatus: payload.oldStatus,
        newStatus: payload.newStatus,
        status: payload.newStatus,
      };

      if (payload.targetId) {
        const roomName = `org:${payload.targetId.toString()}`;
        io.to(roomName).emit('ORGANIZATION_STATUS_CHANGED', socketPayload);
        io.to(roomName).emit('ORGANIZATION_UPDATED', socketPayload);
        io.to(roomName).emit('RECORD_UPDATED', { type: 'ORGANIZATION', action: 'UPDATE', data: socketPayload });
      }

      // Broadcast globally so all active sessions prune deleted/inactive organizations in real time
      io.emit('ORGANIZATION_STATUS_CHANGED', socketPayload);
      io.emit('ORGANIZATION_UPDATED', socketPayload);
      if (payload.newStatus === 'Deleted' || payload.newStatus === 'Inactive' || payload.newStatus === 'Rejected') {
        io.emit('ORGANIZATION_DELETED', socketPayload);
        io.emit('WORKSPACE_DELETED', socketPayload);
      }
      io.emit('RECORD_UPDATED', { type: 'ORGANIZATION', action: 'UPDATE', data: socketPayload });

      logger.info(`Socket emitted ORGANIZATION_STATUS_CHANGED for org: ${payload.targetId} -> ${payload.newStatus}`);
    } catch (error) {
      logger.error('Failed to emit ORGANIZATION_STATUS_CHANGED socket event:', error);
    }
  });
};

export default initOrganizationSocket;

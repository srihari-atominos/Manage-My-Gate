import { getIO } from '../../config/socket.js';
import logger from '../../utils/logger.utils.js';

/**
 * Listen to native villaEvents domain events and dispatch them to the active socket server.
 */
export const setupVillaSocketListeners = async () => {
  // Dynamically import villaEvents to break circular dependency in ESM
  const { villaEvents } = await import('./villa.events.js');

  logger.info('Registering real-time Socket.io listeners for Villa/Unit events.');

  villaEvents.on('unit_created', (payload) => {
    try {
      if (!payload || !payload.orgId) {
        logger.warn('Socket dispatch ignored: payload or orgId missing for unit_created');
        return;
      }
      const room = `org:${payload.orgId}`;
      logger.info(`Broadcasting unit_created to room: ${room}`);
      getIO().to(room).emit('unit_created', payload);
    } catch (error) {
      // Safe try/catch so socket network drops never crash the application thread.
      logger.error('Failed to emit unit_created socket event:', error);
    }
  });

  villaEvents.on('unit_updated', (payload) => {
    try {
      if (!payload || !payload.orgId) {
        logger.warn('Socket dispatch ignored: payload or orgId missing for unit_updated');
        return;
      }
      const room = `org:${payload.orgId}`;
      logger.info(`Broadcasting unit_updated to room: ${room}`);
      getIO().to(room).emit('unit_updated', payload);
    } catch (error) {
      logger.error('Failed to emit unit_updated socket event:', error);
    }
  });

  villaEvents.on('resident_assigned', (payload) => {
    try {
      if (!payload || !payload.orgId) {
        logger.warn('Socket dispatch ignored: payload or orgId missing for resident_assigned');
        return;
      }
      const room = `org:${payload.orgId}`;
      logger.info(`Broadcasting resident_assigned to room: ${room}`);
      getIO().to(room).emit('resident_assigned', payload);
    } catch (error) {
      logger.error('Failed to emit resident_assigned socket event:', error);
    }
  });

  villaEvents.on('resident_type_updated', (payload) => {
    try {
      if (!payload || !payload.orgId) {
        logger.warn('Socket dispatch ignored: payload or orgId missing for resident_type_updated');
        return;
      }
      const room = `org:${payload.orgId}`;
      logger.info(`Broadcasting resident_type_updated to room: ${room}`);
      getIO().to(room).emit('resident_type_updated', payload);
    } catch (error) {
      logger.error('Failed to emit resident_type_updated socket event:', error);
    }
  });
};

export default setupVillaSocketListeners;

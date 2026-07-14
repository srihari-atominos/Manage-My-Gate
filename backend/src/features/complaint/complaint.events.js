import logger from '../../utils/logger.utils.js';
import { messageBroker } from '../../utils/messageBroker.util.js';

// Internal event bus for decoupled operations like Socket.IO emissions and notifications
// Now powered by Redis for multi-pod scalability

export const complaintEvents = {
  emit: (event, payload) => {
    messageBroker.publishEvent(event, payload).catch(err => {
      logger.error('Unhandled error in complaint events publish:', err);
    });
  },
  on: (event, callback) => {
    messageBroker.subscribeEvent(event, callback);
  }
};

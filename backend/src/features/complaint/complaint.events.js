import { EventEmitter } from 'events';
import logger from '../../utils/logger.utils.js';

// Internal event bus for decoupled operations like Socket.IO emissions and notifications
export const complaintEvents = new EventEmitter();

// Log unhandled errors in events
complaintEvents.on('error', (err) => {
  logger.error('Unhandled error in complaint events:', err);
});

import { registerPollSocketHandlers } from './poll.socket.js';
import './poll.cron.js';
import './poll.notification.js';
import './poll.audit.js';
import logger from '../../utils/logger.utils.js';

try {
  registerPollSocketHandlers();
  logger.info('[Poll] Event listeners and Socket handlers registered.');
} catch (error) {
  logger.error('[Poll] Failed to register event listeners:', error);
}

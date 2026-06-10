import { EventEmitter } from 'events';
import { dispatchIncomingNotification } from './notification.socket.js';
import logger from '../../utils/logger.utils.js';

class NotificationEventEmitter extends EventEmitter {}

const notificationEvents = new NotificationEventEmitter();

// Hook event to Socket dispatcher
notificationEvents.on('notification_created', (notification) => {
  logger.info(`Notification event bus triggered: notification_created for recipient ID ${notification.recipientId}`);
  dispatchIncomingNotification(notification.recipientId.toString(), notification);
});

export default notificationEvents;

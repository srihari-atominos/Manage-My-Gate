import { EventEmitter } from 'events';
import { dispatchIncomingNotification } from './notification.socket.js';
import { dispatchPushNotification } from './notification.push.js';
import logger from '../../utils/logger.utils.js';

class NotificationEventEmitter extends EventEmitter {}

const notificationEvents = new NotificationEventEmitter();

// Hook event to Socket dispatcher & Mobile Push Notification dispatcher
notificationEvents.on('notification_created', (notification) => {
  const recipientIdStr = notification.recipientId ? notification.recipientId.toString() : null;
  if (!recipientIdStr) return;

  logger.info(`Notification event bus triggered: notification_created for recipient ID ${recipientIdStr}`);

  // 1. Real-time in-app WebSocket emission
  dispatchIncomingNotification(recipientIdStr, notification);

  // 2. Out-of-band Mobile Push Notification delivery
  dispatchPushNotification(recipientIdStr, {
    title: notification.title,
    body: notification.body,
    actionUrl: notification.actionUrl,
    type: notification.type,
    sound: 'default',
    data: {
      notificationId: notification._id ? notification._id.toString() : null,
      orgId: notification.orgId ? notification.orgId.toString() : null,
      createdAt: notification.createdAt,
    },
  }).catch((err) => {
    logger.error('Push notification background dispatch failed:', err);
  });
});

export default notificationEvents;

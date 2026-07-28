import { EventEmitter } from 'events';
import logger from '../../utils/logger.utils.js';

class PlatformOrderEvents extends EventEmitter {}

const platformOrderEvents = new PlatformOrderEvents();

platformOrderEvents.on('order.created', (order) => {
  logger.info(`[PlatformOrder Event] order.created - Order: ${order._id} Number: ${order.orderNumber}`);
});

platformOrderEvents.on('platform_order_status_updated', ({ order, previousStatus, newStatus }) => {
  logger.info(
    `[PlatformOrder Event] status_updated - Order: ${order._id} (${order.orderNumber}) Status: ${previousStatus} -> ${newStatus}`
  );
});

platformOrderEvents.on('platform_order_deleted', (order) => {
  logger.info(`[PlatformOrder Event] order_deleted - Order: ${order._id} Number: ${order.orderNumber}`);
});

export default platformOrderEvents;

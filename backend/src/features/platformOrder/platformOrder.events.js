import { EventEmitter } from 'events';
import logger from '../../utils/logger.utils.js';
import platformProvisioningJobService from '../platformProvisioningJob/platformProvisioningJob.service.js';

class PlatformOrderEvents extends EventEmitter {}

const platformOrderEvents = new PlatformOrderEvents();

platformOrderEvents.on('order.created', (order) => {
  logger.info(`[PlatformOrder Event] order.created - Order: ${order._id} Number: ${order.orderNumber}`);
});

platformOrderEvents.on('platform_order_status_updated', async ({ order, previousStatus, newStatus }) => {
  logger.info(
    `[PlatformOrder Event] status_updated - Order: ${order._id} (${order.orderNumber}) Status: ${previousStatus} -> ${newStatus}`
  );
  
  // Trigger zero-touch provisioning if order transitions to PROVISIONING
  if (newStatus === 'PROVISIONING' && previousStatus !== 'PROVISIONING') {
    logger.info(`[PlatformOrder Event] Triggering Provisioning Pipeline for Order ${order._id}`);
    try {
      await platformProvisioningJobService.executeProvisioningPipeline(order);
    } catch (err) {
      logger.error(`[PlatformOrder Event] Provisioning Pipeline failed: ${err.message}`);
    }
  }
});

platformOrderEvents.on('platform_order_deleted', (order) => {
  logger.info(`[PlatformOrder Event] order_deleted - Order: ${order._id} Number: ${order.orderNumber}`);
});

export default platformOrderEvents;

import platformPaymentEvents from '../platformPayment/platformPayment.events.js';
import platformProvisioningJobService from './platformProvisioningJob.service.js';
import logger from '../../utils/logger.utils.js';

/**
 * Register event listeners for platform provisioning jobs.
 * Listens for payment.success event emitted by platformPayment.events.js.
 */
export function initProvisioningJobListeners() {
  platformPaymentEvents.on('payment.success', async (payload) => {
    try {
      const orderId = payload.orderId || payload.payment?.orderId;
      const paymentId = payload.paymentId || payload.payment?._id;
      const organisationId = payload.organisationId || payload.payment?.organisationId || null;

      logger.info(
        `[Provisioning Listener] Received 'payment.success' event for Order ID: ${orderId}, Payment ID: ${paymentId}, Org ID: ${organisationId}. Enqueuing job...`
      );

      if (!orderId || !paymentId) {
        logger.error('[Provisioning Listener] Order ID or Payment ID is missing in payment.success payload.');
        return;
      }

      await platformProvisioningJobService.enqueueJob({
        orderId,
        paymentId,
        organisationId,
        requestedFeatures: payload.requestedFeatures || [],
      });

      logger.info(`[Provisioning Listener] Successfully enqueued provisioning job for Order ID: ${orderId}`);
    } catch (error) {
      logger.error(`[Provisioning Listener] Failed to enqueue provisioning job: ${error.message}`);
    }
  });

  logger.info('⚙️ Platform Provisioning Job event listeners registered.');
}

// Auto-register listeners on module import
initProvisioningJobListeners();

export default {
  initProvisioningJobListeners,
};

import platformOrderEvents from '../platformOrder/platformOrder.events.js';
import platformQuoteEvents from '../platformQuote/platformQuote.events.js';
import platformProvisioningJobService from './platformProvisioningJob.service.js';
import logger from '../../utils/logger.utils.js';

export function initProvisioningJobListeners() {
  // Listen for PAYMENT_SETTLED (emitted from webhooks)
  platformOrderEvents.on('PAYMENT_SETTLED', async (orderData) => {
    try {
      logger.info(`[Provisioning Listener] Detected PAYMENT_SETTLED for Order ID: ${orderData._id}. Starting pipeline...`);
      await platformProvisioningJobService.executeProvisioningPipeline(orderData);
    } catch (error) {
      logger.error(`[Provisioning Listener] Pipeline failed for PAYMENT_SETTLED event: ${error.message}`);
    }
  });

  // Listen for TRIAL_INITIATED (emitted from quote engine)
  platformQuoteEvents.on('TRIAL_INITIATED', async (quoteData) => {
    try {
      logger.info(`[Provisioning Listener] Detected TRIAL_INITIATED for Quote ID: ${quoteData._id}. Starting pipeline...`);
      await platformProvisioningJobService.executeProvisioningPipeline(quoteData);
    } catch (error) {
      logger.error(`[Provisioning Listener] Pipeline failed for TRIAL_INITIATED event: ${error.message}`);
    }
  });

  logger.info('⚙️ Provisioning domain event listeners registered successfully.');
}

// Auto-register listeners when module is imported
initProvisioningJobListeners();

export default {
  initProvisioningJobListeners,
};

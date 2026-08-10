import OutboxEvent from './outboxEvent.model.js';
import logger from '../../utils/logger.utils.js';
import emailService from '../../utils/email.service.js';
import invoiceService from '../platformOrder/invoice.service.js';

class OutboxWorker {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  start(intervalMs = 10000) {
    if (this.intervalId) return;
    logger.info(`Starting Outbox Worker (Interval: ${intervalMs}ms)`);
    this.intervalId = setInterval(() => this.processEvents(), intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Outbox Worker stopped');
    }
  }

  async processEvents() {
    if (this.isRunning) return; // Prevent overlapping runs
    this.isRunning = true;

    try {
      const batchSize = 50;
      const eventsToProcess = [];

      // Sequentially lock up to 50 pending events to prevent race conditions with other workers
      for (let i = 0; i < batchSize; i++) {
        const event = await OutboxEvent.findOneAndUpdate(
          { status: 'PENDING' },
          { $set: { status: 'PROCESSING' } },
          { new: true, sort: { createdAt: 1 } }
        );
        if (!event) break; // No more pending events found
        eventsToProcess.push(event);
      }

      if (eventsToProcess.length > 0) {
        logger.info(`Outbox Worker locked ${eventsToProcess.length} events for processing.`);
      }

      for (const event of eventsToProcess) {
        await this.handleEvent(event);
      }
    } catch (error) {
      logger.error('Outbox Worker encountered a critical error during batch processing:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async handleEvent(event) {
    try {
      logger.info(`Processing event ${event._id} of type ${event.eventType}`);
      
      switch (event.eventType) {
        case 'PROVISIONING_COMPLETED':
          await emailService.sendWelcomeEmail(event.payload);
          break;
          
        case 'PAYMENT_SETTLED':
          // 1. Generate PDF Invoice
          const { filePath, publicPath } = await invoiceService.generateInvoice(
            event.payload.orderId, 
            event.payload
          );
          // 2. Send email with attached PDF
          await emailService.sendPaymentReceipt({
            ...event.payload,
            invoicePath: filePath
          });
          break;
          
        case 'DISPATCH_EXPIRY_WARNING':
        case 'DISPATCH_EXPIRED_NOTICE':
          await emailService.sendExpiryWarning(event.payload);
          break;
          
        default:
          logger.warn(`Unknown eventType: ${event.eventType}. Marking as completed to skip.`);
          break;
      }

      // Mark success
      await OutboxEvent.findByIdAndUpdate(event._id, { status: 'COMPLETED' });
      logger.info(`Event ${event._id} processed successfully.`);
      
    } catch (error) {
      // Handle failure and retry logic
      const retries = (event.retries || 0) + 1;
      const nextStatus = retries > 3 ? 'FAILED' : 'PENDING';
      
      logger.error(`Event ${event._id} failed (Attempt ${retries}). Status will be set to: ${nextStatus}. Error: ${error.message}`);
      
      await OutboxEvent.findByIdAndUpdate(event._id, {
        status: nextStatus,
        retries,
        error: error.message
      });
    }
  }
}

export default new OutboxWorker();

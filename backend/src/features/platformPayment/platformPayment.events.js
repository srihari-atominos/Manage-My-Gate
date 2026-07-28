import { EventEmitter } from 'events';
import logger from '../../utils/logger.utils.js';

class PlatformPaymentEvents extends EventEmitter {}

const platformPaymentEvents = new PlatformPaymentEvents();

platformPaymentEvents.on('payment.processed', ({ payment, isDuplicate }) => {
  logger.info(
    `[PlatformPayment Event] payment.processed - Payment ID: ${payment._id}, Status: ${payment.status}, EventId: ${payment.gatewayEventId}, TxId: ${payment.gatewayTransactionId}, Duplicate: ${Boolean(isDuplicate)}`
  );
});

platformPaymentEvents.on('payment.failed', (payment) => {
  logger.warn(
    `[PlatformPayment Event] payment.failed - Payment ID: ${payment._id}, EventId: ${payment.gatewayEventId}, TxId: ${payment.gatewayTransactionId}`
  );
});

platformPaymentEvents.on('payment.refunded', (payment) => {
  logger.info(
    `[PlatformPayment Event] payment.refunded - Payment ID: ${payment._id}, TxId: ${payment.gatewayTransactionId}`
  );
});

export default platformPaymentEvents;

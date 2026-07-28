import { EventEmitter } from 'events';
import logger from '../../utils/logger.utils.js';

class PlatformInvoiceEvents extends EventEmitter {}

const platformInvoiceEvents = new PlatformInvoiceEvents();

platformInvoiceEvents.on('invoice.created', (invoice) => {
  logger.info(
    `[PlatformInvoice Event] invoice.created - Invoice ID: ${invoice._id}, Number: ${invoice.invoiceNumber}, Order: ${invoice.orderId}`
  );
});

platformInvoiceEvents.on('platform_invoice_status_updated', ({ invoice, previousStatus, newStatus }) => {
  logger.info(
    `[PlatformInvoice Event] status_updated - Invoice ID: ${invoice._id} (${invoice.invoiceNumber}) Status: ${previousStatus} -> ${newStatus}`
  );
});

platformInvoiceEvents.on('platform_invoice_deleted', (invoice) => {
  logger.info(
    `[PlatformInvoice Event] invoice_deleted - Invoice ID: ${invoice._id}, Number: ${invoice.invoiceNumber}`
  );
});

export default platformInvoiceEvents;

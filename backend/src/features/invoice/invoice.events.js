import { EventEmitter } from 'events';

export const INVOICE_GENERATED = 'INVOICE_GENERATED';
export const INVOICE_STATUS_UPDATED = 'INVOICE_STATUS_UPDATED';

export const invoiceEventEmitter = new EventEmitter();

// Load socket listeners asynchronously
import { setupInvoiceSocketListeners } from './invoice.socket.js';
setupInvoiceSocketListeners().catch((err) => {
  console.error('Failed to initialize invoice socket listeners:', err);
});

export default invoiceEventEmitter;

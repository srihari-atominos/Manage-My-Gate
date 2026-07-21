import EventEmitter from 'events';
export const paymentEventEmitter = new EventEmitter();

// Event Names
export const PAYMENT_INITIATED = 'PAYMENT_INITIATED';
export const PAYMENT_SUCCESS = 'PAYMENT_SUCCESS';
export const PAYMENT_FAILED = 'PAYMENT_FAILED';
export const PAYMENT_REFUNDED = 'PAYMENT_REFUNDED';

// Load socket listeners asynchronously
import { setupPaymentSocketListeners } from './payment.socket.js';
setupPaymentSocketListeners().catch((err) => {
  console.error('Failed to initialize payment socket listeners:', err);
});

export default paymentEventEmitter;

import EventEmitter from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enterprise Event Payload Standard
 * Every emitted event MUST follow this structure:
 * {
 *   eventName: String,
 *   version: Number,
 *   timestamp: Date,
 *   correlationId: String,
 *   payload: { orgId, ...data }
 * }
 */
export const createVersionedPayload = (eventName, correlationId, payload) => ({
  eventName,
  version: 1,
  timestamp: new Date(),
  correlationId: correlationId || uuidv4(),
  payload
});

export const paymentEventEmitter = new EventEmitter();

// Event Names
export const PAYMENT_INITIATED = 'PAYMENT_INITIATED';
export const PAYMENT_RECEIVED = 'PAYMENT_RECEIVED';
export const PAYMENT_VERIFIED = 'PAYMENT_VERIFIED';
export const PAYMENT_SUCCESS = 'PAYMENT_SUCCESS';
export const PAYMENT_FAILED = 'PAYMENT_FAILED';
export const PAYMENT_REFUNDED = 'PAYMENT_REFUNDED';

// Load socket listeners asynchronously
import { setupPaymentSocketListeners } from './payment.socket.js';
setupPaymentSocketListeners().catch((err) => {
  console.error('Failed to initialize payment socket listeners:', err);
});

export default paymentEventEmitter;

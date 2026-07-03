import EventEmitter from 'events';
export const paymentEventEmitter = new EventEmitter();

// Event Names
export const PAYMENT_INITIATED = 'PAYMENT_INITIATED';
export const PAYMENT_SUCCESS = 'PAYMENT_SUCCESS';
export const PAYMENT_FAILED = 'PAYMENT_FAILED';
export const PAYMENT_REFUNDED = 'PAYMENT_REFUNDED';

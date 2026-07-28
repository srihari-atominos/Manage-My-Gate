import { body, query, param } from 'express-validator';

const PAYMENT_STATUSES = ['SUCCESS', 'FAILED', 'REFUNDED'];

/**
 * Validation rules for processing a payment or webhook payload.
 */
export const processPaymentRules = [
  body('gatewayTransactionId')
    .notEmpty()
    .withMessage('Gateway transaction ID is required')
    .isString()
    .trim(),

  body('gatewayEventId')
    .notEmpty()
    .withMessage('Gateway event ID is required')
    .isString()
    .trim(),

  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid Order ID format'),

  body('invoiceId')
    .notEmpty()
    .withMessage('Invoice ID is required')
    .isMongoId()
    .withMessage('Invalid Invoice ID format'),

  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),

  body('currency')
    .optional()
    .isString()
    .trim(),

  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(PAYMENT_STATUSES)
    .withMessage(`Status must be one of: ${PAYMENT_STATUSES.join(', ')}`),

  body('paymentMethod')
    .optional()
    .isString()
    .trim(),

  body('rawGatewayPayload')
    .optional()
    .isObject()
    .withMessage('rawGatewayPayload must be an object'),
];

/**
 * Validation rules for querying platform payments list.
 */
export const queryPaymentRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('status')
    .optional()
    .isIn(PAYMENT_STATUSES)
    .withMessage(`Status filter must be one of: ${PAYMENT_STATUSES.join(', ')}`),

  query('orderId')
    .optional()
    .isMongoId()
    .withMessage('Invalid Order ID filter format'),

  query('invoiceId')
    .optional()
    .isMongoId()
    .withMessage('Invalid Invoice ID filter format'),

  query('search')
    .optional()
    .isString()
    .trim(),
];

/**
 * Validation rules for single payment param retrieval.
 */
export const getByIdPaymentRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid payment ID'),
];

/**
 * Validation rules for refunding a payment.
 */
export const refundPaymentRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid payment ID'),

  body('reason')
    .optional()
    .isString()
    .trim(),
];

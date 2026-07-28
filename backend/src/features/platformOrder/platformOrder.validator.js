import { body, query, param } from 'express-validator';

const ORDER_STATUSES = [
  'DRAFT',
  'PENDING_ACCEPTANCE',
  'ACCEPTED',
  'PAYMENT_PENDING',
  'PAID',
  'PROVISIONING',
  'ACTIVE',
  'CANCELLED',
  'EXPIRED',
];

/**
 * Validation rules for creating an order from a quote.
 */
export const createOrderFromQuoteRules = [
  body('quoteId')
    .notEmpty()
    .withMessage('Quote ID is required')
    .isMongoId()
    .withMessage('Invalid Quote ID format'),

  body('organisationId')
    .optional()
    .isMongoId()
    .withMessage('Invalid Organisation ID format'),

  body('acceptedBy')
    .optional()
    .isMongoId()
    .withMessage('Invalid AcceptedBy User ID format'),
];

/**
 * Validation rules for updating order status.
 */
export const updateOrderStatusRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid order ID'),

  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(ORDER_STATUSES)
    .withMessage(`Status must be one of: ${ORDER_STATUSES.join(', ')}`),
];

/**
 * Validation rules for querying platform orders list.
 */
export const queryOrderRules = [
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
    .isIn(ORDER_STATUSES)
    .withMessage(`Status filter must be one of: ${ORDER_STATUSES.join(', ')}`),

  query('organisationId')
    .optional()
    .isMongoId()
    .withMessage('Invalid Organisation ID filter format'),

  query('search')
    .optional()
    .isString()
    .withMessage('Search term must be a string')
    .trim(),
];

/**
 * Validation rules for single order param retrieval/deletion.
 */
export const getByIdOrderRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid order ID'),
];

/**
 * Validation rules for updating platform order details.
 */
export const updateOrderRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid order ID'),

  body('status')
    .optional()
    .isIn(ORDER_STATUSES)
    .withMessage(`Status must be one of: ${ORDER_STATUSES.join(', ')}`),

  body('acceptedAt')
    .optional()
    .isISO8601()
    .withMessage('acceptedAt must be a valid ISO 8601 date'),
];

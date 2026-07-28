import { body, query, param } from 'express-validator';

const INVOICE_STATUSES = ['DRAFT', 'UNPAID', 'PAID', 'VOID'];

/**
 * Validation rules for generating an invoice from an order.
 */
export const generateInvoiceFromOrderRules = [
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid Order ID format'),

  body('gstin')
    .optional()
    .isString()
    .trim()
    .withMessage('GSTIN must be a string'),

  body('hsnSacCode')
    .optional()
    .isString()
    .trim()
    .withMessage('HSN/SAC Code must be a string'),

  body('isInterstate')
    .optional()
    .isBoolean()
    .withMessage('isInterstate must be a boolean'),
];

/**
 * Validation rules for updating invoice status.
 */
export const updateInvoiceStatusRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid invoice ID'),

  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(INVOICE_STATUSES)
    .withMessage(`Status must be one of: ${INVOICE_STATUSES.join(', ')}`),
];

/**
 * Validation rules for querying platform invoices list.
 */
export const queryInvoiceRules = [
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
    .isIn(INVOICE_STATUSES)
    .withMessage(`Status filter must be one of: ${INVOICE_STATUSES.join(', ')}`),

  query('organisationId')
    .optional()
    .isMongoId()
    .withMessage('Invalid Organisation ID filter format'),

  query('orderId')
    .optional()
    .isMongoId()
    .withMessage('Invalid Order ID filter format'),

  query('search')
    .optional()
    .isString()
    .withMessage('Search term must be a string')
    .trim(),
];

/**
 * Validation rules for single invoice param retrieval/deletion.
 */
export const getByIdInvoiceRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid invoice ID'),
];

/**
 * Validation rules for updating platform invoice details.
 */
export const updateInvoiceRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid invoice ID'),

  body('status')
    .optional()
    .isIn(INVOICE_STATUSES)
    .withMessage(`Status must be one of: ${INVOICE_STATUSES.join(', ')}`),

  body('gstin')
    .optional()
    .isString()
    .trim(),

  body('hsnSacCode')
    .optional()
    .isString()
    .trim(),

  body('pdfUrl')
    .optional()
    .isString()
    .trim(),
];

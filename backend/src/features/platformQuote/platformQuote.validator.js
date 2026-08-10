import { body, query, param } from 'express-validator';

const QUOTE_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED', 'ACCEPTED'];

/**
 * Validation rules for creating a platform quote.
 */
export const createQuoteRules = [
  body('organisationId')
    .if(body('inquiryId').not().exists({ checkFalsy: true }))
    .notEmpty()
    .withMessage('Organisation ID is required when inquiryId is not provided')
    .isMongoId()
    .withMessage('Invalid Organisation ID format'),

  body('masterPricingId')
    .notEmpty()
    .withMessage('Master Pricing ID is required')
    .isMongoId()
    .withMessage('Invalid Master Pricing ID format'),

  body('inquiryId')
    .optional()
    .isMongoId()
    .withMessage('Invalid Inquiry ID format'),

  body('unitCount')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Unit count must be an integer of at least 1'),

  body('selectedAddOnKeys')
    .optional()
    .isArray()
    .withMessage('selectedAddOnKeys must be an array of string keys'),

  body('selectedAddOnKeys.*')
    .optional()
    .isString()
    .withMessage('Add-on key must be a string')
    .trim(),

  body('appliedDiscountPercent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Applied discount percent must be between 0 and 100'),

  body('expiresInDays')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('expiresInDays must be an integer between 1 and 365'),
];

/**
 * Validation rules for rejecting a quote.
 */
export const rejectQuoteRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid quote ID'),

  body('reason')
    .optional()
    .isString()
    .withMessage('Rejection reason must be a string')
    .trim(),
];

/**
 * Validation rules for querying quotes list.
 */
export const queryQuoteRules = [
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
    .isIn(QUOTE_STATUSES)
    .withMessage(`Status filter must be one of: ${QUOTE_STATUSES.join(', ')}`),

  query('organisationId')
    .optional()
    .isMongoId()
    .withMessage('Invalid Organisation ID filter format'),

  query('search')
    .optional()
    .isString()
    .withMessage('Search query must be a string')
    .trim(),
];

/**
 * Validation rules for single quote param.
 */
export const getByIdQuoteRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid quote ID'),
];

/**
 * Validation rules for updating a quote.
 */
export const updateQuoteRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid quote ID'),

  body('status')
    .optional()
    .isIn(QUOTE_STATUSES)
    .withMessage(`Status must be one of: ${QUOTE_STATUSES.join(', ')}`),

  body('appliedDiscountPercent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Applied discount percent must be between 0 and 100'),
];

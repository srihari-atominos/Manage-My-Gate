import { body, query, param } from 'express-validator';

export const createMasterPricingRules = [
  body('planCode')
    .notEmpty().withMessage('Plan code is required')
    .isString().withMessage('Plan code must be a string')
    .trim(),

  body('name')
    .notEmpty().withMessage('Name is required')
    .isString().withMessage('Name must be a string')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('type')
    .notEmpty().withMessage('Type is required')
    .isIn(['BASE_PLAN', 'UNIT_ADDON', 'FEATURE_ADDON'])
    .withMessage('Type must be one of: BASE_PLAN, UNIT_ADDON, FEATURE_ADDON'),

  body('pricingModel')
    .notEmpty().withMessage('Pricing model is required')
    .isIn(['FLAT', 'PER_UNIT', 'TIERED'])
    .withMessage('Pricing model must be one of: FLAT, PER_UNIT, TIERED'),

  body('basePrice')
    .notEmpty().withMessage('Base price is required')
    .isFloat({ min: 0 }).withMessage('Base price must be a non-negative number'),

  body('unitPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Unit price must be a non-negative number'),

  body('setupFee')
    .optional()
    .isFloat({ min: 0 }).withMessage('Setup fee must be a non-negative number'),

  body('freeTrialDuration')
    .optional()
    .isInt({ min: 0 }).withMessage('Free trial duration must be a non-negative integer'),

  body('billingInterval')
    .notEmpty().withMessage('Billing interval is required')
    .isIn(['MONTHLY', 'ANNUAL'])
    .withMessage('Billing interval must be one of: MONTHLY, ANNUAL'),

  body('features')
    .isArray().withMessage('Features must be an array'),

  body('features.*')
    .isString().withMessage('Feature must be a string')
    .trim(),

  body('status')
    .optional()
    .isIn(['ACTIVE', 'ARCHIVED'])
    .withMessage('Status must be ACTIVE or ARCHIVED'),

  body('maxAgentDiscountPercent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount percent must be between 0 and 100'),
];

export const updateMasterPricingRules = [
  param('id')
    .isMongoId().withMessage('Invalid master pricing plan ID'),

  body('planCode')
    .optional()
    .isString().withMessage('Plan code must be a string')
    .trim(),

  body('name')
    .optional()
    .isString().withMessage('Name must be a string')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('type')
    .optional()
    .isIn(['BASE_PLAN', 'UNIT_ADDON', 'FEATURE_ADDON'])
    .withMessage('Type must be one of: BASE_PLAN, UNIT_ADDON, FEATURE_ADDON'),

  body('pricingModel')
    .optional()
    .isIn(['FLAT', 'PER_UNIT', 'TIERED'])
    .withMessage('Pricing model must be one of: FLAT, PER_UNIT, TIERED'),

  body('basePrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Base price must be a non-negative number'),

  body('unitPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Unit price must be a non-negative number'),

  body('setupFee')
    .optional()
    .isFloat({ min: 0 }).withMessage('Setup fee must be a non-negative number'),

  body('freeTrialDuration')
    .optional()
    .isInt({ min: 0 }).withMessage('Free trial duration must be a non-negative integer'),

  body('billingInterval')
    .optional()
    .isIn(['MONTHLY', 'ANNUAL'])
    .withMessage('Billing interval must be one of: MONTHLY, ANNUAL'),

  body('features')
    .optional()
    .isArray().withMessage('Features must be an array'),

  body('features.*')
    .optional()
    .isString().withMessage('Feature must be a string')
    .trim(),

  body('status')
    .optional()
    .isIn(['ACTIVE', 'ARCHIVED'])
    .withMessage('Status must be ACTIVE or ARCHIVED'),

  body('maxAgentDiscountPercent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount percent must be between 0 and 100'),
];

export const queryMasterPricingRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('type').optional().isIn(['BASE_PLAN', 'UNIT_ADDON', 'FEATURE_ADDON']).withMessage('Invalid type filter'),
  query('status').optional().isIn(['ACTIVE', 'ARCHIVED']).withMessage('Status filter must be ACTIVE or ARCHIVED'),
  query('search').optional().isString().withMessage('Search query must be a string').trim(),
];

export const getByIdMasterPricingRules = [
  param('id').isMongoId().withMessage('Invalid master pricing plan ID'),
];

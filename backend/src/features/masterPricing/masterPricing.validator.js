import { body, query, param } from 'express-validator';

/**
 * Validation rules for creating a Master Pricing plan.
 */
export const createMasterPricingRules = [
  body('planName')
    .notEmpty()
    .withMessage('Plan name is required')
    .isString()
    .withMessage('Plan name must be a string')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Plan name must be between 2 and 100 characters'),

  body('tier')
    .notEmpty()
    .withMessage('Tier is required')
    .isIn(['TIER_1', 'TIER_2', 'TIER_3', 'ENTERPRISE'])
    .withMessage('Tier must be one of: TIER_1, TIER_2, TIER_3, ENTERPRISE'),

  body('basePrice')
    .notEmpty()
    .withMessage('Base price is required')
    .isFloat({ min: 0 })
    .withMessage('Base price must be a non-negative number'),

  body('perUnitRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Per unit rate must be a non-negative number'),

  body('addOns')
    .optional()
    .isArray()
    .withMessage('Add-ons must be an array'),

  body('addOns.*.key')
    .optional()
    .isString()
    .withMessage('Add-on key must be a string')
    .trim(),

  body('addOns.*.name')
    .optional()
    .isString()
    .withMessage('Add-on name must be a string')
    .trim(),

  body('addOns.*.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Add-on price must be a non-negative number'),

  body('setupFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Setup fee must be a non-negative number'),

  body('maxAgentDiscountPercent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Max agent discount percent must be between 0 and 100'),

  body('taxRatePercent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tax rate percent must be between 0 and 100'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
];

/**
 * Validation rules for updating a Master Pricing plan.
 */
export const updateMasterPricingRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid master pricing plan ID'),

  body('planName')
    .optional()
    .isString()
    .withMessage('Plan name must be a string')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Plan name must be between 2 and 100 characters'),

  body('tier')
    .optional()
    .isIn(['TIER_1', 'TIER_2', 'TIER_3', 'ENTERPRISE'])
    .withMessage('Tier must be one of: TIER_1, TIER_2, TIER_3, ENTERPRISE'),

  body('basePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Base price must be a non-negative number'),

  body('perUnitRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Per unit rate must be a non-negative number'),

  body('addOns')
    .optional()
    .isArray()
    .withMessage('Add-ons must be an array'),

  body('addOns.*.key')
    .optional()
    .isString()
    .withMessage('Add-on key must be a string')
    .trim(),

  body('addOns.*.name')
    .optional()
    .isString()
    .withMessage('Add-on name must be a string')
    .trim(),

  body('addOns.*.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Add-on price must be a non-negative number'),

  body('setupFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Setup fee must be a non-negative number'),

  body('maxAgentDiscountPercent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Max agent discount percent must be between 0 and 100'),

  body('taxRatePercent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tax rate percent must be between 0 and 100'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
];

/**
 * Validation rules for querying master pricing list.
 */
export const queryMasterPricingRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('tier')
    .optional()
    .isIn(['TIER_1', 'TIER_2', 'TIER_3', 'ENTERPRISE'])
    .withMessage('Tier filter must be one of: TIER_1, TIER_2, TIER_3, ENTERPRISE'),

  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive filter must be a boolean'),

  query('search')
    .optional()
    .isString()
    .withMessage('Search query must be a string')
    .trim(),
];

/**
 * Validation rules for ID param based requests.
 */
export const getByIdMasterPricingRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid master pricing plan ID'),
];

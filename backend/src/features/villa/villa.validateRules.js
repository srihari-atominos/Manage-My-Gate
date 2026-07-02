import { body } from 'express-validator';

export const createVillaRules = [
  body('villaNumber')
    .notEmpty()
    .withMessage('Villa number is required')
    .isString()
    .withMessage('Villa number must be a string')
    .trim()
    .isLength({ max: 50 })
    .withMessage('Villa number cannot exceed 50 characters'),
  body('block')
    .optional()
    .isString()
    .withMessage('Block must be a string')
    .trim()
    .isLength({ max: 50 })
    .withMessage('Block cannot exceed 50 characters'),
  body('intercom')
    .optional()
    .isString()
    .withMessage('Intercom must be a string')
    .trim()
    .isLength({ max: 50 })
    .withMessage('Intercom cannot exceed 50 characters'),
  body('configuration')
    .optional()
    .isString()
    .withMessage('Configuration must be a string')
    .trim()
    .isLength({ max: 50 })
    .withMessage('Configuration cannot exceed 50 characters'),
  body('occupancyStatus')
    .optional()
    .isIn(['Vacant', 'Owner Occupied', 'Tenant Occupied'])
    .withMessage('Occupancy status must be one of: Vacant, Owner Occupied, Tenant Occupied'),
];

export const updateVillaRules = [
  body('villaNumber')
    .optional()
    .isString()
    .withMessage('Villa number must be a string')
    .trim()
    .isLength({ max: 50 })
    .withMessage('Villa number cannot exceed 50 characters'),
  body('block')
    .optional()
    .isString()
    .withMessage('Block must be a string')
    .trim()
    .isLength({ max: 50 })
    .withMessage('Block cannot exceed 50 characters'),
  body('intercom')
    .optional()
    .isString()
    .withMessage('Intercom must be a string')
    .trim()
    .isLength({ max: 50 })
    .withMessage('Intercom cannot exceed 50 characters'),
  body('configuration')
    .optional()
    .isString()
    .withMessage('Configuration must be a string')
    .trim()
    .isLength({ max: 50 })
    .withMessage('Configuration cannot exceed 50 characters'),
  body('occupancyStatus')
    .optional()
    .isIn(['Vacant', 'Owner Occupied', 'Tenant Occupied'])
    .withMessage('Occupancy status must be one of: Vacant, Owner Occupied, Tenant Occupied'),
];

export const batchGenerateRules = [
  body('startNumber')
    .notEmpty()
    .withMessage('Start number is required')
    .isInt({ min: 1 })
    .withMessage('Start number must be a positive integer'),
  body('endNumber')
    .notEmpty()
    .withMessage('End number is required')
    .isInt({ min: 1 })
    .withMessage('End number must be a positive integer'),
  body('prefix')
    .optional()
    .isString()
    .withMessage('Prefix must be a string')
    .trim(),
  body('config')
    .optional()
    .isObject()
    .withMessage('Config must be an object'),
];

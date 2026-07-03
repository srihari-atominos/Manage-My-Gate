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

export const bulkUploadVillasRules = [
  body('villas')
    .isArray({ min: 1 })
    .withMessage('villas must be a non-empty array'),
  body('villas.*.villaNumber')
    .notEmpty()
    .withMessage('Villa number is required')
    .isString()
    .trim(),
  body('villas.*.block')
    .optional()
    .isString()
    .trim(),
  body('villas.*.intercom')
    .optional()
    .isString()
    .trim(),
  body('villas.*.configuration')
    .optional()
    .isString()
    .trim(),
  body('villas.*.email')
    .optional()
    .custom((val) => {
      if (val === undefined || val === null || val === '') return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    })
    .withMessage('Please provide a valid email address')
    .trim(),
  body('villas.*.residentType')
    .optional()
    .isIn(['Owner', 'Tenant', 'Family', 'Guest', 'None'])
    .withMessage('Resident type must be one of: Owner, Tenant, Family, Guest, None'),
  body('villas.*.roleName')
    .optional()
    .isString()
    .trim(),
];

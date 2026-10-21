import { body, param, query } from 'express-validator';

export const triggerSosRules = [
  body('alertType')
    .optional()
    .isIn(['Fire', 'Medical', 'Security', 'General'])
    .withMessage('Alert type must be Fire, Medical, Security, or General.'),
  body('unitNumber')
    .optional()
    .isString()
    .trim(),
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a valid coordinate between -90 and 90.'),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a valid coordinate between -180 and 180.'),
  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters.'),
];

export const cancelSosRules = [
  param('id')
    .isMongoId()
    .withMessage('Valid SOS ID is required.'),
];

export const acknowledgeSosRules = [
  param('id')
    .isMongoId()
    .withMessage('Valid SOS ID is required.'),
];

export const resolveSosRules = [
  param('id')
    .isMongoId()
    .withMessage('Valid SOS ID is required.'),
  body('resolutionNotes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 }),
];

export const listSosRules = [
  query('page')
    .optional()
    .isInt({ min: 1 }),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }),
  query('status')
    .optional()
    .isIn(['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'CANCELLED']),
  query('alertType')
    .optional()
    .isIn(['Fire', 'Medical', 'Security', 'General']),
];

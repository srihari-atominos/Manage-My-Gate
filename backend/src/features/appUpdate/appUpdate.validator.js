import { body, param, query } from 'express-validator';
import { RELEASE_TYPES, RELEASE_STATUSES } from './appUpdate.model.js';

export const getPolicyValidator = [
  query('platform')
    .optional()
    .isIn(['android', 'ios'])
    .withMessage('platform must be android or ios'),
  query('applicationId')
    .optional()
    .isString()
    .trim(),
  query('version')
    .optional()
    .isString()
    .trim(),
  query('versionCode')
    .optional()
    .isInt({ min: 1 })
    .withMessage('versionCode must be a positive integer'),
];

export const createReleaseValidator = [
  body('platform')
    .optional()
    .isIn(['android', 'ios'])
    .withMessage('platform must be android or ios'),
  body('applicationId')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 100 }),
  body('version')
    .isString()
    .trim()
    .matches(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/)
    .withMessage('version must be a valid semantic version string (e.g., 1.2.0)'),
  body('versionCode')
    .isInt({ min: 1 })
    .withMessage('versionCode must be a positive integer (e.g., 31)'),
  body('releaseType')
    .isIn(Object.values(RELEASE_TYPES))
    .withMessage(`releaseType must be one of: ${Object.values(RELEASE_TYPES).join(', ')}`),
  body('gracePeriodDays')
    .optional()
    .isInt({ min: 0 })
    .withMessage('gracePeriodDays must be a non-negative integer'),
  body('minSupportedVersion')
    .optional({ nullable: true })
    .isString()
    .trim(),
  body('minSupportedVersionCode')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('minSupportedVersionCode must be a positive integer'),
  body('releaseNotes')
    .optional()
    .custom((val) => Array.isArray(val) || typeof val === 'string')
    .withMessage('releaseNotes must be an array of strings or a single string'),
  body('storeUrl')
    .optional()
    .isString()
    .trim(),
];

export const updateReleaseValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid release ID format'),
  body('version')
    .optional()
    .isString()
    .trim()
    .matches(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/)
    .withMessage('version must be a valid semantic version string (e.g., 1.2.0)'),
  body('releaseType')
    .optional()
    .isIn(Object.values(RELEASE_TYPES))
    .withMessage(`releaseType must be one of: ${Object.values(RELEASE_TYPES).join(', ')}`),
  body('gracePeriodDays')
    .optional()
    .isInt({ min: 0 })
    .withMessage('gracePeriodDays must be a non-negative integer'),
  body('minSupportedVersion')
    .optional({ nullable: true })
    .isString()
    .trim(),
  body('minSupportedVersionCode')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('minSupportedVersionCode must be a positive integer'),
  body('releaseNotes')
    .optional()
    .custom((val) => Array.isArray(val) || typeof val === 'string')
    .withMessage('releaseNotes must be an array of strings or a single string'),
  body('storeUrl')
    .optional()
    .isString()
    .trim(),
];

export const publishReleaseValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid release ID format'),
  body('effectiveAt')
    .optional()
    .isISO8601()
    .withMessage('effectiveAt must be a valid ISO 8601 date string'),
];

export const announceReleaseValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid release ID format'),
  body('force')
    .optional()
    .isBoolean()
    .withMessage('force must be a boolean'),
];

export const listReleasesValidator = [
  query('platform')
    .optional()
    .isIn(['android', 'ios']),
  query('status')
    .optional()
    .isIn(Object.values(RELEASE_STATUSES)),
  query('page')
    .optional()
    .isInt({ min: 1 }),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }),
];

export const getByIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid release ID format'),
];

export default {
  getPolicyValidator,
  createReleaseValidator,
  updateReleaseValidator,
  publishReleaseValidator,
  announceReleaseValidator,
  listReleasesValidator,
  getByIdValidator,
};

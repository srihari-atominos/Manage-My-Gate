import { body } from 'express-validator';

export const createPassRules = [
  body('orgId')
    .notEmpty()
    .withMessage('Organization ID (orgId) is required')
    .isMongoId()
    .withMessage('Organization ID must be a valid Mongo ID'),

  body('createdById')
    .notEmpty()
    .withMessage('Creator ID (createdById) is required')
    .isMongoId()
    .withMessage('Creator ID must be a valid Mongo ID'),

  body('passType')
    .notEmpty()
    .withMessage('Pass type is required')
    .isIn(['GUEST', 'DELIVERY', 'CAB', 'SERVICE', 'ADMIN_GUEST'])
    .withMessage('Pass type must be GUEST, DELIVERY, CAB, SERVICE, or ADMIN_GUEST'),

  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be a boolean'),

  body('visitorDetails.name')
    .optional()
    .isString()
    .withMessage('Visitor name must be a string')
    .trim(),

  body('visitorDetails.phone')
    .optional()
    .isString()
    .withMessage('Visitor phone must be a string')
    .trim(),

  body('visitorDetails.idProofType')
    .optional()
    .isString()
    .withMessage('ID proof type must be a string')
    .trim(),

  body('visitorDetails.idProofNumber')
    .optional()
    .isString()
    .withMessage('ID proof number must be a string')
    .trim(),

  body('vehicleDetails.vendor')
    .optional()
    .isString()
    .withMessage('Vehicle vendor must be a string')
    .trim(),

  body('vehicleDetails.number')
    .optional()
    .isString()
    .withMessage('Vehicle number must be a string')
    .trim()
    .toUpperCase(),

  body('validity.startDate')
    .notEmpty()
    .withMessage('Validity start date is required')
    .isISO8601()
    .withMessage('Validity start date must be a valid ISO8601 date'),

  body('validity.endDate')
    .notEmpty()
    .withMessage('Validity end date is required')
    .isISO8601()
    .withMessage('Validity end date must be a valid ISO8601 date'),

  body('validity.timeWindowStart')
    .optional()
    .matches(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Validity timeWindowStart must be in HH:mm format (24-hour)'),

  body('validity.timeWindowEnd')
    .optional()
    .matches(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Validity timeWindowEnd must be in HH:mm format (24-hour)'),

  body('validity.allowedDays')
    .optional()
    .isArray()
    .withMessage('Validity allowedDays must be an array of numbers representing days of the week'),

  body('validity.allowedDays.*')
    .optional()
    .isInt({ min: 0, max: 6 })
    .withMessage('allowedDays elements must be integers between 0 (Sunday) and 6 (Saturday)'),

  body('usageLimit.maxUses')
    .optional()
    .isInt({ min: 1 })
    .withMessage('usageLimit.maxUses must be an integer of at least 1')
];

export const updatePassStatusRules = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['PENDING', 'ACTIVE', 'REVOKED', 'EXPIRED'])
    .withMessage('Status must be PENDING, ACTIVE, REVOKED, or EXPIRED')
];

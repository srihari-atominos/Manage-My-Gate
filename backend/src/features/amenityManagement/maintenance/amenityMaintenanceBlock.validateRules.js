import { body, param, query } from 'express-validator';

export const scheduleMaintenanceRules = [
  body('facilityId').notEmpty().withMessage('facilityId is required').isMongoId().withMessage('Invalid facilityId'),
  body('resourceId').optional().isMongoId().withMessage('Invalid resourceId'),
  body('startDateTime').notEmpty().withMessage('startDateTime is required').isISO8601().withMessage('startDateTime must be valid ISO8601'),
  body('endDateTime').notEmpty().withMessage('endDateTime is required').isISO8601().withMessage('endDateTime must be valid ISO8601'),
  body('isCompleteClosure').optional().isBoolean().withMessage('isCompleteClosure must be a boolean'),
  body('degradedCapacity').optional().isInt({ min: 0 }).withMessage('degradedCapacity must be >= 0'),
  body('reason').notEmpty().withMessage('reason is required').isString().trim(),
];

export const updateMaintenanceStatusRules = [
  param('blockId').notEmpty().withMessage('blockId parameter is required').isMongoId().withMessage('Invalid blockId'),
  body('status')
    .notEmpty()
    .withMessage('status is required')
    .isIn(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
    .withMessage('Invalid maintenance status'),
];

export const blockIdParamRules = [
  param('blockId').notEmpty().withMessage('blockId parameter is required').isMongoId().withMessage('Invalid blockId'),
];

export const overlappingMaintenanceRules = [
  query('facilityId').notEmpty().withMessage('facilityId is required').isMongoId().withMessage('Invalid facilityId'),
  query('resourceId').optional().isMongoId().withMessage('Invalid resourceId'),
  query('startDateTime').notEmpty().withMessage('startDateTime is required').isISO8601().withMessage('startDateTime must be valid ISO8601'),
  query('endDateTime').notEmpty().withMessage('endDateTime is required').isISO8601().withMessage('endDateTime must be valid ISO8601'),
];

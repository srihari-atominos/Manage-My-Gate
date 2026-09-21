import { body, param, query } from 'express-validator';

export const scheduleMaintenanceRules = [
  body('facilityId').notEmpty().withMessage('facilityId is required').isMongoId().withMessage('Invalid facilityId'),
  body('resourceId').optional({ nullable: true }).isMongoId().withMessage('Invalid resourceId'),
  body('resourceIds').optional().isArray().withMessage('resourceIds must be an array'),
  body('resourceIds.*').optional().isMongoId().withMessage('Each resourceId must be a valid MongoId'),
  body('title').notEmpty().withMessage('title is required').isString().trim(),
  body('maintenanceType')
    .optional()
    .isIn(['CLEANING', 'REPAIR', 'INSPECTION', 'UPGRADE', 'PREVENTIVE', 'OTHER'])
    .withMessage('Invalid maintenanceType'),
  body('internalNotes').optional().isString(),
  body('bufferBeforeMinutes').optional().isInt({ min: 0 }).withMessage('bufferBeforeMinutes must be >= 0'),
  body('bufferAfterMinutes').optional().isInt({ min: 0 }).withMessage('bufferAfterMinutes must be >= 0'),
  body('startDateTime').notEmpty().withMessage('startDateTime is required').isISO8601().withMessage('startDateTime must be valid ISO8601'),
  body('endDateTime').notEmpty().withMessage('endDateTime is required').isISO8601().withMessage('endDateTime must be valid ISO8601'),
  body('isCompleteClosure').optional().isBoolean().withMessage('isCompleteClosure must be a boolean'),
  body('degradedCapacity').optional().isInt({ min: 0 }).withMessage('degradedCapacity must be >= 0'),
  body('reason').notEmpty().withMessage('reason is required').isString().trim(),
  body('conflictAction').optional().isIn(['CANCEL_AND_PROCEED']).withMessage('Invalid conflictAction'),
  body('resolutions').optional().isArray().withMessage('resolutions must be an array'),
  body('resolutions.*.targetId').optional().isMongoId().withMessage('Each targetId must be a valid MongoId'),
  body('resolutions.*.resolution').optional().isIn(['CANCEL', 'RESCHEDULE', 'REVIEW_INDIVIDUALLY']).withMessage('Invalid resolution action'),
];

export const impactPreviewRules = [
  body('facilityId').notEmpty().withMessage('facilityId is required').isMongoId().withMessage('Invalid facilityId'),
  body('resourceId').optional({ nullable: true }).isMongoId().withMessage('Invalid resourceId'),
  body('resourceIds').optional().isArray().withMessage('resourceIds must be an array'),
  body('resourceIds.*').optional().isMongoId().withMessage('Each resourceId must be a valid MongoId'),
  body('startDateTime').notEmpty().withMessage('startDateTime is required').isISO8601().withMessage('startDateTime must be valid ISO8601'),
  body('endDateTime').notEmpty().withMessage('endDateTime is required').isISO8601().withMessage('endDateTime must be valid ISO8601'),
  body('bufferBeforeMinutes').optional().isInt({ min: 0 }).withMessage('bufferBeforeMinutes must be >= 0'),
  body('bufferAfterMinutes').optional().isInt({ min: 0 }).withMessage('bufferAfterMinutes must be >= 0'),
];

export const resolveImpactRules = [
  param('blockId').notEmpty().withMessage('blockId parameter is required').isMongoId().withMessage('Invalid blockId'),
  body('resolutions').notEmpty().withMessage('resolutions is required').isArray({ min: 1 }).withMessage('resolutions must be a non-empty array'),
  body('resolutions.*.targetId').notEmpty().withMessage('targetId is required').isMongoId().withMessage('Invalid targetId MongoId'),
  body('resolutions.*.resolution')
    .notEmpty()
    .withMessage('resolution is required')
    .isIn(['CANCEL', 'RESCHEDULE', 'REVIEW_INDIVIDUALLY'])
    .withMessage('Invalid resolution: must be CANCEL, RESCHEDULE, or REVIEW_INDIVIDUALLY'),
  body('resolutions.*.targetType')
    .optional()
    .isIn(['V1_BOOKING', 'V2_RESERVATION'])
    .withMessage('Invalid targetType: must be V1_BOOKING or V2_RESERVATION'),
];

export const findAlternativeRules = [
  body('facilityId').notEmpty().withMessage('facilityId is required').isMongoId().withMessage('Invalid facilityId'),
  body('resourceId').optional({ nullable: true }).isMongoId().withMessage('Invalid resourceId'),
  body('originalStart').notEmpty().withMessage('originalStart is required').isISO8601().withMessage('originalStart must be valid ISO8601'),
  body('originalEnd').notEmpty().withMessage('originalEnd is required').isISO8601().withMessage('originalEnd must be valid ISO8601'),
  body('searchDaysAhead').optional().isInt({ min: 1, max: 30 }).withMessage('searchDaysAhead must be between 1 and 30'),
];

export const updateMaintenanceStatusRules = [
  param('blockId').notEmpty().withMessage('blockId parameter is required').isMongoId().withMessage('Invalid blockId'),
  body('status')
    .notEmpty()
    .withMessage('status is required')
    .isIn(['SCHEDULED', 'IN_PROGRESS', 'ACTIVE', 'COMPLETED', 'CANCELLED'])
    .withMessage('Invalid maintenance status'),
  body('completedBy').optional({ nullable: true }).isMongoId().withMessage('Invalid completedBy ID'),
  body('actualCompletedAt').optional().isISO8601().withMessage('actualCompletedAt must be valid ISO8601'),
  body('completionNotes').optional().isString(),
];

export const blockIdParamRules = [
  param('blockId').notEmpty().withMessage('blockId parameter is required').isMongoId().withMessage('Invalid blockId'),
];

export const overlappingMaintenanceRules = [
  query('facilityId').notEmpty().withMessage('facilityId is required').isMongoId().withMessage('Invalid facilityId'),
  query('resourceId').optional({ nullable: true }).isMongoId().withMessage('Invalid resourceId'),
  query('startDateTime').notEmpty().withMessage('startDateTime is required').isISO8601().withMessage('startDateTime must be valid ISO8601'),
  query('endDateTime').notEmpty().withMessage('endDateTime is required').isISO8601().withMessage('endDateTime must be valid ISO8601'),
];

export const extendMaintenanceRules = [
  param('blockId').notEmpty().withMessage('blockId parameter is required').isMongoId().withMessage('Invalid blockId'),
  body('newEndDateTime').notEmpty().withMessage('newEndDateTime is required').isISO8601().withMessage('newEndDateTime must be valid ISO8601'),
  body('conflictAction').optional().isIn(['CANCEL_AND_PROCEED']).withMessage('Invalid conflictAction'),
  body('resolutions').optional().isArray().withMessage('resolutions must be an array'),
  body('resolutions.*.targetId').optional().isMongoId().withMessage('Each targetId must be a valid MongoId'),
  body('resolutions.*.resolution').optional().isIn(['CANCEL', 'RESCHEDULE', 'REVIEW_INDIVIDUALLY']).withMessage('Invalid resolution action'),
];

export const previewRecurringRules = [
  body('facilityId').notEmpty().withMessage('facilityId is required').isMongoId().withMessage('Invalid facilityId'),
  body('resourceId').optional({ nullable: true }).isMongoId().withMessage('Invalid resourceId'),
  body('resourceIds').optional().isArray().withMessage('resourceIds must be an array'),
  body('resourceIds.*').optional().isMongoId().withMessage('Each resourceId must be a valid MongoId'),
  body('startDateTime').notEmpty().withMessage('startDateTime is required').isISO8601().withMessage('startDateTime must be valid ISO8601'),
  body('endDateTime').notEmpty().withMessage('endDateTime is required').isISO8601().withMessage('endDateTime must be valid ISO8601'),
  body('bufferBeforeMinutes').optional().isInt({ min: 0 }).withMessage('bufferBeforeMinutes must be >= 0'),
  body('bufferAfterMinutes').optional().isInt({ min: 0 }).withMessage('bufferAfterMinutes must be >= 0'),
  body('recurrence').notEmpty().withMessage('recurrence configuration is required').isObject().withMessage('recurrence must be an object'),
  body('recurrence.frequency')
    .notEmpty()
    .withMessage('recurrence.frequency is required')
    .isIn(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM'])
    .withMessage('Invalid recurrence frequency'),
  body('recurrence.interval').optional().isInt({ min: 1 }).withMessage('recurrence.interval must be >= 1'),
  body('recurrence.daysOfWeek').optional().isArray().withMessage('recurrence.daysOfWeek must be an array'),
  body('recurrence.daysOfWeek.*').optional().isInt({ min: 0, max: 6 }).withMessage('daysOfWeek elements must be integers from 0 to 6'),
  body('recurrence.dayOfMonth').optional().isInt({ min: 1, max: 31 }).withMessage('dayOfMonth must be between 1 and 31'),
  body('recurrence.startDate').optional().isISO8601().withMessage('recurrence.startDate must be valid ISO8601'),
  body('recurrence.endDate').optional().isISO8601().withMessage('recurrence.endDate must be valid ISO8601'),
  body('recurrence.occurrenceCount').optional().isInt({ min: 1, max: 60 }).withMessage('recurrence.occurrenceCount must be between 1 and 60'),
  body('recurrence.timezone').optional().isString().withMessage('recurrence.timezone must be a string'),
];

export const scheduleRecurringRules = [
  body('facilityId').notEmpty().withMessage('facilityId is required').isMongoId().withMessage('Invalid facilityId'),
  body('resourceId').optional({ nullable: true }).isMongoId().withMessage('Invalid resourceId'),
  body('resourceIds').optional().isArray().withMessage('resourceIds must be an array'),
  body('resourceIds.*').optional().isMongoId().withMessage('Each resourceId must be a valid MongoId'),
  body('title').notEmpty().withMessage('title is required').isString().trim(),
  body('reason').notEmpty().withMessage('reason is required').isString().trim(),
  body('maintenanceType')
    .optional()
    .isIn(['CLEANING', 'REPAIR', 'INSPECTION', 'UPGRADE', 'PREVENTIVE', 'OTHER'])
    .withMessage('Invalid maintenanceType'),
  body('internalNotes').optional().isString(),
  body('bufferBeforeMinutes').optional().isInt({ min: 0 }).withMessage('bufferBeforeMinutes must be >= 0'),
  body('bufferAfterMinutes').optional().isInt({ min: 0 }).withMessage('bufferAfterMinutes must be >= 0'),
  body('startDateTime').notEmpty().withMessage('startDateTime is required').isISO8601().withMessage('startDateTime must be valid ISO8601'),
  body('endDateTime').notEmpty().withMessage('endDateTime is required').isISO8601().withMessage('endDateTime must be valid ISO8601'),
  body('isCompleteClosure').optional().isBoolean().withMessage('isCompleteClosure must be a boolean'),
  body('degradedCapacity').optional().isInt({ min: 0 }).withMessage('degradedCapacity must be >= 0'),
  body('recurrence').notEmpty().withMessage('recurrence configuration is required').isObject().withMessage('recurrence must be an object'),
  body('recurrence.frequency')
    .notEmpty()
    .withMessage('recurrence.frequency is required')
    .isIn(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM'])
    .withMessage('Invalid recurrence frequency'),
  body('recurrence.interval').optional().isInt({ min: 1 }).withMessage('recurrence.interval must be >= 1'),
  body('recurrence.daysOfWeek').optional().isArray().withMessage('recurrence.daysOfWeek must be an array'),
  body('recurrence.daysOfWeek.*').optional().isInt({ min: 0, max: 6 }).withMessage('daysOfWeek elements must be integers from 0 to 6'),
  body('recurrence.dayOfMonth').optional().isInt({ min: 1, max: 31 }).withMessage('dayOfMonth must be between 1 and 31'),
  body('recurrence.startDate').optional().isISO8601().withMessage('recurrence.startDate must be valid ISO8601'),
  body('recurrence.endDate').optional().isISO8601().withMessage('recurrence.endDate must be valid ISO8601'),
  body('recurrence.occurrenceCount').optional().isInt({ min: 1, max: 60 }).withMessage('recurrence.occurrenceCount must be between 1 and 60'),
  body('recurrence.timezone').optional().isString().withMessage('recurrence.timezone must be a string'),
  body('conflictAction').optional().isIn(['CANCEL_AND_PROCEED']).withMessage('Invalid conflictAction'),
  body('resolutions').optional().isArray().withMessage('resolutions must be an array'),
  body('resolutions.*.targetId').optional().isMongoId().withMessage('Each targetId must be a valid MongoId'),
  body('resolutions.*.resolution').optional().isIn(['CANCEL', 'RESCHEDULE', 'REVIEW_INDIVIDUALLY']).withMessage('Invalid resolution action'),
  body('impactResolutions').optional().isArray().withMessage('impactResolutions must be an array'),
  body('impactResolutions.*.targetId').optional().isMongoId().withMessage('Each targetId must be a valid MongoId'),
  body('impactResolutions.*.resolution').optional().isIn(['CANCEL', 'RESCHEDULE', 'REVIEW_INDIVIDUALLY']).withMessage('Invalid resolution action'),
];

export const seriesIdParamRules = [
  param('seriesId').notEmpty().withMessage('seriesId parameter is required').isMongoId().withMessage('Invalid seriesId'),
];

export const declareEmergencyRules = [
  body('facilityId').notEmpty().withMessage('facilityId is required').isMongoId().withMessage('Invalid facilityId'),
  body('resourceId').optional({ nullable: true }).isMongoId().withMessage('Invalid resourceId'),
  body('resourceIds').optional().isArray().withMessage('resourceIds must be an array'),
  body('resourceIds.*').optional().isMongoId().withMessage('Each resourceId must be a valid MongoId'),
  body('title').notEmpty().withMessage('title is required').isString().trim(),
  body('reason').notEmpty().withMessage('reason is required').isString().trim(),
  body('maintenanceType')
    .optional()
    .isIn(['CLEANING', 'REPAIR', 'INSPECTION', 'UPGRADE', 'PREVENTIVE', 'OTHER'])
    .withMessage('Invalid maintenanceType'),
  body('internalNotes').optional().isString(),
  body('bufferAfterMinutes').optional().isInt({ min: 0 }).withMessage('bufferAfterMinutes must be >= 0'),
  body('endDateTime')
    .notEmpty()
    .withMessage('endDateTime is required')
    .isISO8601()
    .withMessage('endDateTime must be valid ISO8601')
    .custom((value) => {
      const end = new Date(value);
      if (isNaN(end.getTime()) || end <= new Date()) {
        throw new Error('endDateTime must be strictly in the future');
      }
      return true;
    }),
  body('conflictAction')
    .optional()
    .isIn(['CANCEL_AND_PROCEED', 'REVIEW_ALL'])
    .withMessage('Invalid conflictAction'),
  body('resolutions').optional().isArray().withMessage('resolutions must be an array'),
  body('resolutions.*.targetId').optional().isMongoId().withMessage('Each targetId must be a valid MongoId'),
  body('resolutions.*.resolution')
    .optional()
    .isIn(['CANCEL', 'RESCHEDULE', 'REVIEW_INDIVIDUALLY'])
    .withMessage('Invalid resolution action'),
];


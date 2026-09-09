import { body, param, query } from 'express-validator';

export const createFacilityRules = [
  body('name').notEmpty().withMessage('Facility name is required').isString().trim(),
  body('code').notEmpty().withMessage('Facility code is required').isString().trim(),
  body('archetype')
    .notEmpty()
    .withMessage('Archetype is required')
    .isIn(['SHARED_CAPACITY', 'EXCLUSIVE_HOURLY', 'EVENT_SPACE', 'ROOM_RESOURCE', 'INVENTORY_TOOLS'])
    .withMessage('Invalid facility archetype'),
  body('description').optional().isString().trim(),
  body('location').optional().isString().trim(),
  body('images').optional().isArray().withMessage('Images must be an array of strings'),
  body('images.*').optional().isString().withMessage('Image item must be a string'),
  body('openDays').optional().isArray().withMessage('openDays must be an array of numbers (0-6)'),
  body('openDays.*').optional().isInt({ min: 0, max: 6 }).withMessage('Each open day must be 0-6'),
  body('operatingHours.openTime')
    .optional()
    .matches(/^([01]\d|2[0-3]):?([0-5]\d)$/)
    .withMessage('Invalid operating open time format (HH:MM)'),
  body('operatingHours.closeTime')
    .optional()
    .matches(/^([01]\d|2[0-3]):?([0-5]\d)$/)
    .withMessage('Invalid operating close time format (HH:MM)'),
  body('minNoticeHours').optional().isInt({ min: 0 }).withMessage('minNoticeHours must be a non-negative integer'),
  body('maxAdvanceBookingDays')
    .optional()
    .isInt({ min: 0 })
    .withMessage('maxAdvanceBookingDays must be a non-negative integer'),
  body('maxCapacity').optional().isInt({ min: 1 }).withMessage('maxCapacity must be at least 1'),
  body('isMultiResourceFacility').optional().isBoolean().withMessage('isMultiResourceFacility must be a boolean'),
  body('pricingConfig.pricingType')
    .optional()
    .isIn(['FREE', 'HOURLY', 'DAILY', 'FIXED_EVENT', 'TIERED'])
    .withMessage('Invalid pricingType'),
  body('pricingConfig.baseRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('baseRate must be a non-negative number'),
  body('pricingConfig.taxPercentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('taxPercentage must be between 0 and 100'),
  body('pricingConfig.securityDeposit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('securityDeposit must be a non-negative number'),
  body('pricingConfig.currency').optional().isString().isLength({ min: 3, max: 3 }).withMessage('currency must be 3-letter code'),
  body('requiresApproval').optional().isBoolean().withMessage('requiresApproval must be a boolean'),
  body('approvalWorkflow.requireAdminApproval')
    .optional()
    .isBoolean()
    .withMessage('requireAdminApproval must be a boolean'),
  body('approvalWorkflow.approvalTimeoutHours')
    .optional()
    .isInt({ min: 1 })
    .withMessage('approvalTimeoutHours must be at least 1'),
  body('approvalWorkflow.depositRequired')
    .optional()
    .isBoolean()
    .withMessage('depositRequired must be a boolean'),
  body('cancellationPolicy.allowCancellation')
    .optional()
    .isBoolean()
    .withMessage('allowCancellation must be a boolean'),
  body('cancellationPolicy.freeCancellationHours')
    .optional()
    .isInt({ min: 0 })
    .withMessage('freeCancellationHours must be non-negative'),
  body('cancellationPolicy.cancellationFeePercentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('cancellationFeePercentage must be between 0 and 100'),
];

export const updateFacilityRules = [
  body('name').optional().notEmpty().withMessage('Facility name cannot be empty').isString().trim(),
  body('code').optional().notEmpty().withMessage('Facility code cannot be empty').isString().trim(),
  body('archetype')
    .optional()
    .isIn(['SHARED_CAPACITY', 'EXCLUSIVE_HOURLY', 'EVENT_SPACE', 'ROOM_RESOURCE', 'INVENTORY_TOOLS'])
    .withMessage('Invalid facility archetype'),
  body('description').optional().isString().trim(),
  body('location').optional().isString().trim(),
  body('images').optional().isArray().withMessage('Images must be an array of strings'),
  body('openDays').optional().isArray().withMessage('openDays must be an array of numbers (0-6)'),
  body('operatingHours.openTime')
    .optional()
    .matches(/^([01]\d|2[0-3]):?([0-5]\d)$/)
    .withMessage('Invalid operating open time format (HH:MM)'),
  body('operatingHours.closeTime')
    .optional()
    .matches(/^([01]\d|2[0-3]):?([0-5]\d)$/)
    .withMessage('Invalid operating close time format (HH:MM)'),
  body('minNoticeHours').optional().isInt({ min: 0 }).withMessage('minNoticeHours must be a non-negative integer'),
  body('maxAdvanceBookingDays')
    .optional()
    .isInt({ min: 0 })
    .withMessage('maxAdvanceBookingDays must be a non-negative integer'),
  body('maxCapacity').optional().isInt({ min: 1 }).withMessage('maxCapacity must be at least 1'),
  body('isMultiResourceFacility').optional().isBoolean().withMessage('isMultiResourceFacility must be a boolean'),
  body('requiresApproval').optional().isBoolean().withMessage('requiresApproval must be a boolean'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

export const facilityIdParamRules = [
  param('facilityId').notEmpty().withMessage('Facility ID parameter is required').isMongoId().withMessage('Invalid Facility ID'),
];

export const facilityCodeParamRules = [
  param('code').notEmpty().withMessage('Facility code parameter is required').isString().trim(),
];

export const listFacilitiesRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be an integer >= 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().trim(),
  query('archetype')
    .optional()
    .isIn(['SHARED_CAPACITY', 'EXCLUSIVE_HOURLY', 'EVENT_SPACE', 'ROOM_RESOURCE', 'INVENTORY_TOOLS'])
    .withMessage('Invalid archetype filter'),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

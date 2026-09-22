import { body, param, query } from 'express-validator';

export const createResourceRules = [
  body('facilityId').notEmpty().withMessage('facilityId is required').isMongoId().withMessage('Invalid facilityId'),
  body('name').notEmpty().withMessage('Resource name is required').isString().trim(),
  body('identifier').optional().isString().trim(),
  body('code').optional().isString().trim(),
  body('resourceType')
    .optional()
    .isIn(['COURT', 'ROOM', 'EQUIPMENT', 'SEAT', 'LANE', 'ZONE', 'OTHER'])
    .withMessage('Invalid resourceType'),
  body('isSerializedAsset').optional().isBoolean().withMessage('isSerializedAsset must be a boolean'),
  body('serialNumber').optional().isString().trim(),
  body('totalBulkStock').optional().isInt({ min: 0 }).withMessage('totalBulkStock must be non-negative integer'),
  body('setupBufferMinutes').optional().isInt({ min: 0 }).withMessage('setupBufferMinutes must be non-negative'),
  body('teardownBufferMinutes').optional().isInt({ min: 0 }).withMessage('teardownBufferMinutes must be non-negative'),
  body('slotDurationMinutes').optional().isInt({ min: 1 }).withMessage('slotDurationMinutes must be at least 1'),
  body('pricingOverride.baseRate').optional().isFloat({ min: 0 }).withMessage('pricingOverride.baseRate must be non-negative'),
];

export const updateResourceRules = [
  body('name').optional().notEmpty().withMessage('Resource name cannot be empty').isString().trim(),
  body('code').optional().isString().trim(),
  body('resourceType')
    .optional()
    .isIn(['COURT', 'ROOM', 'EQUIPMENT', 'SEAT', 'LANE', 'ZONE', 'OTHER'])
    .withMessage('Invalid resourceType'),
  body('isSerializedAsset').optional().isBoolean().withMessage('isSerializedAsset must be a boolean'),
  body('serialNumber').optional().isString().trim(),
  body('totalBulkStock').optional().isInt({ min: 0 }).withMessage('totalBulkStock must be non-negative integer'),
  body('setupBufferMinutes').optional().isInt({ min: 0 }).withMessage('setupBufferMinutes must be non-negative'),
  body('teardownBufferMinutes').optional().isInt({ min: 0 }).withMessage('teardownBufferMinutes must be non-negative'),
  body('slotDurationMinutes').optional().isInt({ min: 1 }).withMessage('slotDurationMinutes must be at least 1'),
  body('assetState')
    .optional()
    .isIn(['AVAILABLE', 'CHECKED_OUT', 'INSPECTION_PENDING', 'MAINTENANCE'])
    .withMessage('Invalid assetState'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

export const resourceIdParamRules = [
  param('resourceId').notEmpty().withMessage('resourceId parameter is required').isMongoId().withMessage('Invalid resourceId'),
];

export const resourceFacilityIdParamRules = [
  param('facilityId').notEmpty().withMessage('facilityId parameter is required').isMongoId().withMessage('Invalid facilityId'),
];

export const listResourcesRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be an integer >= 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('facilityId').optional().isMongoId().withMessage('Invalid facilityId filter'),
  query('resourceType')
    .optional()
    .isIn(['COURT', 'ROOM', 'EQUIPMENT', 'SEAT', 'LANE', 'ZONE', 'OTHER'])
    .withMessage('Invalid resourceType filter'),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

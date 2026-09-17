import { query } from 'express-validator';

export const checkAvailabilityRules = [
  query('facilityId').notEmpty().withMessage('facilityId query parameter is required').isMongoId().withMessage('Invalid facilityId'),
  query('resourceId').optional().isMongoId().withMessage('Invalid resourceId'),
  query('startDateTime').notEmpty().withMessage('startDateTime is required').isISO8601().withMessage('startDateTime must be valid ISO8601 date'),
  query('endDateTime').notEmpty().withMessage('endDateTime is required').isISO8601().withMessage('endDateTime must be valid ISO8601 date'),
  query('requestedQuantity').optional().isInt({ min: 1 }).withMessage('requestedQuantity must be at least 1'),
];

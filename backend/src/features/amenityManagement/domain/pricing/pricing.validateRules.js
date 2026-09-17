import { body } from 'express-validator';

export const calculatePricingRules = [
  body('facilityId').notEmpty().withMessage('facilityId is required').isMongoId().withMessage('Invalid facilityId'),
  body('startDateTime').notEmpty().withMessage('startDateTime is required').isISO8601().withMessage('startDateTime must be valid ISO8601 date'),
  body('endDateTime').notEmpty().withMessage('endDateTime is required').isISO8601().withMessage('endDateTime must be valid ISO8601 date'),
  body('headcount').optional().isInt({ min: 1 }).withMessage('headcount must be at least 1'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('quantity must be at least 1'),
];

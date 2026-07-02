import { body } from 'express-validator';

export const createAmenityRules = [
  body('name').notEmpty().withMessage('Amenity name is required').trim(),
  body('location').notEmpty().withMessage('Amenity location is required').trim(),
  body('category').isIn(['Event Space', 'Fitness', 'Sports', 'Workspace', 'Wellness']).withMessage('Invalid category'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be a positive integer'),
  body('ratePerHour').optional().isNumeric({ min: 0 }).withMessage('Rate per hour cannot be negative'),
  body('operatingHours.start').matches(/^([01]\d|2[0-3]):?([0-5]\d)$/).withMessage('Invalid start time format (HH:MM)'),
  body('operatingHours.end').matches(/^([01]\d|2[0-3]):?([0-5]\d)$/).withMessage('Invalid end time format (HH:MM)'),
  body('openDays').isArray().withMessage('Open days must be an array'),
  body('openDays.*').isInt({ min: 0, max: 6 }).withMessage('Days must be between 0 and 6'),
  body('imageUrl').optional().isString(),
  body('status').optional().isIn(['Active', 'Inactive', 'Maintenance']).withMessage('Invalid status'),
  body('orgId').notEmpty().withMessage('Organization ID is required').isMongoId().withMessage('Invalid Organization ID')
];

export const updateAmenityRules = [
  body('name').optional().notEmpty().withMessage('Amenity name cannot be empty').trim(),
  body('location').optional().notEmpty().withMessage('Amenity location cannot be empty').trim(),
  body('category').optional().isIn(['Event Space', 'Fitness', 'Sports', 'Workspace', 'Wellness']).withMessage('Invalid category'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be a positive integer'),
  body('ratePerHour').optional().isNumeric({ min: 0 }).withMessage('Rate per hour cannot be negative'),
  body('operatingHours.start').optional().matches(/^([01]\d|2[0-3]):?([0-5]\d)$/).withMessage('Invalid start time format (HH:MM)'),
  body('operatingHours.end').optional().matches(/^([01]\d|2[0-3]):?([0-5]\d)$/).withMessage('Invalid end time format (HH:MM)'),
  body('openDays').optional().isArray().withMessage('Open days must be an array'),
  body('openDays.*').optional().isInt({ min: 0, max: 6 }).withMessage('Days must be between 0 and 6'),
  body('imageUrl').optional().isString(),
  body('status').optional().isIn(['Active', 'Inactive', 'Maintenance']).withMessage('Invalid status'),
  body('isDeleted').optional().isBoolean()
];

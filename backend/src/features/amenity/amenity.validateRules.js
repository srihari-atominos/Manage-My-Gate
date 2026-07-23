import { body } from 'express-validator';

export const createAmenityRules = [
  body('name').notEmpty().withMessage('Amenity name is required').trim(),
  body('description').optional().isString().trim(),
  body('type').isIn(['clubhouse', 'pool', 'gym', 'court', 'hall', 'other', 'Event Space', 'Fitness', 'Sports', 'Workspace', 'Wellness']).withMessage('Invalid amenity type'),
  body('images').optional().isArray().withMessage('Images must be an array of strings'),
  body('images.*').optional().isString().withMessage('Image URL must be a string'),
  body('location').optional().isString().trim(),
  body('ratePerHour').optional().isNumeric().withMessage('Rate must be a number'),
  body('openDays').optional().isArray().withMessage('openDays must be an array of integers'),
  body('openDays.*').optional().isInt({ min: 0, max: 6 }).withMessage('openDays must be 0-6'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be a positive integer'),
  body('pricing.securityDepositDescription').optional({ checkFalsy: true }).isString().trim(),
  body('bookingRules.slotDurationMinutes').custom((value, { req }) => {
    if (req.body.pricing?.pricingType !== 'daily') {
      if (!value || parseInt(value, 10) < 15) {
        throw new Error('Slot duration must be at least 15 mins for slot-based amenities');
      }
    }
    return true;
  }),
  body('bookingRules.openTime').matches(/^([01]\d|2[0-3]):?([0-5]\d)$/).withMessage('Invalid open time format (HH:MM)'),
  body('bookingRules.closeTime').matches(/^([01]\d|2[0-3]):?([0-5]\d)$/).withMessage('Invalid close time format (HH:MM)'),
  body('maxBookingsPerUserPerSlot').custom((value, { req }) => {
    if (req.body.pricing?.pricingType !== 'daily') {
      if (!value || parseInt(value, 10) < 1) {
        throw new Error('Max bookings must be at least 1 for slot-based amenities');
      }
    }
    return true;
  }),
  body('bookingRules.advanceBookingDays').isInt({ min: 0 }).withMessage('Advance booking days cannot be negative'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
];

export const updateAmenityRules = [
  body('name').optional().notEmpty().withMessage('Amenity name cannot be empty').trim(),
  body('description').optional().isString().trim(),
  body('type').optional().isIn(['clubhouse', 'pool', 'gym', 'court', 'hall', 'other', 'Event Space', 'Fitness', 'Sports', 'Workspace', 'Wellness']).withMessage('Invalid amenity type'),
  body('images').optional().isArray().withMessage('Images must be an array of strings'),
  body('images.*').optional().isString().withMessage('Image URL must be a string'),
  body('location').optional().isString().trim(),
  body('ratePerHour').optional().isNumeric().withMessage('Rate must be a number'),
  body('openDays').optional().isArray().withMessage('openDays must be an array of integers'),
  body('openDays.*').optional().isInt({ min: 0, max: 6 }).withMessage('openDays must be 0-6'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be a positive integer'),
  body('pricing.securityDepositDescription').optional({ checkFalsy: true }).isString().trim(),
  body('bookingRules.slotDurationMinutes').custom((value, { req }) => {
    if (req.body.pricing?.pricingType !== 'daily') {
      if (value !== undefined && (!value || parseInt(value, 10) < 15)) {
        throw new Error('Slot duration must be at least 15 mins for slot-based amenities');
      }
    }
    return true;
  }),
  body('bookingRules.openTime').optional().matches(/^([01]\d|2[0-3]):?([0-5]\d)$/).withMessage('Invalid open time format (HH:MM)'),
  body('bookingRules.closeTime').optional().matches(/^([01]\d|2[0-3]):?([0-5]\d)$/).withMessage('Invalid close time format (HH:MM)'),
  body('maxBookingsPerUserPerSlot').custom((value, { req }) => {
    if (req.body.pricing?.pricingType !== 'daily') {
      if (value !== undefined && (!value || parseInt(value, 10) < 1)) {
        throw new Error('Max bookings must be at least 1 for slot-based amenities');
      }
    }
    return true;
  }),
  body('bookingRules.advanceBookingDays').optional().isInt({ min: 0 }).withMessage('Advance booking days cannot be negative'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
];

export const createMaintenanceRules = [
  body('title').notEmpty().withMessage('Maintenance title is required').trim(),
  body('type').optional().isIn(['preventive', 'corrective', 'emergency']).withMessage('Invalid maintenance type'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority'),
  body('startDate').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Start date must be in YYYY-MM-DD format'),
  body('endDate').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('End date must be in YYYY-MM-DD format'),
  body('startTime').optional({ checkFalsy: true }).matches(/^([01]\d|2[0-3]):?([0-5]\d)$/).withMessage('Invalid start time format (HH:MM)'),
  body('endTime').optional({ checkFalsy: true }).matches(/^([01]\d|2[0-3]):?([0-5]\d)$/).withMessage('Invalid end time format (HH:MM)'),
  body('endDate').custom((value, { req }) => {
    if (new Date(value) < new Date(req.body.startDate)) {
      throw new Error('End date must be after or equal to start date');
    }
    if (value === req.body.startDate && req.body.startTime && req.body.endTime) {
      if (req.body.endTime <= req.body.startTime) {
        throw new Error('End time must be after start time on the same day');
      }
    }
    return true;
  })
];

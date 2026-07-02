import { body } from 'express-validator';

export const createBookingRules = [
  body('amenityId').notEmpty().withMessage('Amenity ID is required').isMongoId().withMessage('Invalid Amenity ID'),
  body('userId').notEmpty().withMessage('User ID is required').isMongoId().withMessage('Invalid User ID'),
  body('orgId').notEmpty().withMessage('Organization ID is required').isMongoId().withMessage('Invalid Organization ID'),
  body('date').notEmpty().withMessage('Booking date is required').isISO8601().toDate().withMessage('Invalid date format'),
  body('startTime').matches(/^([01]\d|2[0-3]):?([0-5]\d)$/).withMessage('Invalid start time format (HH:MM)'),
  body('endTime').matches(/^([01]\d|2[0-3]):?([0-5]\d)$/).withMessage('Invalid end time format (HH:MM)'),
  body('durationMinutes').isInt({ min: 1 }).withMessage('Duration must be at least 1 minute'),
  body('totalAmount').isNumeric({ min: 0 }).withMessage('Total amount cannot be negative')
];

export const updateBookingStatusRules = [
  body('bookingStatus').isIn(['Confirmed', 'Checked-In', 'Cancelled', 'Completed']).withMessage('Invalid booking status')
];

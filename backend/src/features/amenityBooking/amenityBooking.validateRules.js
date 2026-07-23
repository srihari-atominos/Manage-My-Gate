import { body } from 'express-validator';

export const createBookingRules = [
  body('amenityId').notEmpty().withMessage('Amenity ID is required').isMongoId().withMessage('Invalid Amenity ID'),
  body('bookingDate').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Booking date must be YYYY-MM-DD'),
  body('startTime').matches(/^([01]\d|2[0-3]):?([0-5]\d)$/).withMessage('Invalid start time format (HH:MM)'),
  body('endTime').matches(/^([01]\d|2[0-3]):?([0-5]\d)$/).withMessage('Invalid end time format (HH:MM)'),
  body('totalPrice').optional().isNumeric().withMessage('Total price must be a number'),
  body('deposit').optional().isNumeric().withMessage('Deposit must be a number'),
  body('paymentMethod').optional().isString().withMessage('Payment method must be a string'),
  body('numberOfPersons').optional().isInt({ min: 1 }).withMessage('Number of persons must be at least 1'),
];



export const manualBookingRules = [
  body('amenityId').notEmpty().withMessage('Amenity ID is required').isMongoId().withMessage('Invalid Amenity ID'),
  body('residentId').notEmpty().withMessage('Resident ID is required').isMongoId().withMessage('Invalid Resident ID'),
  body('bookingDate').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Booking date must be YYYY-MM-DD'),
  body('startTime').matches(/^([01]\d|2[0-3]):?([0-5]\d)$/).withMessage('Invalid start time format (HH:MM)'),
  body('endTime').matches(/^([01]\d|2[0-3]):?([0-5]\d)$/).withMessage('Invalid end time format (HH:MM)'),
  body('paymentStatus').optional().isIn(['pending', 'paid', 'waived']).withMessage('Invalid payment status'),
  body('numberOfPersons').optional().isInt({ min: 1 }).withMessage('Number of persons must be at least 1')
];

import { Router } from 'express';
import bookingController from './booking.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import { createBookingRules, updateBookingStatusRules } from './booking.validateRules.js';

const router = Router();

// GET / - Retrieve all bookings (Admin can see all, Residents should pass their userId as a filter)
router.get('/', bookingController.getAll);

// GET /:id - Retrieve single booking
router.get('/:id', bookingController.getById);

// POST / - Create booking (Resident)
router.post('/', validate(createBookingRules), bookingController.create);

// PUT /:id/status - Update booking status (Admin/Security for Check-In, Resident for Cancel)
router.put('/:id/status', validate(updateBookingStatusRules), bookingController.updateStatus);

export default router;

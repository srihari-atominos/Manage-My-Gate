import { Router } from 'express';
import amenityBookingController from './amenityBooking.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import { createBookingRules, reviewBookingRules, manualBookingRules } from './amenityBooking.validateRules.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import { authorizePermission } from '../../middlewares/rbac.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';
import './amenityBooking.listeners.js';

const router = Router();

// Protect all routes
router.use(isAuthenticated, tenantContext);

// Resident facing routes
router.get('/my-bookings', authorizePermission('amenities', 'book'), amenityBookingController.getMyBookings);
router.post('/', authorizePermission('amenities', 'book'), validate(createBookingRules), amenityBookingController.createBooking);
router.put('/:id/cancel', authorizePermission('amenities', 'cancel_booking'), amenityBookingController.cancelBooking);

// Admin facing routes (Approval queue & manual booking)
router.post('/manual', authorizePermission('amenities', 'manage_bookings'), validate(manualBookingRules), amenityBookingController.createManualBooking);
router.get('/queue', authorizePermission('amenities', 'manage_bookings'), amenityBookingController.getQueue);
router.put('/:id/review', authorizePermission('amenities', 'manage_bookings'), validate(reviewBookingRules), amenityBookingController.reviewBooking);

// Analytics routes
router.get('/stats/dashboard', authorizePermission('amenities', 'manage_bookings'), amenityBookingController.getDashboardData);
router.get('/stats/kpi', authorizePermission('amenities', 'manage_bookings'), amenityBookingController.getKpiStats);
router.get('/stats/revenue', authorizePermission('amenities', 'manage_bookings'), amenityBookingController.getRevenueStats);
router.get('/stats/occupancy', authorizePermission('amenities', 'manage_bookings'), amenityBookingController.getOccupancyStats);
router.get('/stats/trends', authorizePermission('amenities', 'manage_bookings'), amenityBookingController.getTrendsStats);
router.get('/stats/recent-activity', authorizePermission('amenities', 'manage_bookings'), amenityBookingController.getRecentActivity);

// Check-in route (Resident or Admin can check in)
router.post('/:id/checkin', authorizePermission('amenities', 'book'), amenityBookingController.checkInBooking);

export default router;

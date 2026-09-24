import { Router } from 'express';
import availabilityController from './availability.controller.js';
import { checkAvailabilityRules, getDailySlotsRules } from './availability.validateRules.js';
import validate from '../../../../middlewares/validator.middleware.js';
import isAuthenticated from '../../../../middlewares/auth.middleware.js';
import tenantContext from '../../../../middlewares/tenant.middleware.js';
import authorizePermission from '../../../../middlewares/rbac.middleware.js';

const router = Router();

// Protect availability endpoint
router.use(isAuthenticated, tenantContext);

// GET / - Check availability
router.get(
  '/',
  authorizePermission('amenities', ['amenities', 'discover', 'my_booking']),
  validate(checkAvailabilityRules),
  availabilityController.check
);

// GET /daily-slots - Get daily available slots
router.get(
  '/daily-slots',
  authorizePermission('amenities', ['amenities', 'discover', 'my_booking']),
  validate(getDailySlotsRules),
  availabilityController.getDailySlots
);

export default router;

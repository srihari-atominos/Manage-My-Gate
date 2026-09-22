import { Router } from 'express';
import amenityReservationHoldController from './amenityReservationHold.controller.js';
import { createHoldRules, holdIdParamRules } from './amenityReservationHold.validateRules.js';
import validate from '../../../middlewares/validator.middleware.js';
import isAuthenticated from '../../../middlewares/auth.middleware.js';
import tenantContext from '../../../middlewares/tenant.middleware.js';
import authorizePermission from '../../../middlewares/rbac.middleware.js';

const router = Router();

// Protect all hold endpoints with Authentication and Tenant Context
router.use(isAuthenticated, tenantContext);

// POST / - Create reservation hold
router.post(
  '/',
  authorizePermission('amenities', ['amenities', 'discover', 'my_booking']),
  validate(createHoldRules),
  amenityReservationHoldController.create
);

// GET /:holdId - Get reservation hold by ID
router.get(
  '/:holdId',
  authorizePermission('amenities', ['amenities', 'discover', 'my_booking']),
  validate(holdIdParamRules),
  amenityReservationHoldController.getById
);

// POST /:holdId/expire - Expire reservation hold early
router.post(
  '/:holdId/expire',
  authorizePermission('amenities', ['amenities', 'discover', 'my_booking']),
  validate(holdIdParamRules),
  amenityReservationHoldController.expire
);

export default router;

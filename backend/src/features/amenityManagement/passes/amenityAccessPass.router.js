import { Router } from 'express';
import amenityAccessPassController from './amenityAccessPass.controller.js';
import {
  passCheckInRules,
  passCheckOutRules,
  passReservationIdParamRules,
  revokePassRules,
} from './amenityAccessPass.validateRules.js';
import validate from '../../../middlewares/validator.middleware.js';
import isAuthenticated from '../../../middlewares/auth.middleware.js';
import tenantContext from '../../../middlewares/tenant.middleware.js';
import authorizePermission from '../../../middlewares/rbac.middleware.js';

const router = Router();

// Protect all pass routes with Authentication and Tenant Context
router.use(isAuthenticated, tenantContext);

// POST /check-in - Turnstile / scanner check-in validation
router.post(
  '/check-in',
  authorizePermission('amenities', ['scanner', 'amenities']),
  validate(passCheckInRules),
  amenityAccessPassController.checkIn
);

// POST /check-out - Record check-out
router.post(
  '/check-out',
  authorizePermission('amenities', ['scanner', 'amenities']),
  validate(passCheckOutRules),
  amenityAccessPassController.checkOut
);

// GET /reservation/:reservationId - Get passes for reservation
router.get(
  '/reservation/:reservationId',
  authorizePermission('amenities', ['amenities', 'my_booking', 'scanner']),
  validate(passReservationIdParamRules),
  amenityAccessPassController.getByReservation
);

// POST /:passId/revoke - Revoke pass
router.post(
  '/:passId/revoke',
  authorizePermission('amenities', ['amenities', 'scanner']),
  validate(revokePassRules),
  amenityAccessPassController.revoke
);

export default router;

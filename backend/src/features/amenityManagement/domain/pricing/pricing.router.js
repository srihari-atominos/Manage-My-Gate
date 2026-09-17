import { Router } from 'express';
import pricingController from './pricing.controller.js';
import { calculatePricingRules } from './pricing.validateRules.js';
import validate from '../../../../middlewares/validator.middleware.js';
import isAuthenticated from '../../../../middlewares/auth.middleware.js';
import tenantContext from '../../../../middlewares/tenant.middleware.js';
import authorizePermission from '../../../../middlewares/rbac.middleware.js';

const router = Router();

// Protect pricing endpoints
router.use(isAuthenticated, tenantContext);

// POST /calculate - Calculate pricing breakdown
router.post(
  '/calculate',
  authorizePermission('amenities', ['amenities', 'discover', 'my_booking']),
  validate(calculatePricingRules),
  pricingController.calculate
);

export default router;

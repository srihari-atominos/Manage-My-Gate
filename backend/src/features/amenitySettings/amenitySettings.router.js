import { Router } from 'express';
import amenitySettingsController from './amenitySettings.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import { updateSettingsRules } from './amenitySettings.validateRules.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import { authorizePermission } from '../../middlewares/rbac.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';

const router = Router();

// Protect all routes
router.use(isAuthenticated, tenantContext);

// GET /settings
router.get('/', authorizePermission('amenities', 'manage_bookings'), amenitySettingsController.getSettings);

// PUT /settings
router.put('/', authorizePermission('amenities', 'manage_bookings'), validate(updateSettingsRules), amenitySettingsController.updateSettings);

export default router;

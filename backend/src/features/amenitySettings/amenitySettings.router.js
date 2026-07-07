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

// Retrieve global amenity settings
router.get('/', authorizePermission('amenities', 'settings'), amenitySettingsController.getSettings);

// Update global amenity settings
router.put('/', authorizePermission('amenities', 'settings'), validate(updateSettingsRules), amenitySettingsController.updateSettings);

export default router;

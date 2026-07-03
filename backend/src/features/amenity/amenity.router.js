import { Router } from 'express';
import amenityController from './amenity.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import { createAmenityRules, updateAmenityRules } from './amenity.validateRules.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import { authorizePermission } from '../../middlewares/rbac.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';

const router = Router();

// Protect all routes
router.use(isAuthenticated, tenantContext);

// GET / - Retrieve all amenities (requires manage_master)
router.get('/', authorizePermission('amenities', 'manage_master'), amenityController.getAll);

// GET /available-slots - Retrieve amenities available in a time range
router.get('/available-slots', authorizePermission('amenities', 'discover_amenities'), amenityController.getAvailableAmenities);

// GET /:id - Retrieve single amenity
router.get('/:id', authorizePermission('amenities', 'manage_master'), amenityController.getById);

// GET /:id/slots - Retrieve available slots for a given date
router.get('/:id/slots', authorizePermission('amenities', 'discover_amenities'), amenityController.getSlots);

// POST / - Create amenity
router.post('/', authorizePermission('amenities', 'manage_master'), validate(createAmenityRules), amenityController.create);

// PUT /:id - Update amenity
router.put('/:id', authorizePermission('amenities', 'manage_master'), validate(updateAmenityRules), amenityController.update);

// PATCH /:id/status - Update amenity status (deactivate)
router.patch('/:id/status', authorizePermission('amenities', 'manage_master'), amenityController.updateStatus);

// DELETE /:id - Soft delete amenity
router.delete('/:id', authorizePermission('amenities', 'manage_master'), amenityController.delete);

export default router;

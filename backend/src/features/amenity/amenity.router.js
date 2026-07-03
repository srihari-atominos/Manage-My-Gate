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

// GET / - Retrieve all amenities (requires read permission)
router.get('/', authorizePermission('amenities', 'read'), amenityController.getAll);

// GET /:id - Retrieve single amenity
router.get('/:id', authorizePermission('amenities', 'read'), amenityController.getById);

// GET /:id/slots - Retrieve available slots for a given date
router.get('/:id/slots', authorizePermission('amenities', 'read'), amenityController.getSlots);

// POST / - Create amenity
router.post('/', authorizePermission('amenities', 'create'), validate(createAmenityRules), amenityController.create);

// PUT /:id - Update amenity
router.put('/:id', authorizePermission('amenities', 'update'), validate(updateAmenityRules), amenityController.update);

// DELETE /:id - Soft delete amenity
router.delete('/:id', authorizePermission('amenities', 'delete'), amenityController.delete);

export default router;

import { Router } from 'express';
import amenityController from './amenity.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import { createAmenityRules, updateAmenityRules } from './amenity.validateRules.js';
// Note: isAuthenticated and authorizeRoles will be used for route protection
// import isAuthenticated from '../../middlewares/auth.middleware.js';
// import authorizeRoles from '../../middlewares/rbac.middleware.js';

const router = Router();

// GET / - Retrieve all amenities (All roles)
router.get('/', amenityController.getAll);

// GET /:id - Retrieve single amenity
router.get('/:id', amenityController.getById);

// POST / - Create amenity (Admin only)
router.post('/', validate(createAmenityRules), amenityController.create);

// PUT /:id - Update amenity (Admin only)
router.put('/:id', validate(updateAmenityRules), amenityController.update);

// DELETE /:id - Soft delete amenity (Admin only)
router.delete('/:id', amenityController.delete);

export default router;

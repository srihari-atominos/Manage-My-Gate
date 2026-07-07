import { Router } from 'express';
import amenityController from './amenity.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import { createAmenityRules, updateAmenityRules, createMaintenanceRules } from './amenity.validateRules.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import { authorizePermission } from '../../middlewares/rbac.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';

const router = Router();

// Protect all routes
router.use(isAuthenticated, tenantContext);

// GET / - Retrieve all// Admin facing routes (CRUD & Maintenance)
router.get('/', authorizePermission('amenities', ['amenities', 'discover']), amenityController.getAll);

// GET /available-slots - Retrieve amenities available in a time range
router.get('/available-slots', authorizePermission('amenities', 'discover'), amenityController.getAvailableAmenities);

// GET /maintenance - Retrieve all maintenance schedules
router.get('/maintenance', authorizePermission('amenities', 'maintenance'), amenityController.getAllMaintenance);

// GET /:id - Retrieve single amenity
router.get('/:id', authorizePermission('amenities', 'amenities'), amenityController.getById);

// GET /:id/slots - Retrieve available slots for a given date
router.get('/:id/slots', authorizePermission('amenities', 'discover'), amenityController.getSlots);

// GET /:id/slots/all - Retrieve all generated slots (with status) for a given date
router.get('/:id/slots/all', authorizePermission('amenities', 'discover'), amenityController.getAllSlots);

// POST /:id/maintenance - Schedule maintenance
router.post('/:id/maintenance', authorizePermission('amenities', 'maintenance'), validate(createMaintenanceRules), amenityController.scheduleMaintenance);

// PUT /:id/maintenance/:maintenanceId - Update maintenance
router.put('/:id/maintenance/:maintenanceId', authorizePermission('amenities', 'maintenance'), validate(createMaintenanceRules), amenityController.updateMaintenance);

// DELETE /:id/maintenance/:maintenanceId - Delete maintenance
router.delete('/:id/maintenance/:maintenanceId', authorizePermission('amenities', 'maintenance'), amenityController.deleteMaintenance);

// POST / - Create amenity
router.post('/', authorizePermission('amenities', 'amenities'), validate(createAmenityRules), amenityController.create);

// PUT /:id - Update amenity
router.put('/:id', authorizePermission('amenities', 'amenities'), validate(updateAmenityRules), amenityController.update);

// PATCH /:id/status - Update amenity status (deactivate)
router.patch('/:id/status', authorizePermission('amenities', 'amenities'), amenityController.updateStatus);

// DELETE /:id - Soft delete amenity
router.delete('/:id', authorizePermission('amenities', 'amenities'), amenityController.delete);

export default router;

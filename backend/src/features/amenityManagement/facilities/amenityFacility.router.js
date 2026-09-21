import { Router } from 'express';
import amenityFacilityController from './amenityFacility.controller.js';
import {
  createFacilityRules,
  updateFacilityRules,
  facilityIdParamRules,
  facilityCodeParamRules,
  listFacilitiesRules,
} from './amenityFacility.validateRules.js';
import validate from '../../../middlewares/validator.middleware.js';
import isAuthenticated from '../../../middlewares/auth.middleware.js';
import tenantContext from '../../../middlewares/tenant.middleware.js';
import authorizePermission from '../../../middlewares/rbac.middleware.js';

const router = Router();

// Protect all facility endpoints with Authentication and Tenant Context
router.use(isAuthenticated, tenantContext);

// POST / - Create facility
router.post(
  '/',
  authorizePermission('amenities', ['amenities', 'create']),
  validate(createFacilityRules),
  amenityFacilityController.create
);

// GET / - List facilities with pagination
router.get(
  '/',
  authorizePermission('amenities', ['amenities', 'discover', 'read']),
  validate(listFacilitiesRules),
  amenityFacilityController.getAll
);

// GET /code/:code - Get facility by code
router.get(
  '/code/:code',
  authorizePermission('amenities', ['amenities', 'discover', 'read']),
  validate(facilityCodeParamRules),
  amenityFacilityController.getByCode
);

// GET /:facilityId - Get facility by ID
router.get(
  '/:facilityId',
  authorizePermission('amenities', ['amenities', 'discover', 'read']),
  validate(facilityIdParamRules),
  amenityFacilityController.getById
);

// PATCH /:facilityId - Update facility
router.patch(
  '/:facilityId',
  authorizePermission('amenities', ['amenities', 'update']),
  validate([...facilityIdParamRules, ...updateFacilityRules]),
  amenityFacilityController.update
);

// PUT /:facilityId - Update facility (idempotent full/partial update alias)
router.put(
  '/:facilityId',
  authorizePermission('amenities', ['amenities', 'update']),
  validate([...facilityIdParamRules, ...updateFacilityRules]),
  amenityFacilityController.update
);

// DELETE /:facilityId - Soft delete facility
router.delete(
  '/:facilityId',
  authorizePermission('amenities', ['amenities', 'delete']),
  validate(facilityIdParamRules),
  amenityFacilityController.delete
);

export default router;

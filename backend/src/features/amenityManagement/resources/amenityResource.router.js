import { Router } from 'express';
import amenityResourceController from './amenityResource.controller.js';
import {
  createResourceRules,
  updateResourceRules,
  resourceIdParamRules,
  resourceFacilityIdParamRules,
  listResourcesRules,
} from './amenityResource.validateRules.js';
import validate from '../../../middlewares/validator.middleware.js';
import isAuthenticated from '../../../middlewares/auth.middleware.js';
import tenantContext from '../../../middlewares/tenant.middleware.js';
import authorizePermission from '../../../middlewares/rbac.middleware.js';

const router = Router();

// Protect all resource routes with Authentication and Tenant Context
router.use(isAuthenticated, tenantContext);

// POST / - Create resource
router.post(
  '/',
  authorizePermission('amenities', 'amenities'),
  validate(createResourceRules),
  amenityResourceController.create
);

// GET / - List resources with pagination
router.get(
  '/',
  authorizePermission('amenities', ['amenities', 'discover']),
  validate(listResourcesRules),
  amenityResourceController.getAll
);

// GET /facility/:facilityId - Get all resources under a facility
router.get(
  '/facility/:facilityId',
  authorizePermission('amenities', ['amenities', 'discover']),
  validate(resourceFacilityIdParamRules),
  amenityResourceController.getByFacilityId
);

// GET /:resourceId - Get single resource
router.get(
  '/:resourceId',
  authorizePermission('amenities', ['amenities', 'discover']),
  validate(resourceIdParamRules),
  amenityResourceController.getById
);

// PATCH /:resourceId - Update resource
router.patch(
  '/:resourceId',
  authorizePermission('amenities', 'amenities'),
  validate([...resourceIdParamRules, ...updateResourceRules]),
  amenityResourceController.update
);

// DELETE /:resourceId - Soft delete resource
router.delete(
  '/:resourceId',
  authorizePermission('amenities', 'amenities'),
  validate(resourceIdParamRules),
  amenityResourceController.delete
);

export default router;

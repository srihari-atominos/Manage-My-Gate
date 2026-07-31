import { Router } from 'express';
import villaController from './villa.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import { createVillaRules, updateVillaRules, batchGenerateRules, bulkUploadVillasRules, assignExistingUserRules, updateResidencyTypeRules } from './villa.validateRules.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import { authorizePermission, authorizeAnyPermission } from '../../middlewares/rbac.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';
import correlationIdMiddleware from '../../middlewares/correlationId.middleware.js';

const router = Router();

/**
 * @swagger
 * /villas:
 *   get:
 *     summary: Retrieve paginated list of units in the community
 */
router.get(
  '/',
  correlationIdMiddleware,
  isAuthenticated,
  tenantContext,
  authorizePermission('villas', 'read'),
  villaController.getAll
);

/**
 * @swagger
 * /villas/blocks:
 *   get:
 *     summary: Get all distinct block/building names for the community (powers dynamic filter dropdown)
 */
router.get(
  '/blocks',
  correlationIdMiddleware,
  isAuthenticated,
  tenantContext,
  authorizePermission('villas', 'read'),
  villaController.getBlocks
);

/**
 * @swagger
 * /villas/stats:
 *   get:
 *     summary: Get occupancy statistics for units
 */
router.get(
  '/stats',
  correlationIdMiddleware,
  isAuthenticated,
  tenantContext,
  authorizePermission('villas', 'read'),
  villaController.getStats
);

/**
 * @swagger
 * /villas/bulk-upload/template:
 *   get:
 *     summary: Download bulk upload template in Excel format
 */
router.get(
  '/bulk-upload/template',
  correlationIdMiddleware,
  isAuthenticated,
  tenantContext,
  authorizePermission('villas', 'create'),
  villaController.downloadBulkUploadTemplate
);

/**
 * @swagger
 * /villas/bulk-upload:
 *   post:
 *     summary: Bulk upload units with residents
 */
router.post(
  '/bulk-upload',
  correlationIdMiddleware,
  isAuthenticated,
  tenantContext,
  authorizePermission('villas', ['create', 'update', 'read']),
  validate(bulkUploadVillasRules),
  villaController.bulkUpload
);

/**
 * @swagger
 * /villas/{id}:
 *   get:
 *     summary: Retrieve a single unit and its residents
 */
router.get(
  '/:id',
  correlationIdMiddleware,
  isAuthenticated,
  tenantContext,
  authorizePermission('villas', 'read'),
  villaController.getById
);

/**
 * @swagger
 * /villas:
 *   post:
 *     summary: Create a new unit
 */
router.post(
  '/',
  correlationIdMiddleware,
  isAuthenticated,
  tenantContext,
  authorizePermission('villas', 'create'),
  validate(createVillaRules),
  villaController.create
);

/**
 * @swagger
 * /villas/batch-generate:
 *   post:
 *     summary: Batch generate units for community setup
 */
router.post(
  '/batch-generate',
  correlationIdMiddleware,
  isAuthenticated,
  tenantContext,
  authorizePermission('villas', 'create'),
  validate(batchGenerateRules),
  villaController.batchGenerate
);


/**
 * @swagger
 * /villas/{id}:
 *   put:
 *     summary: Update an existing unit
 */
router.put(
  '/:id',
  correlationIdMiddleware,
  isAuthenticated,
  tenantContext,
  authorizePermission('villas', 'update'),
  validate(updateVillaRules),
  villaController.update
);

/**
 * @swagger
 * /villas/{id}/assign:
 *   patch:
 *     summary: Assign primary resident to unit
 */
router.patch(
  '/:id/assign',
  correlationIdMiddleware,
  isAuthenticated,
  tenantContext,
  authorizeAnyPermission(['villas:update', 'villas:read']),
  villaController.assignResident
);

/**
 * @swagger
 * /villas/{id}:
 *   delete:
 *     summary: Delete a unit
 */
router.delete(
  '/:id',
  correlationIdMiddleware,
  isAuthenticated,
  tenantContext,
  authorizePermission('villas', 'delete'),
  villaController.delete
);

/**
 * @swagger
 * /villas/{id}/assign-resident:
 *   post:
 *     summary: Assign existing user to unit
 */
router.post(
  '/:id/assign-resident',
  correlationIdMiddleware,
  isAuthenticated,
  tenantContext,
  authorizeAnyPermission(['villas:update', 'villas:read']),
  validate(assignExistingUserRules),
  villaController.assignExistingUser
);

/**
 * @swagger
 * /villas/{id}/residents/{userId}/type:
 *   patch:
 *     summary: Update residency type of assigned resident
 */
router.patch(
  '/:id/residents/:userId/type',
  correlationIdMiddleware,
  isAuthenticated,
  tenantContext,
  authorizeAnyPermission(['villas:update', 'villas:read']),
  validate(updateResidencyTypeRules),
  villaController.updateResidencyType
);

/**
 * @swagger
 * /villas/{id}/residents/{userId}:
 *   delete:
 *     summary: Remove/unassign resident from unit
 */
router.delete(
  '/:id/residents/:userId',
  correlationIdMiddleware,
  isAuthenticated,
  tenantContext,
  authorizeAnyPermission(['villas:update', 'villas:read']),
  villaController.removeResident
);

export default router;

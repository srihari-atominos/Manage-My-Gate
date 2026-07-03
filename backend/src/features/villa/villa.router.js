import { Router } from 'express';
import villaController from './villa.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import { createVillaRules, updateVillaRules, batchGenerateRules, bulkUploadVillasRules } from './villa.validateRules.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import { authorizePermission } from '../../middlewares/rbac.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';

const router = Router();

// Protect all villa routes
router.use(isAuthenticated);

/**
 * @swagger
 * /villas:
 *   get:
 *     summary: Retrieve all villas in the community
 */
router.get(
  '/',
  tenantContext,
  authorizePermission('villas', 'read'),
  villaController.getAll
);

/**
 * @swagger
 * /villas/stats:
 *   get:
 *     summary: Get occupancy statistics for villas
 */
router.get(
  '/stats',
  tenantContext,
  authorizePermission('villas', 'read'),
  villaController.getStats
);

/**
 * @swagger
 * /villas/{id}:
 *   get:
 *     summary: Retrieve a single villa and its residents
 */
router.get(
  '/:id',
  tenantContext,
  authorizePermission('villas', 'read'),
  villaController.getById
);

/**
 * @swagger
 * /villas:
 *   post:
 *     summary: Create a new villa
 */
router.post(
  '/',
  tenantContext,
  authorizePermission('villas', 'create'),
  validate(createVillaRules),
  villaController.create
);

/**
 * @swagger
 * /villas/batch-generate:
 *   post:
 *     summary: Batch generate villas for community setup
 */
router.post(
  '/batch-generate',
  tenantContext,
  authorizePermission('villas', 'create'),
  validate(batchGenerateRules),
  villaController.batchGenerate
);

/**
 * @swagger
 * /villas/bulk-upload:
 *   post:
 *     summary: Bulk upload villas with residents
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - villas
 *             properties:
 *               villas:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Bulk villa upload processed successfully.
 *       400:
 *         description: Validation error.
 */
router.post(
  '/bulk-upload',
  tenantContext,
  authorizePermission('villas', 'create'),
  validate(bulkUploadVillasRules),
  villaController.bulkUpload
);

/**
 * @swagger
 * /villas/{id}:
 *   put:
 *     summary: Update an existing villa
 */
router.put(
  '/:id',
  tenantContext,
  authorizePermission('villas', 'update'),
  validate(updateVillaRules),
  villaController.update
);

/**
 * @swagger
 * /villas/{id}:
 *   delete:
 *     summary: Delete a villa
 */
router.delete(
  '/:id',
  tenantContext,
  authorizePermission('villas', 'delete'),
  villaController.delete
);

export default router;

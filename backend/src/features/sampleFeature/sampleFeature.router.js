import { Router } from 'express';
import sampleController from './sampleFeature.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import { createSampleRules, updateSampleRules } from './sampleFeature.validateRules.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import authorizeRoles from '../../middlewares/rbac.middleware.js';

const router = Router();

/**
 * @swagger
 * /sample:
 *   get:
 *     summary: Retrieve all sample records
 *     security: []
 *     responses:
 *       200:
 *         description: A list of samples.
 */
router.get('/', sampleController.getAll);

/**
 * @swagger
 * /sample/{id}:
 *   get:
 *     summary: Retrieve a single sample record by ID
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The sample record.
 */
router.get('/:id', sampleController.getById);

/**
 * @swagger
 * /sample:
 *   post:
 *     summary: Create a new sample record
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created.
 */
router.post(
  '/',
  // Example route-protection middlewares (disabled by default for bootstrapping):
  // isAuthenticated,
  // authorizeRoles('admin', 'manager'),
  validate(createSampleRules),
  sampleController.create
);

/**
 * @swagger
 * /sample/{id}:
 *   put:
 *     summary: Update an existing sample record
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated.
 */
router.put(
  '/:id',
  validate(updateSampleRules),
  sampleController.update
);

/**
 * @swagger
 * /sample/{id}:
 *   delete:
 *     summary: Delete a sample record
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted.
 */
router.delete('/:id', sampleController.delete);

export default router;

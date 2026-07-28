import { Router } from 'express';
import masterPricingController from './masterPricing.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import {
  createMasterPricingRules,
  updateMasterPricingRules,
  queryMasterPricingRules,
  getByIdMasterPricingRules,
} from './masterPricing.validator.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import authorizeRoles from '../../middlewares/rbac.middleware.js';

const router = Router();

/**
 * @swagger
 * /master-pricing:
 *   get:
 *     summary: Retrieve paginated master pricing plans
 *     tags: [MasterPricing]
 */
router.get(
  '/',
  validate(queryMasterPricingRules),
  masterPricingController.getAll
);

/**
 * @swagger
 * /master-pricing/{id}:
 *   get:
 *     summary: Retrieve a single master pricing plan by ID
 *     tags: [MasterPricing]
 */
router.get(
  '/:id',
  validate(getByIdMasterPricingRules),
  masterPricingController.getById
);

/**
 * @swagger
 * /master-pricing:
 *   post:
 *     summary: Create a new master pricing plan
 *     tags: [MasterPricing]
 */
router.post(
  '/',
  isAuthenticated,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  validate(createMasterPricingRules),
  masterPricingController.create
);

/**
 * @swagger
 * /master-pricing/{id}:
 *   put:
 *     summary: Update an existing master pricing plan
 *     tags: [MasterPricing]
 */
router.put(
  '/:id',
  isAuthenticated,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  validate(updateMasterPricingRules),
  masterPricingController.update
);

/**
 * @swagger
 * /master-pricing/{id}:
 *   delete:
 *     summary: Delete a master pricing plan
 *     tags: [MasterPricing]
 */
router.delete(
  '/:id',
  isAuthenticated,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  validate(getByIdMasterPricingRules),
  masterPricingController.delete
);

export default router;

import { Router } from 'express';
import amenityMaintenanceBlockController from './amenityMaintenanceBlock.controller.js';
import {
  scheduleMaintenanceRules,
  updateMaintenanceStatusRules,
  blockIdParamRules,
  overlappingMaintenanceRules,
} from './amenityMaintenanceBlock.validateRules.js';
import validate from '../../../middlewares/validator.middleware.js';
import isAuthenticated from '../../../middlewares/auth.middleware.js';
import tenantContext from '../../../middlewares/tenant.middleware.js';
import authorizePermission from '../../../middlewares/rbac.middleware.js';

const router = Router();

// Protect all maintenance routes with Authentication and Tenant Context
router.use(isAuthenticated, tenantContext);

// GET / - List maintenance blocks
router.get(
  '/',
  authorizePermission('amenities', ['maintenance', 'amenities']),
  amenityMaintenanceBlockController.getAll
);

// POST / - Schedule maintenance block
router.post(
  '/',
  authorizePermission('amenities', 'maintenance'),
  validate(scheduleMaintenanceRules),
  amenityMaintenanceBlockController.schedule
);

// GET /overlapping - Get overlapping maintenance blocks
router.get(
  '/overlapping',
  authorizePermission('amenities', ['maintenance', 'amenities', 'discover']),
  validate(overlappingMaintenanceRules),
  amenityMaintenanceBlockController.getOverlapping
);

// GET /:blockId - Get maintenance block by ID
router.get(
  '/:blockId',
  authorizePermission('amenities', ['maintenance', 'amenities']),
  validate(blockIdParamRules),
  amenityMaintenanceBlockController.getById
);

// PATCH /:blockId/status - Update maintenance status
router.patch(
  '/:blockId/status',
  authorizePermission('amenities', 'maintenance'),
  validate(updateMaintenanceStatusRules),
  amenityMaintenanceBlockController.updateStatus
);

export default router;

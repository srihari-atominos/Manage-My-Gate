import { Router } from 'express';
import amenityMaintenanceBlockController from './amenityMaintenanceBlock.controller.js';
import {
  scheduleMaintenanceRules,
  impactPreviewRules,
  updateMaintenanceStatusRules,
  extendMaintenanceRules,
  blockIdParamRules,
  overlappingMaintenanceRules,
  resolveImpactRules,
  findAlternativeRules,
  previewRecurringRules,
  scheduleRecurringRules,
  seriesIdParamRules,
  declareEmergencyRules,
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

// POST / - Schedule maintenance block (supports resolutions array)
router.post(
  '/',
  authorizePermission('amenities', 'maintenance'),
  validate(scheduleMaintenanceRules),
  amenityMaintenanceBlockController.schedule
);

// POST /impact-preview - Preview maintenance impact without modifying database
router.post(
  '/impact-preview',
  authorizePermission('amenities', 'maintenance'),
  validate(impactPreviewRules),
  amenityMaintenanceBlockController.getImpactPreview
);

// POST /alternatives - Discover alternative available slots/resources for impacted items
router.post(
  '/alternatives',
  authorizePermission('amenities', ['maintenance', 'amenities']),
  validate(findAlternativeRules),
  amenityMaintenanceBlockController.getAlternatives
);

// GET /overlapping - Get overlapping maintenance blocks
router.get(
  '/overlapping',
  authorizePermission('amenities', ['maintenance', 'amenities', 'discover']),
  validate(overlappingMaintenanceRules),
  amenityMaintenanceBlockController.getOverlapping
);

// --- EMERGENCY MAINTENANCE ROUTE (Mounted before /:blockId to avoid route collision) ---
// POST /emergency - Declares immediate emergency maintenance
router.post(
  '/emergency',
  authorizePermission('amenities', 'maintenance'),
  validate(declareEmergencyRules),
  amenityMaintenanceBlockController.declareEmergency
);

// --- RECURRING MAINTENANCE ROUTES (Mounted before /:blockId to avoid route collision) ---

// POST /recurring/preview - Read-only preview of recurring maintenance series & conflicts
router.post(
  '/recurring/preview',
  authorizePermission('amenities', 'maintenance'),
  validate(previewRecurringRules),
  amenityMaintenanceBlockController.previewRecurring
);

// POST /recurring/impact-preview - Alias for recurring impact preview
router.post(
  '/recurring/impact-preview',
  authorizePermission('amenities', 'maintenance'),
  validate(previewRecurringRules),
  amenityMaintenanceBlockController.previewRecurring
);

// POST /recurring - Schedule recurring maintenance series with atomic impact resolution
router.post(
  '/recurring',
  authorizePermission('amenities', 'maintenance'),
  validate(scheduleRecurringRules),
  amenityMaintenanceBlockController.scheduleRecurring
);

// GET /recurring/:seriesId - Get recurring maintenance series details
router.get(
  '/recurring/:seriesId',
  authorizePermission('amenities', ['maintenance', 'amenities']),
  validate(seriesIdParamRules),
  amenityMaintenanceBlockController.getRecurringSeries
);

// GET /recurring/:seriesId/occurrences - Get paginated occurrences for a recurring maintenance series
router.get(
  '/recurring/:seriesId/occurrences',
  authorizePermission('amenities', ['maintenance', 'amenities']),
  validate(seriesIdParamRules),
  amenityMaintenanceBlockController.getRecurringSeriesOccurrences
);

// ----------------------------------------------------------------------------------------

// GET /:blockId - Get maintenance block by ID
router.get(
  '/:blockId',
  authorizePermission('amenities', ['maintenance', 'amenities']),
  validate(blockIdParamRules),
  amenityMaintenanceBlockController.getById
);

// GET /:blockId/impacts - List impact history for a maintenance block
router.get(
  '/:blockId/impacts',
  authorizePermission('amenities', ['maintenance', 'amenities']),
  validate(blockIdParamRules),
  amenityMaintenanceBlockController.getImpacts
);

// POST /:blockId/resolve-impact - Resolve pending impacts for a maintenance block
router.post(
  '/:blockId/resolve-impact',
  authorizePermission('amenities', 'maintenance'),
  validate(resolveImpactRules),
  amenityMaintenanceBlockController.resolveImpact
);

// PATCH /:blockId/status - Update maintenance status (enforces state transition rules)
router.patch(
  '/:blockId/status',
  authorizePermission('amenities', 'maintenance'),
  validate(updateMaintenanceStatusRules),
  amenityMaintenanceBlockController.updateStatus
);

// POST & PATCH /:blockId/extend - Extend maintenance block with conflict check
router.post(
  '/:blockId/extend',
  authorizePermission('amenities', 'maintenance'),
  validate(extendMaintenanceRules),
  amenityMaintenanceBlockController.extend
);
router.patch(
  '/:blockId/extend',
  authorizePermission('amenities', 'maintenance'),
  validate(extendMaintenanceRules),
  amenityMaintenanceBlockController.extend
);

// DELETE /:blockId - Delete maintenance block
router.delete(
  '/:blockId',
  authorizePermission('amenities', 'maintenance'),
  validate(blockIdParamRules),
  amenityMaintenanceBlockController.delete
);

export default router;

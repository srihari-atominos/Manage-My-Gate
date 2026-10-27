import { Router } from 'express';
import appUpdateController from './appUpdate.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import {
  getPolicyValidator,
  createReleaseValidator,
  updateReleaseValidator,
  publishReleaseValidator,
  announceReleaseValidator,
  listReleasesValidator,
  getByIdValidator,
} from './appUpdate.validator.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';
import { authorizeRoles } from '../../middlewares/rbac.middleware.js';

const router = Router();

/**
 * Public route to get client update policy
 * GET /api/v1/app-updates/policy?platform=android&applicationId=...&version=...&versionCode=...
 */
router.get(
  '/policy',
  validate(getPolicyValidator),
  appUpdateController.getPolicy
);

// Admin-only Platform Release Management Endpoints
const adminPlatformGuard = [
  isAuthenticated,
  tenantContext({ requirePlatformContext: true }),
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'PLATFORM_SUPER_ADMIN'),
];

/**
 * GET /api/v1/app-updates/admin/releases
 * List releases with pagination
 */
router.get(
  '/admin/releases',
  ...adminPlatformGuard,
  validate(listReleasesValidator),
  appUpdateController.listReleases
);

/**
 * POST /api/v1/app-updates/admin/releases
 * Create a new draft release
 */
router.post(
  '/admin/releases',
  ...adminPlatformGuard,
  validate(createReleaseValidator),
  appUpdateController.createRelease
);

/**
 * GET /api/v1/app-updates/admin/releases/:id
 * Get single release details
 */
router.get(
  '/admin/releases/:id',
  ...adminPlatformGuard,
  validate(getByIdValidator),
  appUpdateController.getReleaseById
);

/**
 * PUT /api/v1/app-updates/admin/releases/:id
 * Update an existing release
 */
router.put(
  '/admin/releases/:id',
  ...adminPlatformGuard,
  validate(updateReleaseValidator),
  appUpdateController.updateRelease
);

/**
 * POST /api/v1/app-updates/admin/releases/:id/publish
 * Mark a release available to clients after confirming Play Store publication
 */
router.post(
  '/admin/releases/:id/publish',
  ...adminPlatformGuard,
  validate(publishReleaseValidator),
  appUpdateController.publishRelease
);

/**
 * POST /api/v1/app-updates/admin/releases/:id/announce
 * Trigger push notification announcement for an available release
 */
router.post(
  '/admin/releases/:id/announce',
  ...adminPlatformGuard,
  validate(announceReleaseValidator),
  appUpdateController.announceRelease
);

export default router;

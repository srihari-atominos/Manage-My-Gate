import { Router } from 'express';
import organizationController from './organization.controller.js';
import validate from '../../middlewares/validator.middleware.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';
import { nameCheckLimiter } from '../../middlewares/rateLimiter.middleware.js';
import {
  checkNameRules,
  setupWorkspaceRules,
  updateFeaturesRules,
  updateStatusRules,
} from './organization.validator.js';

const router = Router();

// Check Organization Name availability route (public, rate-limited, validated)
router.get(
  '/check-name',
  nameCheckLimiter,
  validate(checkNameRules),
  organizationController.checkName
);

// Setup Workspace route (authenticated context, validated)
router.post(
  '/setup',
  isAuthenticated,
  validate(setupWorkspaceRules),
  organizationController.setupWorkspace
);



// Super Admin Management routes
router.get(
  '/',
  isAuthenticated,
  tenantContext({ requirePlatformContext: true }),
  organizationController.getAll
);

router.get(
  '/:id',
  isAuthenticated,
  tenantContext({ requirePlatformContext: true }),
  organizationController.getDetails
);

router.get(
  '/:id/users',
  isAuthenticated,
  tenantContext({ requirePlatformContext: true }),
  organizationController.getUsers
);

router.get(
  '/:id/users/:userId',
  isAuthenticated,
  tenantContext({ requirePlatformContext: true }),
  organizationController.getUserDetails
);

router.patch(
  '/:id/status',
  isAuthenticated,
  tenantContext({ requirePlatformContext: true }),
  validate(updateStatusRules),
  organizationController.updateStatus
);

// Feature onboarding route (tenant context)
router.patch(
  '/:id/features',
  isAuthenticated,
  tenantContext,
  validate(updateFeaturesRules),
  organizationController.updateFeatures
);

export default router;


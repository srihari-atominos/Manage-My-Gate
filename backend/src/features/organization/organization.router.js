import './organization.listeners.js';
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
  updateLoginPolicyRules,
  updateOnboardingModeRules,
  sendAdminEmailOtpRules,
  verifyAdminEmailOtpRules,
  provisionCommunityRules,
  assignAdminRules,
} from './organization.validator.js';

const router = Router();

// Check Organization Name availability route (public, rate-limited, validated)
router.get(
  '/check-name',
  nameCheckLimiter,
  validate(checkNameRules),
  organizationController.checkName
);

// Community Admin Email OTP Verification routes (authenticated Platform Admin context)
router.post(
  '/verify-email/send-otp',
  isAuthenticated,
  tenantContext({ requirePlatformContext: true }),
  validate(sendAdminEmailOtpRules),
  organizationController.sendAdminEmailOtp
);

router.post(
  '/verify-email/verify-otp',
  isAuthenticated,
  tenantContext({ requirePlatformContext: true }),
  validate(verifyAdminEmailOtpRules),
  organizationController.verifyAdminEmailOtp
);

// Setup Workspace route (authenticated context, validated)
router.post(
  '/setup',
  isAuthenticated,
  tenantContext({ requirePlatformContext: true }),
  validate(setupWorkspaceRules),
  organizationController.setupWorkspace
);

// Platform Admin: create a community, optionally inviting its Community Admin
router.post(
  '/provision',
  isAuthenticated,
  tenantContext({ requirePlatformContext: true }),
  validate(provisionCommunityRules),
  organizationController.provisionCommunity
);

// Platform Admin: invite (or re-invite) a community's Community Admin
router.post(
  '/:id/admins',
  isAuthenticated,
  tenantContext({ requirePlatformContext: true }),
  validate(assignAdminRules),
  organizationController.assignCommunityAdmin
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

// Feature onboarding route (Platform Admin context)
router.patch(
  '/:id/features',
  isAuthenticated,
  tenantContext({ requirePlatformContext: true }),
  validate(updateFeaturesRules),
  organizationController.updateFeatures
);

router.patch(
  '/:id/onboarding-mode',
  isAuthenticated,
  tenantContext({ requirePlatformContext: true }),
  validate(updateOnboardingModeRules),
  organizationController.updateOnboardingMode
);

router.patch(
  '/:id/login-policy',
  isAuthenticated,
  tenantContext({ requirePlatformContext: true }),
  validate(updateLoginPolicyRules),
  organizationController.updateLoginPolicy
);

export default router;

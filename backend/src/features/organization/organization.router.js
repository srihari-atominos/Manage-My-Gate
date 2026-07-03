import { Router } from 'express';
import { body, query } from 'express-validator';
import organizationController from './organization.controller.js';
import validate from '../../middlewares/validator.middleware.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';

const router = Router();

const checkNameRules = [
  query('name')
    .notEmpty()
    .withMessage('Organization name query parameter is required')
    .isString()
    .withMessage('Organization name must be a string')
    .trim(),
];

const updateFeaturesRules = [
  body('features')
    .isArray()
    .withMessage('features must be an array')
    .bail()
    .custom((value) => {
      if (!value.every((item) => typeof item === 'string')) {
        throw new Error('All features must be strings');
      }
      return true;
    }),
];

const updateStatusRules = [
  body('status')
    .isString()
    .withMessage('status must be a string')
    .bail()
    .isIn(['Active', 'Pending', 'Rejected'])
    .withMessage('status must be one of Active, Pending, or Rejected'),
];



const setupWorkspaceRules = [
  body('name')
    .notEmpty()
    .withMessage('Organization name is required')
    .isString()
    .withMessage('Organization name must be a string')
    .trim(),
];

// Check Organization Name availability route (authenticated context, decoupled setup)
router.get(
  '/check-name',
  isAuthenticated,
  validate(checkNameRules),
  organizationController.checkName
);

// Setup Workspace route (authenticated context, decoupled setup)
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

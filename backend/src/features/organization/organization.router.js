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



// Feature onboarding route (tenant context)
router.patch(
  '/:id/features',
  isAuthenticated,
  tenantContext,
  validate(updateFeaturesRules),
  organizationController.updateFeatures
);

export default router;

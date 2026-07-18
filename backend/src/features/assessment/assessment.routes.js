import { Router } from 'express';
import assessmentController from './assessment.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import { createAssessmentSchema, updateAssessmentSchema } from './assessment.validator.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import { authorizePermission } from '../../middlewares/rbac.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';

const router = Router();

// Secure all assessment routes
router.use(isAuthenticated);
router.use(tenantContext);

router.post(
  '/',
  authorizePermission('billing', 'assessment_manager'),
  validate(createAssessmentSchema),
  assessmentController.create
);

router.get(
  '/',
  authorizePermission('billing', 'assessment_manager'),
  assessmentController.getAll
);

router.patch(
  '/:id',
  authorizePermission('billing', 'assessment_manager'),
  validate(updateAssessmentSchema),
  assessmentController.update
);

router.delete(
  '/:id',
  authorizePermission('billing', 'assessment_manager'),
  assessmentController.delete
);

router.post(
  '/:id/run',
  authorizePermission('billing', 'assessment_manager'),
  assessmentController.run
);

export default router;

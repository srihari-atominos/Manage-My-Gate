import { Router } from 'express';
import enquiryController from './enquiry.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';
import {
  createEnquiryRules,
  updateEnquiryStatusRules,
  assignEnquiryRules,
  convertEnquiryRules,
} from './enquiry.validator.js';

const router = Router();
import './enquiry.listeners.js';

// Public route for community registration
router.post(
  '/enquiry',
  validate(createEnquiryRules),
  enquiryController.create
);

// Protected CRM routes
router.use(isAuthenticated);
// Platform staff only. Decided by the signed isPlatform claim, never by role names
// (the default rbac export is authorizePermission, which let any community admin through).
router.use(tenantContext({ requirePlatformContext: true }));

router.post('/enquiries/ensure', enquiryController.ensureInquiry);

router.get(
  '/enquiries',
  enquiryController.getAll
);

router.get(
  '/enquiries/:id',
  enquiryController.getById
);

router.patch(
  '/enquiries/:id/status',
  validate(updateEnquiryStatusRules),
  enquiryController.updateStatus
);

router.patch(
  '/enquiries/:id/assign',
  validate(assignEnquiryRules),
  enquiryController.assign
);

router.post(
  '/enquiries/:id/convert',
  validate(convertEnquiryRules),
  enquiryController.convert
);

// 360 View Endpoints
router.get('/enquiries/:id/activities', enquiryController.getActivities);
router.post('/enquiries/:id/activities', enquiryController.addActivity);
router.get('/enquiries/:id/stage-history', enquiryController.getStageHistory);
router.get('/enquiries/:id/insights', enquiryController.getInsights);
router.patch('/enquiries/:id/stage', validate(updateEnquiryStatusRules), enquiryController.updateStage);

export default router;

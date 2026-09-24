import { Router } from 'express';
import issueReportController from './issueReport.controller.js';
import { upload, imageSignatureValidator } from './middlewares/upload.middleware.js';
import { validate } from '../../middlewares/validator.middleware.js';
import {
  createReportRules,
  queryPlatformReportsRules,
  getReportByIdRules,
} from './issueReport.validator.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';

// Primary router mounted at /support/reports
const router = Router();

/**
 * @route   POST /api/v1/support/reports
 * @desc    Submit an issue report (Resident / User within active workspace context)
 * @access  Private (Authenticated Active User + Tenant Context)
 */
router.post(
  '/',
  isAuthenticated,
  tenantContext(),
  upload.single('screenshot'),
  imageSignatureValidator,
  validate(createReportRules),
  issueReportController.submitReport.bind(issueReportController)
);

// Platform Admin router mounted at /platform/reports
const platformReportRouter = Router();

/**
 * @route   GET /api/v1/platform/reports
 * @desc    List all system issue reports with pagination, filtering & search
 * @access  Private (Platform Super Admin only)
 */
platformReportRouter.get(
  '/',
  isAuthenticated,
  tenantContext({ requirePlatformContext: true }),
  validate(queryPlatformReportsRules),
  issueReportController.getPlatformReports.bind(issueReportController)
);

/**
 * @route   GET /api/v1/platform/reports/:id
 * @desc    Get detailed report view by MongoDB ID
 * @access  Private (Platform Super Admin only)
 */
platformReportRouter.get(
  '/:id',
  isAuthenticated,
  tenantContext({ requirePlatformContext: true }),
  validate(getReportByIdRules),
  issueReportController.getReportById.bind(issueReportController)
);

// Also expose platform endpoints on the root router for alternative routing flexibility
router.get(
  '/platform/reports',
  isAuthenticated,
  tenantContext({ requirePlatformContext: true }),
  validate(queryPlatformReportsRules),
  issueReportController.getPlatformReports.bind(issueReportController)
);

router.get(
  '/platform/reports/:id',
  isAuthenticated,
  tenantContext({ requirePlatformContext: true }),
  validate(getReportByIdRules),
  issueReportController.getReportById.bind(issueReportController)
);

export { platformReportRouter };
export default router;

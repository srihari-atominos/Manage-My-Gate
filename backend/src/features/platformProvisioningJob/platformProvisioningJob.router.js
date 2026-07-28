import { Router } from 'express';
import controller from './platformProvisioningJob.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import {
  createJobRules,
  queryJobRules,
  getJobByIdRules,
} from './platformProvisioningJob.validator.js';

const router = Router();

/**
 * POST /
 * Create a platform provisioning job.
 */
router.post(
  '/',
  validate(createJobRules),
  controller.createJob
);

/**
 * GET /
 * Retrieve paginated platform provisioning jobs list.
 */
router.get(
  '/',
  validate(queryJobRules),
  controller.listJobs
);

/**
 * GET /:id
 * Retrieve platform provisioning job by ID or Job String.
 */
router.get(
  '/:id',
  validate(getJobByIdRules),
  controller.getJobById
);

/**
 * POST /:id/retry
 * Trigger manual retry for a failed/MANUAL_REVIEW job.
 */
router.post(
  '/:id/retry',
  validate(getJobByIdRules),
  controller.retryJob
);

/**
 * POST /:id/cancel
 * Cancel a provisioning job.
 */
router.post(
  '/:id/cancel',
  validate(getJobByIdRules),
  controller.cancelJob
);

export default router;

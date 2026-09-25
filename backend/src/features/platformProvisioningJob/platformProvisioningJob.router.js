import { Router } from 'express';
import platformProvisioningJobController from './platformProvisioningJob.controller.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';

const router = Router();

router.use(isAuthenticated, tenantContext({ requirePlatformContext: true }));

router.get('/', platformProvisioningJobController.getAll);
router.get('/:id/checkpoints', platformProvisioningJobController.getCheckpoints);
router.post('/:id/retry', platformProvisioningJobController.retryFromCheckpoint);

export default router;

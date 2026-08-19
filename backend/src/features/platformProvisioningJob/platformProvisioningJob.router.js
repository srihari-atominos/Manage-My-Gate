import { Router } from 'express';
import platformProvisioningJobController from './platformProvisioningJob.controller.js';

const router = Router();

router.get('/', platformProvisioningJobController.getAll);
router.get('/:id/checkpoints', platformProvisioningJobController.getCheckpoints);
router.post('/:id/retry', platformProvisioningJobController.retryFromCheckpoint);

export default router;

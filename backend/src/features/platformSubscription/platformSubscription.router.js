import { Router } from 'express';
import platformSubscriptionController from './platformSubscription.controller.js';

const router = Router();

router.get('/', platformSubscriptionController.getAll);
router.get('/:id', platformSubscriptionController.getById);
router.get('/:id/renewal', platformSubscriptionController.getRenewal);
router.post('/:id/suspend', platformSubscriptionController.suspend);
router.post('/:id/cancel', platformSubscriptionController.cancel);
router.post('/:id/renew', platformSubscriptionController.renewSubscriptionById);
router.post('/renew-organization', platformSubscriptionController.renewOrganization);

export default router;

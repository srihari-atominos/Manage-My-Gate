import { Router } from 'express';
import platformSubscriptionController from './platformSubscription.controller.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';

const router = Router();

router.use(isAuthenticated, tenantContext({ requirePlatformContext: true }));

router.get('/', platformSubscriptionController.getAll);
router.get('/:id', platformSubscriptionController.getById);
router.get('/:id/renewal', platformSubscriptionController.getRenewal);
router.post('/:id/suspend', platformSubscriptionController.suspend);
router.post('/:id/cancel', platformSubscriptionController.cancel);
router.post('/:id/renew', platformSubscriptionController.renewSubscriptionById);
router.post('/renew-organization', platformSubscriptionController.renewOrganization);

export default router;

import { Router } from 'express';
import platformOrderController from './platformOrder.controller.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';

const router = Router();

router.use(isAuthenticated, tenantContext({ requirePlatformContext: true }));

router.get('/', platformOrderController.getAll);
router.get('/:id', platformOrderController.getById);
router.get('/:id/timeline', platformOrderController.getTimeline);
router.get('/:id/billing-schedule', platformOrderController.getBillingSchedules);
router.get('/:id/amendments', platformOrderController.getAmendments);
router.post('/from-quote/:quoteId', platformOrderController.convertFromQuote);
router.post('/:id/confirm', platformOrderController.confirm);
router.post('/:id/amend', platformOrderController.createAmendment);

export default router;

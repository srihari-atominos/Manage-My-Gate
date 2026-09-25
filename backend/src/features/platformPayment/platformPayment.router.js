import { Router } from 'express';
import platformPaymentController from './platformPayment.controller.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';

const router = Router();

// Platform finance operations are internal. The customer-facing, signed
// payment webhook remains at /payments/webhook/razorpay.
router.use(isAuthenticated, tenantContext({ requirePlatformContext: true }));

router.get('/', platformPaymentController.getAll);
router.get('/outbox', platformPaymentController.getOutboxEvents);
router.post('/create-order', platformPaymentController.createOrder);
router.post('/send-reminder', platformPaymentController.sendReminder);
router.post('/webhook', platformPaymentController.handleWebhook);
router.post('/offline', platformPaymentController.recordOffline);
router.post('/reconcile-offline', platformPaymentController.recordOffline);
router.get('/:id/allocations', platformPaymentController.getAllocations);
router.post('/:id/reconcile', platformPaymentController.reconcile);
router.post('/events/:id/replay', platformPaymentController.replayOutboxEvent);

export default router;

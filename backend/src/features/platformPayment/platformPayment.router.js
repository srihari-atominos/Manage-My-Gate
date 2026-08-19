import { Router } from 'express';
import platformPaymentController from './platformPayment.controller.js';
import { optionalAuth } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(optionalAuth);

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

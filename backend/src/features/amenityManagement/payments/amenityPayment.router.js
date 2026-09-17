import { Router } from 'express';
import amenityPaymentController from './amenityPayment.controller.js';
import { paymentWebhookRules } from './amenityPayment.validateRules.js';
import validate from '../../../middlewares/validator.middleware.js';

const router = Router();

// POST /webhook - Payment webhook endpoint
router.post(
  '/webhook',
  validate(paymentWebhookRules),
  amenityPaymentController.handleWebhook
);

export default router;

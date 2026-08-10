import { Router } from 'express';
import express from 'express';
import webhookController from './webhook.controller.js';

const router = Router();

// Critical Security: express.raw({ type: 'application/json' }) strictly for this endpoint to preserve the raw request body.
// This is mathematically required to generate a valid SHA256 HMAC signature.
router.post(
  '/razorpay',
  express.raw({ type: 'application/json' }),
  webhookController.handleRazorpayWebhook
);

export default router;

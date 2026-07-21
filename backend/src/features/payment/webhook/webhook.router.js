import express from 'express';
import { handleRazorpayWebhook } from './razorpay.webhook.js';

const webhookRouter = express.Router();

/**
 * Webhook route capturing raw buffer for HMAC SHA256 signature verification.
 */
webhookRouter.post('/razorpay', express.raw({ type: 'application/json' }), handleRazorpayWebhook);

export default webhookRouter;

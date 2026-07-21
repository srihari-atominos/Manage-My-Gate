import express from 'express';
import paymentController from './payment.controller.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import webhookRouter from './webhook/webhook.router.js';

const router = express.Router();

// Mount public webhook route (raw body parsing inside webhookRouter)
router.use('/webhook', webhookRouter);

// Order creation, verification, and refund endpoints
router.post('/create-order', isAuthenticated, paymentController.createOrder);
router.post('/verify-signature', isAuthenticated, paymentController.verifySignature);
router.post('/refund', isAuthenticated, paymentController.refund);

// Mock endpoint to simulate payment callback from UI
router.post('/simulate', isAuthenticated, paymentController.simulateCallback);

export default router;

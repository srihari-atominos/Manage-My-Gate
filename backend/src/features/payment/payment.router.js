import express from 'express';
import paymentController from './payment.controller.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Mock endpoint to simulate payment callback from a UI
router.post('/simulate', isAuthenticated, paymentController.simulateCallback);

export default router;

import express from 'express';
import { getMyWallet, addMoney, payInvoice, createOrder, verifyPayment } from './wallet.controller.js';
import { isAuthenticated } from '../../middlewares/auth.middleware.js';
import { authorizeAnyPermission } from '../../middlewares/rbac.middleware.js';

const router = express.Router();

router.use(isAuthenticated);

const WALLET_PERMISSIONS = ['wallet:access', 'wallet:manage', 'billing:wallet', 'amenities:wallet'];

// Route to get current user's wallet
router.get('/', authorizeAnyPermission(WALLET_PERMISSIONS), getMyWallet);
router.post('/add-money', authorizeAnyPermission(WALLET_PERMISSIONS), addMoney);
router.post('/pay-invoice', authorizeAnyPermission(WALLET_PERMISSIONS), payInvoice);
router.post('/create-order', authorizeAnyPermission(WALLET_PERMISSIONS), createOrder);
router.post('/verify-payment', authorizeAnyPermission(WALLET_PERMISSIONS), verifyPayment);

export default router;

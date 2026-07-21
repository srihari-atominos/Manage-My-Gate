import express from 'express';
import { getMyWallet, addMoney, payInvoice } from './wallet.controller.js';
import { isAuthenticated } from '../../middlewares/auth.middleware.js';
import { authorizePermission } from '../../middlewares/rbac.middleware.js';

const router = express.Router();

router.use(isAuthenticated);

// Resident route to get their own wallet
router.get('/', authorizePermission(['billing', 'amenities'], 'wallet'), getMyWallet);
router.post('/add-money', authorizePermission(['billing', 'amenities'], 'wallet'), addMoney);
router.post('/pay-invoice', authorizePermission(['billing', 'amenities'], 'wallet'), payInvoice);

export default router;

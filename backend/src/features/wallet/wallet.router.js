import express from 'express';
import { getMyWallet, addMoney, payInvoice } from './wallet.controller.js';
import { isAuthenticated } from '../../middlewares/auth.middleware.js';
import { authorizePermission } from '../../middlewares/rbac.middleware.js';

const router = express.Router();

router.use(isAuthenticated);

// Resident route to get their own wallet
router.get('/', authorizePermission('amenities', 'wallet'), getMyWallet);
router.post('/add-money', authorizePermission('amenities', 'wallet'), addMoney);
router.post('/pay-invoice', authorizePermission('amenities', 'wallet'), payInvoice);

export default router;

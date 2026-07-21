import express from 'express';
import { getMyWallet, addMoney, payInvoice } from './wallet.controller.js';
import { isAuthenticated } from '../../middlewares/auth.middleware.js';
import { authorizeAnyPermission } from '../../middlewares/rbac.middleware.js';

const router = express.Router();

router.use(isAuthenticated);

// Resident route to get their own wallet
router.get('/', authorizeAnyPermission(['billing:wallet', 'amenities:wallet']), getMyWallet);
router.post('/add-money', authorizeAnyPermission(['billing:wallet', 'amenities:wallet']), addMoney);
router.post('/pay-invoice', authorizeAnyPermission(['billing:wallet', 'amenities:wallet']), payInvoice);

export default router;

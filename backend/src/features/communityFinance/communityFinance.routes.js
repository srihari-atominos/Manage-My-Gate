import { Router } from 'express';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';
import { authorizePermission } from '../../middlewares/rbac.middleware.js';
import controller from './communityFinance.controller.js';
const router = Router();
router.use(isAuthenticated, tenantContext, authorizePermission('billing', ['dashboard', 'financial_ledger', 'reconciliation_manage']));
router.get('/dashboard', controller.dashboard); router.get('/collections', controller.collections); router.get('/outstanding', controller.outstanding); router.get('/expenses', controller.expenses); router.get('/receipts', controller.receipts); router.get('/exceptions', controller.exceptions);
export default router;
import { Router } from 'express';
import reconciliationController from './reconciliation.controller.js';
import { isAuthenticated } from '../../../middlewares/auth.middleware.js';
import tenantContext from '../../../middlewares/tenant.middleware.js';
import { authorizePermission } from '../../../middlewares/rbac.middleware.js';

const router = Router();

router.use(
  isAuthenticated,
  tenantContext,
  authorizePermission('billing', ['reconciliation_manage', 'financial_ledger', 'dashboard', 'assessment_manager'])
);

// Administrative reconciliation routes
router.get('/inventory', reconciliationController.getInventory);
router.post('/run', reconciliationController.runReconciliation);
router.get('/verify', reconciliationController.verifyInvariants);
router.get('/integrity', reconciliationController.getIntegrity);
router.get('/metrics', reconciliationController.getMetrics);
router.get('/reports/:runId', reconciliationController.getRunReport);
router.get('/exceptions', reconciliationController.getExceptions);
router.patch('/exceptions/:exceptionId', reconciliationController.updateException);

export default router;

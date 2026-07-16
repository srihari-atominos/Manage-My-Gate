import { Router } from 'express';
import invoiceController from './invoice.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import { manualTriggerSchema, offlineSettleSchema } from './invoice.validator.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import { authorizePermission } from '../../middlewares/rbac.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';

const router = Router();

// Secure all invoice routes with authentication
router.use(isAuthenticated);

// Open to all authenticated users (personal dues summary doesn't require x-organization-id tenant context header check)
router.get('/my-dues', invoiceController.getMyDues);

// Features requiring tenant organization context and permissions
router.get(
  '/',
  tenantContext,
  invoiceController.getAllInvoices
);

router.get(
  '/kpis',
  tenantContext,
  invoiceController.getDashboardKPIs
);

router.post(
  '/trigger-manual',
  tenantContext,
  validate(manualTriggerSchema),
  invoiceController.triggerManual
);

router.patch(
  '/:id/settle-offline',
  tenantContext,
  validate(offlineSettleSchema),
  invoiceController.settleOffline
);

export default router;

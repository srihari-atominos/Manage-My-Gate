import { Router } from 'express';
import invoiceController from './invoice.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import { manualTriggerSchema, offlineSettleSchema, approveInvoiceSchema } from './invoice.validator.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import { authorizePermission } from '../../middlewares/rbac.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';

const router = Router();

// Secure all invoice routes with authentication
router.use(isAuthenticated);

// Open to all authenticated users (personal dues summary doesn't require x-organization-id tenant context header check)
router.get(
  '/my-dues',
  authorizePermission('billing', 'action_center'),
  invoiceController.getMyDues
);

// Features requiring tenant organization context and permissions
router.get(
  '/',
  tenantContext,
  authorizePermission('billing', ['dashboard', 'assessment_manager']),
  invoiceController.getAllInvoices
);

router.get(
  '/kpis',
  tenantContext,
  authorizePermission('billing', 'dashboard'),
  invoiceController.getDashboardKPIs
);

router.post(
  '/trigger-manual',
  tenantContext,
  authorizePermission('billing', 'assessment_manager'),
  validate(manualTriggerSchema),
  invoiceController.triggerManual
);

router.patch(
  '/:id/settle-offline',
  tenantContext,
  authorizePermission('billing', ['action_center', 'dashboard', 'assessment_manager']),
  validate(offlineSettleSchema),
  invoiceController.settleOffline
);

router.patch(
  '/:id/approve',
  tenantContext,
  authorizePermission('billing', ['dashboard', 'assessment_manager']),
  validate(approveInvoiceSchema),
  invoiceController.approvePayment
);

export default router;

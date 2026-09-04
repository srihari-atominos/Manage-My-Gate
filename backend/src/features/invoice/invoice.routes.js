import { Router } from 'express';
import invoiceController from './invoice.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import { manualTriggerSchema, offlineSettleSchema, approveInvoiceSchema, rejectOfflineSchema, rejectInvoiceSchema, recordCashPaymentSchema } from './invoice.validator.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import './invoice.listeners.js';
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

router.get(
  '/cash-collections',
  tenantContext,
  authorizePermission('billing', ['dashboard', 'assessment_manager', 'action_center']),
  invoiceController.getCashCollections
);

router.get(
  '/search-cash-eligible',
  tenantContext,
  authorizePermission('billing', ['dashboard', 'assessment_manager', 'action_center']),
  invoiceController.searchCashEligible
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

router.post(
  '/trigger-whatsapp',
  tenantContext,
  authorizePermission('billing', 'assessment_manager'),
  validate(manualTriggerSchema),
  invoiceController.triggerWhatsApp
);

router.patch(
  '/:id/settle-offline',
  tenantContext,
  authorizePermission('billing', ['action_center', 'dashboard', 'assessment_manager']),
  validate(offlineSettleSchema),
  invoiceController.settleOffline
);

router.post(
  '/:id/record-cash',
  tenantContext,
  authorizePermission('billing', ['dashboard', 'assessment_manager', 'action_center']),
  validate(recordCashPaymentSchema),
  invoiceController.recordCashPayment
);

router.get(
  '/:id',
  authorizePermission('billing', ['action_center', 'dashboard', 'assessment_manager']),
  invoiceController.getInvoiceById
);

router.patch(
  '/:id/approve',
  tenantContext,
  authorizePermission('billing', ['dashboard', 'assessment_manager']),
  validate(approveInvoiceSchema),
  invoiceController.approvePayment
);

router.patch(
  '/:id/reject',
  tenantContext,
  authorizePermission('billing', ['dashboard', 'assessment_manager']),
  validate(rejectOfflineSchema),
  invoiceController.rejectPayment
);

export default router;

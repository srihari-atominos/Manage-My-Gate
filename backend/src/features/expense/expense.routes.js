import { Router } from 'express';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';
import { authorizePermission } from '../../middlewares/rbac.middleware.js';
import { validate } from '../../middlewares/validator.middleware.js';
import controller from './expense.controller.js';
import { createExpenseSchema, paymentSchema, reconciliationSchema } from './expense.validator.js';
import { expenseUpload, expenseFileSignatureValidator } from './expenseUpload.middleware.js';
const router = Router();
router.use(isAuthenticated, tenantContext);
router.get('/summary', authorizePermission('billing', ['view_expense', 'dashboard']), controller.summary);
router.get('/', authorizePermission('billing', ['view_expense', 'dashboard']), controller.list);
router.post('/', authorizePermission('billing', ['create_expense', 'dashboard']), validate(createExpenseSchema), controller.create);
router.get('/:id', authorizePermission('billing', ['view_expense', 'dashboard']), controller.get);
router.post('/:id/payments', authorizePermission('billing', ['record_expense_payment', 'create_expense', 'dashboard']), validate(paymentSchema), controller.payment);
router.post('/:id/payments/:paymentId/reconcile', authorizePermission('billing', ['reconcile_expense_payment', 'dashboard']), validate(reconciliationSchema), controller.reconcile);
router.post('/:id/attachments', authorizePermission('billing', ['create_expense', 'dashboard']), expenseUpload.single('attachment'), expenseFileSignatureValidator, controller.uploadAttachment);
router.get('/:id/attachments/:attachmentId', authorizePermission('billing', ['view_expense', 'dashboard']), controller.downloadAttachment);
export default router;



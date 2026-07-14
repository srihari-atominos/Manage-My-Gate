import express from 'express';
import complaintSettingsController from './complaintSettings.controller.js';
import { updateSettingsValidator } from './complaintSettings.validators.js';
import { authorizePermission } from '../../middlewares/rbac.middleware.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';

const router = express.Router();

router.use(isAuthenticated, tenantContext);

router.get(
  '/',
  authorizePermission('complaints', ['settings', 'create', 'raise_ticket', 'track_requests', 'complaint_management', 'dashboard', 'assignee']),
  complaintSettingsController.getSettings
);

router.put(
  '/',
  authorizePermission('complaints', 'settings'),
  updateSettingsValidator,
  complaintSettingsController.updateSettings
);

export default router;

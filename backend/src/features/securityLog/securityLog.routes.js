import { Router } from 'express';
import { getLogs, getDashboardStats, manualVerification } from './securityLog.controller.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import { authorizePermission } from '../../middlewares/rbac.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';

const router = Router();

// Protect all routes
router.use(isAuthenticated, tenantContext);

// Dashboard stats - admins & guards
router.get('/dashboard', authorizePermission('amenities', 'security_logs'), getDashboardStats);

// Manual verification log
router.post('/manual', authorizePermission('amenities', 'scanner'), manualVerification);

// List security logs with filters
router.get('/', authorizePermission('amenities', 'security_logs'), getLogs);

export default router;

import { Router } from 'express';
import auditLogController from './auditLog.controller.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';

const router = Router();

// Retrieve paginated list of audit logs (Platform Admin only)
router.get('/', isAuthenticated, tenantContext({ requirePlatformContext: true }), auditLogController.getAll);

export default router;

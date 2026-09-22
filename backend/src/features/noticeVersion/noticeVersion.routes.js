import { Router } from 'express';
import noticeVersionController from './noticeVersion.controller.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';
import { authorizePermission } from '../../middlewares/rbac.middleware.js';

const router = Router({ mergeParams: true });

router.use(isAuthenticated);
router.use(tenantContext);

router.get(
  '/',
  authorizePermission('notices', ['active_board', 'manage_notices', 'read', 'dashboard']),
  noticeVersionController.getVersions
);

router.get(
  '/:version',
  authorizePermission('notices', ['active_board', 'manage_notices', 'read', 'dashboard']),
  noticeVersionController.getVersionByNumber
);

export default router;

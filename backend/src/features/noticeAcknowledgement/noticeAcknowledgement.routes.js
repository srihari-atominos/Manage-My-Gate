import { Router } from 'express';
import noticeAcknowledgementController from './noticeAcknowledgement.controller.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';
import { authorizePermission } from '../../middlewares/rbac.middleware.js';

const router = Router({ mergeParams: true });

router.use(isAuthenticated);
router.use(tenantContext);

router.post(
  '/acknowledge',
  authorizePermission('notices', ['active_board', 'manage_notices', 'read']),
  noticeAcknowledgementController.acknowledge
);

router.get(
  '/acknowledgements',
  authorizePermission('notices', ['active_board', 'manage_notices', 'read', 'dashboard']),
  noticeAcknowledgementController.getAcknowledgements
);

export default router;

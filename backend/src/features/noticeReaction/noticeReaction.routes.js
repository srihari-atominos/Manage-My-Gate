import { Router } from 'express';
import noticeReactionController from './noticeReaction.controller.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';
import { authorizePermission } from '../../middlewares/rbac.middleware.js';

const router = Router({ mergeParams: true });

router.use(isAuthenticated);
router.use(tenantContext);

router.post(
  '/',
  authorizePermission('notices', ['active_board', 'manage_notices', 'read']),
  noticeReactionController.toggleReaction
);

router.get(
  '/',
  authorizePermission('notices', ['active_board', 'manage_notices', 'read', 'dashboard']),
  noticeReactionController.getReactions
);

export default router;

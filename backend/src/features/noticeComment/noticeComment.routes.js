import { Router } from 'express';
import noticeCommentController from './noticeComment.controller.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';
import { authorizePermission } from '../../middlewares/rbac.middleware.js';

const router = Router({ mergeParams: true });

router.use(isAuthenticated);
router.use(tenantContext);

router.post(
  '/',
  authorizePermission('notices', ['active_board', 'manage_notices', 'read']),
  noticeCommentController.addComment
);

router.get(
  '/',
  authorizePermission('notices', ['active_board', 'manage_notices', 'read', 'dashboard']),
  noticeCommentController.getComments
);

router.delete(
  '/:commentId',
  authorizePermission('notices', ['active_board', 'manage_notices', 'read']),
  noticeCommentController.deleteComment
);

export default router;

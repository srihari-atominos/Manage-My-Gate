import { Router } from 'express';
import pollReactionController from './pollReaction.controller.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';
import { authorizePermission } from '../../middlewares/rbac.middleware.js';

const router = Router({ mergeParams: true });

router.use(isAuthenticated);
router.use(tenantContext);

const POLL_REACTION_PERMISSIONS = ['polls', 'manage_notices', 'manage_polls', 'view_polls', 'active_board', 'read', 'polls:read', 'vote_polls'];

router.post(
  '/',
  authorizePermission(['notices', 'polls'], POLL_REACTION_PERMISSIONS),
  pollReactionController.toggleReaction
);

router.get(
  '/',
  authorizePermission(['notices', 'polls'], POLL_REACTION_PERMISSIONS),
  pollReactionController.getReactions
);

export default router;

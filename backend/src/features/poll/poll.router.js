import express from 'express';
import * as pollController from './poll.controller.js';
import * as pollValidation from './poll.validateRules.js';
import { validate } from '../../middlewares/validator.middleware.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import { authorizePermission } from '../../middlewares/rbac.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';

const router = express.Router();

// Apply auth and requireOrg to all routes
router.use(isAuthenticated);
router.use(tenantContext);

const POLL_READ_PERMISSIONS = ['polls', 'manage_notices', 'manage_polls', 'view_polls', 'active_board', 'read', 'dashboard', 'polls:read'];
const POLL_MANAGE_PERMISSIONS = ['manage_polls', 'manage_notices', 'polls', 'create', 'update', 'delete', 'publish', 'close', 'polls:create', 'polls:update', 'polls:delete', 'polls:close'];
const POLL_VOTE_PERMISSIONS = ['polls', 'vote_polls', 'manage_notices', 'active_board', 'read', 'vote', 'polls:vote'];
const POLL_VIEW_VOTERS_PERMISSIONS = ['manage_polls', 'manage_notices', 'polls', 'view_voters', 'polls:view_voters'];
const POLL_EXPORT_PERMISSIONS = ['manage_polls', 'manage_notices', 'polls', 'export', 'polls:export'];

// Collection endpoints
router.post(
  '/',
  authorizePermission(['notices', 'polls'], POLL_MANAGE_PERMISSIONS),
  validate(pollValidation.createPollRules()),
  pollController.createPoll
);

router.get(
  '/',
  authorizePermission(['notices', 'polls'], POLL_READ_PERMISSIONS),
  validate(pollValidation.paginationRules()),
  pollController.getPolls
);

// Status-specific collections
router.get(
  '/active',
  authorizePermission(['notices', 'polls'], POLL_READ_PERMISSIONS),
  validate(pollValidation.paginationRules()),
  pollController.getActivePolls
);

router.get(
  '/closed',
  authorizePermission(['notices', 'polls'], POLL_READ_PERMISSIONS),
  validate(pollValidation.paginationRules()),
  pollController.getClosedPolls
);

router.get(
  '/my',
  authorizePermission(['notices', 'polls'], POLL_READ_PERMISSIONS),
  validate(pollValidation.paginationRules()),
  pollController.getMyPolls
);

// Specific Poll Endpoints
router.get(
  '/:id',
  authorizePermission(['notices', 'polls'], POLL_READ_PERMISSIONS),
  validate(pollValidation.validateIdRule()),
  pollController.getPollById
);

router.put(
  '/:id',
  authorizePermission(['notices', 'polls'], POLL_MANAGE_PERMISSIONS),
  validate(pollValidation.updatePollRules()),
  pollController.updatePoll
);

router.delete(
  '/:id',
  authorizePermission(['notices', 'polls'], POLL_MANAGE_PERMISSIONS),
  validate(pollValidation.validateIdRule()),
  pollController.deletePoll
);

// Actions
router.post(
  '/:id/publish',
  authorizePermission(['notices', 'polls'], POLL_MANAGE_PERMISSIONS),
  validate(pollValidation.validateIdRule()),
  pollController.publishPoll
);

router.post(
  '/:id/close',
  authorizePermission(['notices', 'polls'], POLL_MANAGE_PERMISSIONS),
  validate(pollValidation.validateIdRule()),
  pollController.closePoll
);

router.post(
  '/:id/finalize',
  authorizePermission(['notices', 'polls'], POLL_MANAGE_PERMISSIONS),
  validate(pollValidation.validateIdRule()),
  pollController.finalizePoll
);

router.post(
  '/:id/reopen',
  authorizePermission(['notices', 'polls'], POLL_MANAGE_PERMISSIONS),
  validate(pollValidation.validateIdRule()),
  pollController.reopenPoll
);

router.post(
  '/:id/vote',
  authorizePermission(['notices', 'polls'], POLL_VOTE_PERMISSIONS),
  validate(pollValidation.voteRules()),
  pollController.voteOnPoll
);

// Results & Analytics
router.get(
  '/:id/results',
  authorizePermission(['notices', 'polls'], POLL_READ_PERMISSIONS),
  validate(pollValidation.validateIdRule()),
  pollController.getPollResults
);

router.get(
  '/:id/voters',
  authorizePermission(['notices', 'polls'], POLL_VIEW_VOTERS_PERMISSIONS),
  validate(pollValidation.validateIdRule()),
  pollController.getPollVoters
);

// Governance Exports
router.get(
  '/:id/export/csv',
  authorizePermission(['notices', 'polls'], POLL_EXPORT_PERMISSIONS),
  validate(pollValidation.validateIdRule()),
  pollController.exportPollCSV
);

router.get(
  '/:id/export/json',
  authorizePermission(['notices', 'polls'], POLL_EXPORT_PERMISSIONS),
  validate(pollValidation.validateIdRule()),
  pollController.exportPollJSON
);

export default router;

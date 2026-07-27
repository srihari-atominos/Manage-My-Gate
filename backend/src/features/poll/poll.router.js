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

// Require notices:polls for all poll operations (since Polls are inside Notice Board)
router.use(authorizePermission('notices', 'polls'));

// Collection endpoints
router.post('/', validate(pollValidation.createPollRules()), pollController.createPoll);
router.get('/', validate(pollValidation.paginationRules()), pollController.getPolls);

// Status-specific collections
router.get('/active', validate(pollValidation.paginationRules()), pollController.getActivePolls);
router.get('/closed', validate(pollValidation.paginationRules()), pollController.getClosedPolls);
router.get('/my', validate(pollValidation.paginationRules()), pollController.getMyPolls);

// Specific Poll Endpoints
router.get('/:id', validate(pollValidation.validateIdRule()), pollController.getPollById);
router.put('/:id', validate(pollValidation.updatePollRules()), pollController.updatePoll);
router.delete('/:id', validate(pollValidation.validateIdRule()), pollController.deletePoll);

// Actions
router.post('/:id/publish', validate(pollValidation.validateIdRule()), pollController.publishPoll);
router.post('/:id/close', validate(pollValidation.validateIdRule()), pollController.closePoll);
router.post('/:id/vote', validate(pollValidation.voteRules()), pollController.voteOnPoll);

// Results
router.get('/:id/results', validate(pollValidation.validateIdRule()), pollController.getPollResults);
router.get('/:id/voters', validate(pollValidation.validateIdRule()), pollController.getPollVoters);

export default router;

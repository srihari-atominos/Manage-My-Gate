import { Router } from 'express';
import visitorLogController from './visitorLog.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import { preApprovedEntryRules, walkInRequestRules, resolveWalkInRules } from './visitorLog.validator.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';

const router = Router();

router.post('/pre-approved', validate(preApprovedEntryRules), visitorLogController.logPreApproved);
router.post('/walk-in', validate(walkInRequestRules), visitorLogController.initiateWalkIn);
router.patch('/walk-in/:id/resolve', validate(resolveWalkInRules), visitorLogController.resolveWalkIn);
router.patch('/:id/checkout', visitorLogController.checkout);
router.get('/org/:orgId/inside', visitorLogController.getInside);
router.get('/org/:orgId/pending', isAuthenticated, visitorLogController.getPending);

export default router;

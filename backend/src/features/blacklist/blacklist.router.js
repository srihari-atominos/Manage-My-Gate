import { Router } from 'express';
import blacklistController from './blacklist.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import { createBlacklistRules, deleteBlacklistRules, checkMatchRules } from './blacklist.validator.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';

const router = Router();

router.post('/', isAuthenticated, validate(createBlacklistRules), blacklistController.create);
router.delete('/:id', isAuthenticated, validate(deleteBlacklistRules), blacklistController.delete);
router.get('/org/:orgId', isAuthenticated, blacklistController.getByOrgPaginated);
router.get('/org/:orgId/check-match', isAuthenticated, validate(checkMatchRules), blacklistController.checkMatch);

export default router;

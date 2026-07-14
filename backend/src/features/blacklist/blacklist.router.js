import { Router } from 'express';
import blacklistController from './blacklist.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import { createBlacklistRules, deleteBlacklistRules, checkMatchRules } from './blacklist.validator.js';

const router = Router();

router.post('/', validate(createBlacklistRules), blacklistController.create);
router.delete('/:id', validate(deleteBlacklistRules), blacklistController.delete);
router.get('/org/:orgId', blacklistController.getByOrgPaginated);
router.get('/org/:orgId/check-match', validate(checkMatchRules), blacklistController.checkMatch);

export default router;

import { Router } from 'express';
import crmThreadController from './crmThread.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import {
  createThreadRules,
  addMessageRules,
  getThreadByInquiryRules,
  getThreadByIdRules,
  queryThreadRules,
} from './crmThread.validator.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';

const router = Router();

router.use(isAuthenticated, tenantContext({ requirePlatformContext: true }));

router.get('/', validate(queryThreadRules), crmThreadController.getAll);
router.get('/inquiry/:inquiryId', validate(getThreadByInquiryRules), crmThreadController.getByInquiryId);
router.post('/', validate(createThreadRules), crmThreadController.create);
router.post('/inquiry/:inquiryId/messages', validate(addMessageRules), crmThreadController.addMessage);
router.delete('/:id', validate(getThreadByIdRules), crmThreadController.delete);

export default router;

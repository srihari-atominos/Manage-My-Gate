import { Router } from 'express';
import platformQuoteController from './platformQuote.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import {
  createQuoteRules,
  quoteIdRules,
  acceptQuoteRules,
  queryQuoteRules,
} from './platformQuote.validator.js';

const router = Router();

router.get('/', validate(queryQuoteRules), platformQuoteController.getAll);
router.get('/:id', validate(quoteIdRules), platformQuoteController.getById);
router.get('/:id/timeline', validate(quoteIdRules), platformQuoteController.getTimeline);
router.get('/:id/approvals', validate(quoteIdRules), platformQuoteController.getApprovals);
router.post('/', validate(createQuoteRules), platformQuoteController.create);
router.post('/:id/request-approval', validate(quoteIdRules), platformQuoteController.requestApproval);
router.post('/:id/approve', validate(quoteIdRules), platformQuoteController.approve);
router.post('/:id/send', validate(quoteIdRules), platformQuoteController.send);
router.post('/:id/view', validate(quoteIdRules), platformQuoteController.recordView);
router.post('/:id/accept', validate(acceptQuoteRules), platformQuoteController.accept);
router.post('/:id/reject', validate(acceptQuoteRules), platformQuoteController.reject);
router.post('/:id/new-version', validate(quoteIdRules), platformQuoteController.newVersion);
router.post('/:id/generate-order', platformQuoteController.generateOrder);

export default router;

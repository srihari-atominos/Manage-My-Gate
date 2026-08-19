import { Router } from 'express';
import crmInquiryController from './crmInquiry.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import {
  createInquiryRules,
  updateInquiryRules,
  getInquiryRules,
  queryInquiryRules,
  validateStatusTransition,
} from './crmInquiry.validator.js';
import './crmInquiry.listeners.js';

const router = Router();

router.get('/', validate(queryInquiryRules), crmInquiryController.getAll);
router.get('/:id', validate(getInquiryRules), crmInquiryController.getById);
router.get('/:id/timeline', validate(getInquiryRules), crmInquiryController.getTimeline);
router.get('/:id/summary', validate(getInquiryRules), crmInquiryController.getSummary);
router.post('/', validate(createInquiryRules), crmInquiryController.create);
router.patch('/:id/status', validate(validateStatusTransition), crmInquiryController.updateStatus);
router.put('/:id', validate(updateInquiryRules), crmInquiryController.update);
router.patch('/:id/assign', validate(getInquiryRules), crmInquiryController.assign);
router.delete('/:id', validate(getInquiryRules), crmInquiryController.delete);

export default router;

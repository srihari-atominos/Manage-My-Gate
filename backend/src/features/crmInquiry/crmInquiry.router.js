import { Router } from 'express';
import crmInquiryController from './crmInquiry.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import {
  createInquiryRules,
  updateInquiryRules,
  getInquiryRules,
  queryInquiryRules,
} from './crmInquiry.validator.js';

const router = Router();

router.get('/', validate(queryInquiryRules), crmInquiryController.getAll);
router.get('/:id', validate(getInquiryRules), crmInquiryController.getById);
router.post('/', validate(createInquiryRules), crmInquiryController.create);
router.put('/:id', validate(updateInquiryRules), crmInquiryController.update);
router.delete('/:id', validate(getInquiryRules), crmInquiryController.delete);

export default router;

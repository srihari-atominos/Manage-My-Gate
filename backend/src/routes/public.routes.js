import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import crmInquiryController from '../features/crmInquiry/crmInquiry.controller.js';
import { validate } from '../middlewares/validator.middleware.js';
import { validatePublicLead } from '../features/crmInquiry/crmInquiry.validator.js';

const router = Router();

const publicLeadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

router.post('/register-lead', publicLeadLimiter, validate(validatePublicLead), crmInquiryController.registerPublicLead);

export default router;

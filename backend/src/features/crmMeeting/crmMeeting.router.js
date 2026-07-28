import { Router } from 'express';
import crmMeetingController from './crmMeeting.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import {
  createMeetingRules,
  updateMeetingRules,
  getMeetingByIdRules,
  queryMeetingRules,
} from './crmMeeting.validator.js';

const router = Router();

router.get('/', validate(queryMeetingRules), crmMeetingController.getAll);
router.get('/:id', validate(getMeetingByIdRules), crmMeetingController.getById);
router.post('/', validate(createMeetingRules), crmMeetingController.create);
router.put('/:id', validate(updateMeetingRules), crmMeetingController.update);
router.delete('/:id', validate(getMeetingByIdRules), crmMeetingController.delete);

export default router;

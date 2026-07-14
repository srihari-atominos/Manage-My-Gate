import { body } from 'express-validator';
import validate from '../../middlewares/validator.middleware.js';

export const updateSettingsValidator = validate([
  body('categories').optional().isArray(),
  body('departments').optional().isArray(),
  body('priorities').optional().isArray(),
  body('severityLevels').optional().isArray(),
  body('slaRules').optional().isArray(),
  body('assignmentRules').optional().isObject(),
  body('workingHours').optional().isObject(),
  body('holidayCalendar').optional().isArray(),
  body('workflow').optional().isObject(),
  body('notifications').optional().isObject(),
  body('residentFeedback').optional().isObject(),
  body('ratingConfig').optional().isObject(),
  body('feedbackQuestions').optional().isArray(),
  body('commentSettings').optional().isObject(),
  body('feedbackVisibility').optional().isObject(),
  body('feedbackAnalytics').optional().isObject(),
  body('general').optional().isObject(),
  body('attachments').optional().isObject(),
  body('ticketFormat').optional().isObject(),
]);

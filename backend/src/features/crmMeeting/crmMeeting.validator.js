import { body, param, query } from 'express-validator';

export const createMeetingRules = [
  body('inquiryId')
    .notEmpty()
    .withMessage('inquiryId is required')
    .isMongoId()
    .withMessage('inquiryId must be a valid MongoDB ObjectId'),
  body('title')
    .notEmpty()
    .withMessage('Meeting title is required')
    .isString()
    .withMessage('Meeting title must be a string')
    .trim(),
  body('startTime')
    .notEmpty()
    .withMessage('Start date and time is required')
    .isISO8601()
    .withMessage('startTime must be a valid ISO 8601 date string'),
  body('endTime')
    .notEmpty()
    .withMessage('End date and time is required')
    .isISO8601()
    .withMessage('endTime must be a valid ISO 8601 date string'),
  body('platformParticipants')
    .optional()
    .isArray()
    .withMessage('platformParticipants must be an array of User ObjectIds'),
  body('customerParticipants')
    .optional()
    .isArray()
    .withMessage('customerParticipants must be an array'),
  body('googleMeetLink')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('googleMeetLink must be a valid URL'),
  body('status')
    .optional()
    .isIn(['SCHEDULED', 'COMPLETED', 'CANCELLED'])
    .withMessage('Invalid status value'),
];

export const updateMeetingRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid CRM Meeting ID'),
  body('inquiryId')
    .optional()
    .isMongoId()
    .withMessage('inquiryId must be a valid MongoDB ObjectId'),
  body('title')
    .optional()
    .isString()
    .withMessage('Meeting title must be a string')
    .trim(),
  body('startTime')
    .optional()
    .isISO8601()
    .withMessage('startTime must be a valid ISO 8601 date string'),
  body('endTime')
    .optional()
    .isISO8601()
    .withMessage('endTime must be a valid ISO 8601 date string'),
  body('platformParticipants')
    .optional()
    .isArray()
    .withMessage('platformParticipants must be an array of User ObjectIds'),
  body('customerParticipants')
    .optional()
    .isArray()
    .withMessage('customerParticipants must be an array'),
  body('googleMeetLink')
    .optional({ nullable: true })
    .isURL()
    .withMessage('googleMeetLink must be a valid URL'),
  body('status')
    .optional()
    .isIn(['SCHEDULED', 'COMPLETED', 'CANCELLED'])
    .withMessage('Invalid status value'),
];

export const getMeetingByIdRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid CRM Meeting ID'),
];

export const queryMeetingRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be an integer greater than or equal to 1'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100'),
  query('status')
    .optional()
    .isIn(['SCHEDULED', 'COMPLETED', 'CANCELLED'])
    .withMessage('Invalid status query filter'),
  query('inquiryId')
    .optional()
    .isMongoId()
    .withMessage('inquiryId query filter must be a valid MongoId'),
];

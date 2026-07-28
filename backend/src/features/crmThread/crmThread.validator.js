import { body, param, query } from 'express-validator';

export const createThreadRules = [
  body('inquiryId')
    .notEmpty()
    .withMessage('inquiryId is required')
    .isMongoId()
    .withMessage('inquiryId must be a valid MongoDB ObjectId'),
  body('messages')
    .optional()
    .isArray()
    .withMessage('messages must be an array'),
];

export const addMessageRules = [
  param('inquiryId')
    .isMongoId()
    .withMessage('Invalid Inquiry ID'),
  body('senderType')
    .notEmpty()
    .withMessage('senderType is required')
    .isIn(['AGENT', 'CUSTOMER'])
    .withMessage('senderType must be either AGENT or CUSTOMER'),
  body('content')
    .notEmpty()
    .withMessage('Message content is required')
    .isString()
    .withMessage('Message content must be a string')
    .trim(),
  body('senderId')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('senderId must be a valid MongoDB ObjectId'),
];

export const getThreadByInquiryRules = [
  param('inquiryId')
    .isMongoId()
    .withMessage('Invalid Inquiry ID'),
];

export const getThreadByIdRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid Thread ID'),
];

export const queryThreadRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be an integer greater than or equal to 1'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100'),
  query('inquiryId')
    .optional()
    .isMongoId()
    .withMessage('inquiryId query filter must be a valid MongoId'),
];

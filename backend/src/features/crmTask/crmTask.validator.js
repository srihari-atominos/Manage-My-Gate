import { body, param, query } from 'express-validator';

export const createTaskRules = [
  body('title')
    .notEmpty()
    .withMessage('Task title is required')
    .isString()
    .withMessage('Task title must be a string')
    .trim(),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .trim(),
  body('relatedInquiryId')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('relatedInquiryId must be a valid MongoDB ObjectId'),
  body('assignedTo')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('assignedTo must be a valid MongoDB ObjectId'),
  body('status')
    .optional()
    .isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED'])
    .withMessage('Invalid status value'),
  body('dueDate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('dueDate must be a valid ISO 8601 date string'),
];

export const updateTaskRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid CRM Task ID'),
  body('title')
    .optional()
    .isString()
    .withMessage('Task title must be a string')
    .trim(),
  body('description')
    .optional({ nullable: true })
    .isString()
    .withMessage('Description must be a string')
    .trim(),
  body('relatedInquiryId')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('relatedInquiryId must be a valid MongoDB ObjectId'),
  body('assignedTo')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('assignedTo must be a valid MongoDB ObjectId'),
  body('status')
    .optional()
    .isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED'])
    .withMessage('Invalid status value'),
  body('dueDate')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('dueDate must be a valid ISO 8601 date string'),
];

export const getTaskRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid CRM Task ID'),
];

export const queryTaskRules = [
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
    .isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED'])
    .withMessage('Invalid status query filter'),
  query('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('assignedTo query filter must be a valid MongoId'),
  query('relatedInquiryId')
    .optional()
    .isMongoId()
    .withMessage('relatedInquiryId query filter must be a valid MongoId'),
];

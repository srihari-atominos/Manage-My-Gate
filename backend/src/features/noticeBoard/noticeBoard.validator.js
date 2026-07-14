import { body, param } from 'express-validator';

/**
 * Validation rules for creating a Notice.
 */
export const createNoticeRules = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isString()
    .withMessage('Title must be a string')
    .trim()
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),

  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isString()
    .withMessage('Description must be a string')
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),

  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isIn(['General', 'Maintenance', 'Events', 'Emergency', 'Meetings'])
    .withMessage('Category must be one of: General, Maintenance, Events, Emergency, Meetings'),

  body('priority')
    .notEmpty()
    .withMessage('Priority is required')
    .isIn(['Low', 'Medium', 'High', 'Critical'])
    .withMessage('Priority must be one of: Low, Medium, High, Critical'),

  body('status')
    .optional()
    .isIn(['Draft', 'Published', 'Scheduled', 'Archived', 'Expired'])
    .withMessage('Status must be one of: Draft, Published, Scheduled, Archived, Expired'),

  body('image')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Image must be a string URL/path')
    .trim(),

  body('scheduleDate')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value, { req }) => {
      if (req.body.status === 'Scheduled') {
        if (!value) {
          throw new Error('Schedule date is required when status is Scheduled');
        }
        const inputDate = new Date(value);
        if (isNaN(inputDate.getTime())) {
          throw new Error('Schedule date must be a valid date');
        }
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        if (inputDate < today) {
          throw new Error('Schedule date must be today or in the future');
        }
      } else if (value) {
        const inputDate = new Date(value);
        if (isNaN(inputDate.getTime())) {
          throw new Error('Schedule date must be a valid date');
        }
      }
      return true;
    }),

  body('attachments')
    .optional()
    .isArray()
    .withMessage('Attachments must be an array of strings'),
  body('attachments.*')
    .optional()
    .isString()
    .withMessage('Each attachment must be a string URL/path')
    .trim(),

  body('expiryDate')
    .notEmpty()
    .withMessage('Expiry date is required')
    .isISO8601()
    .withMessage('Expiry date must be a valid ISO 8601 date format')
    .custom((value) => {
      const inputDate = new Date(value);
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (inputDate < today) {
        throw new Error('Expiry date must be today or in the future');
      }
      return true;
    }),

  body('isPinned')
    .optional()
    .isBoolean()
    .withMessage('isPinned must be a boolean value'),
];

/**
 * Validation rules for updating a Notice.
 */
export const updateNoticeRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid Notice ID format'),

  body('title')
    .optional()
    .isString()
    .withMessage('Title must be a string')
    .trim()
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),

  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),

  body('category')
    .optional()
    .isIn(['General', 'Maintenance', 'Events', 'Emergency', 'Meetings'])
    .withMessage('Category must be one of: General, Maintenance, Events, Emergency, Meetings'),

  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High', 'Critical'])
    .withMessage('Priority must be one of: Low, Medium, High, Critical'),

  body('status')
    .optional()
    .isIn(['Draft', 'Published', 'Scheduled', 'Archived', 'Expired'])
    .withMessage('Status must be one of: Draft, Published, Scheduled, Archived, Expired'),

  body('image')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Image must be a string URL/path')
    .trim(),

  body('scheduleDate')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value, { req }) => {
      const targetStatus = req.body.status;
      if (targetStatus === 'Scheduled') {
        if (!value) {
          throw new Error('Schedule date is required when status is Scheduled');
        }
        const inputDate = new Date(value);
        if (isNaN(inputDate.getTime())) {
          throw new Error('Schedule date must be a valid date');
        }
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        if (inputDate < today) {
          throw new Error('Schedule date must be today or in the future');
        }
      } else if (value) {
        const inputDate = new Date(value);
        if (isNaN(inputDate.getTime())) {
          throw new Error('Schedule date must be a valid date');
        }
      }
      return true;
    }),

  body('attachments')
    .optional()
    .isArray()
    .withMessage('Attachments must be an array of strings'),
  body('attachments.*')
    .optional()
    .isString()
    .withMessage('Each attachment must be a string URL/path')
    .trim(),

  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Expiry date must be a valid ISO 8601 date format')
    .custom((value) => {
      const inputDate = new Date(value);
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (inputDate < today) {
        throw new Error('Expiry date must be today or in the future');
      }
      return true;
    }),

  body('isPinned')
    .optional()
    .isBoolean()
    .withMessage('isPinned must be a boolean value'),
];

/**
 * Validation rules for parameter operations.
 */
export const noticeParamRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid Notice ID format'),
];

/**
 * Validation rules for pinning/unpinning a notice.
 */
export const pinNoticeRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid Notice ID format'),
  body('isPinned')
    .notEmpty()
    .withMessage('isPinned value is required')
    .isBoolean()
    .withMessage('isPinned must be a boolean'),
];

import { body, param, query } from 'express-validator';

export const createPollRules = () => {
  return [
    body('question')
      .trim()
      .notEmpty().withMessage('Poll question is required')
      .isLength({ min: 5, max: 200 }).withMessage('Question must be between 5 and 200 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
    body('options')
      .isArray({ min: 2, max: 5 }).withMessage('Poll must have between 2 and 5 options'),
    body('options.*.text')
      .trim()
      .notEmpty().withMessage('Option text cannot be empty')
      .isLength({ min: 1, max: 100 }).withMessage('Option text must be between 1 and 100 characters'),
    body('options')
      .custom((options) => {
        const texts = options.map(opt => opt.text ? opt.text.trim().toLowerCase() : '');
        const validTexts = texts.filter(t => t.length > 0);
        const uniqueTexts = new Set(validTexts);
        if (uniqueTexts.size !== validTexts.length) {
          throw new Error('Options must be unique');
        }
        return true;
      }),
    body('endDate')
      .notEmpty().withMessage('End date is required')
      .isISO8601().withMessage('Must be a valid date format')
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error('End date must be in the future');
        }
        return true;
      }),
  ];
};

export const updatePollRules = () => {
  return [
    param('id').isMongoId().withMessage('Invalid Poll ID format'),
    body('question')
      .optional()
      .trim()
      .notEmpty().withMessage('Poll question is required')
      .isLength({ min: 5, max: 200 }).withMessage('Question must be between 5 and 200 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
    body('endDate')
      .optional()
      .isISO8601().withMessage('Must be a valid date format')
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error('End date must be in the future');
        }
        return true;
      }),
  ];
};

export const voteRules = () => {
  return [
    param('id').isMongoId().withMessage('Invalid Poll ID format'),
    body('optionIndex').isInt({ min: 0, max: 4 }).withMessage('Valid option index is required'),
  ];
};

export const validateIdRule = () => {
  return [
    param('id').isMongoId().withMessage('Invalid Poll ID format'),
  ];
};

export const paginationRules = () => {
  return [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100').toInt(),
  ];
};

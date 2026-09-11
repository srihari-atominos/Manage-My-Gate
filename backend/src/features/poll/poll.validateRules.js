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
      .isArray({ min: 2, max: 10 }).withMessage('Poll must have between 2 and 10 options'),
    body('options.*.text')
      .trim()
      .notEmpty().withMessage('Option text cannot be empty')
      .isLength({ min: 1, max: 100 }).withMessage('Option text must be between 1 and 100 characters'),
    body('options')
      .custom((options) => {
        const texts = options.map((opt) => (opt && opt.text ? opt.text.trim().toLowerCase() : ''));
        const validTexts = texts.filter((t) => t.length > 0);
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
    body('choiceType')
      .optional()
      .isIn(['SINGLE_CHOICE', 'MULTIPLE_CHOICE']).withMessage('Invalid choice type'),
    body('maxChoices')
      .optional()
      .isInt({ min: 1 }).withMessage('maxChoices must be at least 1'),
    body('votingMode')
      .optional()
      .isIn(['ONE_PER_USER', 'ONE_PER_UNIT']).withMessage('Invalid voting mode'),
    body('resultsVisibility')
      .optional()
      .isIn(['ALWAYS', 'AFTER_VOTE', 'AFTER_EXPIRY', 'ADMIN_ONLY']).withMessage('Invalid results visibility'),
    body('isAnonymous')
      .optional()
      .isBoolean().withMessage('isAnonymous must be a boolean'),
    body('quorumPercentage')
      .optional()
      .isInt({ min: 0, max: 100 }).withMessage('quorumPercentage must be between 0 and 100'),
    body('targetAudience')
      .optional()
      .isObject().withMessage('targetAudience must be an object'),
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
    body('choiceType')
      .optional()
      .isIn(['SINGLE_CHOICE', 'MULTIPLE_CHOICE']).withMessage('Invalid choice type'),
    body('maxChoices')
      .optional()
      .isInt({ min: 1 }).withMessage('maxChoices must be at least 1'),
    body('votingMode')
      .optional()
      .isIn(['ONE_PER_USER', 'ONE_PER_UNIT']).withMessage('Invalid voting mode'),
    body('resultsVisibility')
      .optional()
      .isIn(['ALWAYS', 'AFTER_VOTE', 'AFTER_EXPIRY', 'ADMIN_ONLY']).withMessage('Invalid results visibility'),
    body('isAnonymous')
      .optional()
      .isBoolean().withMessage('isAnonymous must be a boolean'),
    body('quorumPercentage')
      .optional()
      .isInt({ min: 0, max: 100 }).withMessage('quorumPercentage must be between 0 and 100'),
    body('targetAudience')
      .optional()
      .isObject().withMessage('targetAudience must be an object'),
  ];
};

export const voteRules = () => {
  return [
    param('id').isMongoId().withMessage('Invalid Poll ID format'),
    body('optionIndex')
      .optional()
      .isInt({ min: 0 }).withMessage('optionIndex must be a non-negative integer'),
    body('selectedOptions')
      .optional()
      .isArray().withMessage('selectedOptions must be an array of integers'),
    body('selectedOptions.*')
      .optional()
      .isInt({ min: 0 }).withMessage('selectedOptions items must be non-negative integers'),
    body('selectedOptionIndices')
      .optional()
      .isArray().withMessage('selectedOptionIndices must be an array of integers'),
    body('unitId')
      .optional()
      .isMongoId().withMessage('unitId must be a valid ID'),
    body().custom((value) => {
      const hasOptionIndex = typeof value.optionIndex === 'number';
      const hasSelectedOptions = Array.isArray(value.selectedOptions) && value.selectedOptions.length > 0;
      const hasSelectedOptionIndices = Array.isArray(value.selectedOptionIndices) && value.selectedOptionIndices.length > 0;

      if (!hasOptionIndex && !hasSelectedOptions && !hasSelectedOptionIndices) {
        throw new Error('At least one option selection (optionIndex or selectedOptions) is required');
      }
      return true;
    }),
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

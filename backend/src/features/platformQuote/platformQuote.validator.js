import { body, param, query } from 'express-validator';

export const createQuoteRules = [
  body('inquiryId')
    .notEmpty()
    .withMessage('Inquiry ID is required'),
  body('discountPercent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount percent must be a number between 0 and 100'),
  body('basePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Base price must be a non-negative number'),
  body('setupFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Setup fee must be a non-negative number'),
];

export const quoteIdRules = [
  param('id')
    .notEmpty()
    .withMessage('Quote ID is required'),
];

export const acceptQuoteRules = [
  param('id')
    .notEmpty()
    .withMessage('Quote ID is required'),
  body('token')
    .optional({ checkFalsy: true })
    .isString(),
];

export const queryQuoteRules = [
  query('page')
    .optional()
    .isInt({ min: 1 }),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }),
];

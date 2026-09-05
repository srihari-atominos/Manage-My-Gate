import { body } from 'express-validator';

export const updateQuickActionsRules = [
  body('activeQuickActions')
    .exists()
    .withMessage('activeQuickActions field is required')
    .bail()
    .isArray({ min: 0, max: 7 })
    .withMessage('activeQuickActions must be an array containing at most 7 items')
    .custom((items) => {
      if (!Array.isArray(items)) return false;
      const allStrings = items.every((item) => typeof item === 'string' && item.trim().length > 0);
      if (!allStrings) {
        throw new Error('All items in activeQuickActions must be non-empty strings');
      }
      const uniqueItems = new Set(items);
      if (uniqueItems.size !== items.length) {
        throw new Error('activeQuickActions must not contain duplicate items');
      }
      return true;
    }),
  body('orgId')
    .optional()
    .isString()
    .trim()
    .withMessage('orgId must be a string'),
  body('villaId')
    .optional()
    .isString()
    .trim()
    .withMessage('villaId must be a string'),
];

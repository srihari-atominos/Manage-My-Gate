import { body, query, param } from 'express-validator';

const SUBSCRIPTION_STATUSES = ['TRIAL', 'ACTIVE', 'GRACE_PERIOD', 'SUSPENDED', 'CANCELLED', 'EXPIRED'];

export const createSubscriptionRules = [
  body('organisationId')
    .notEmpty()
    .withMessage('Organisation ID is required')
    .isMongoId()
    .withMessage('Invalid Organisation ID format'),

  body('planName')
    .notEmpty()
    .withMessage('Plan name is required')
    .isString()
    .trim(),

  body('orderId')
    .optional()
    .isMongoId()
    .withMessage('Invalid Order ID format'),

  body('status')
    .optional()
    .isIn(SUBSCRIPTION_STATUSES)
    .withMessage(`Status must be one of: ${SUBSCRIPTION_STATUSES.join(', ')}`),

  body('billingPeriodStart')
    .optional()
    .isISO8601()
    .withMessage('billingPeriodStart must be a valid date'),

  body('billingPeriodEnd')
    .optional()
    .isISO8601()
    .withMessage('billingPeriodEnd must be a valid date'),
];

export const querySubscriptionRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('status')
    .optional()
    .isIn(SUBSCRIPTION_STATUSES)
    .withMessage(`Status must be one of: ${SUBSCRIPTION_STATUSES.join(', ')}`),

  query('organisationId')
    .optional()
    .isMongoId()
    .withMessage('Invalid Organisation ID format'),

  query('search')
    .optional()
    .isString()
    .trim(),
];

export const getSubscriptionByIdRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid subscription ID format'),
];

export const getByOrgIdRules = [
  param('organisationId')
    .isMongoId()
    .withMessage('Invalid Organisation ID format'),
];

export const updateSubscriptionStatusRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid subscription ID format'),

  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(SUBSCRIPTION_STATUSES)
    .withMessage(`Status must be one of: ${SUBSCRIPTION_STATUSES.join(', ')}`),
];

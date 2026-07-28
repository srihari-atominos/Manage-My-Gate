import { body, query, param } from 'express-validator';

const FEATURE_KEYS = [
  'VISITOR_MANAGEMENT',
  'BILLING_COLLECTION',
  'AMENITY_BOOKING',
  'COMPLIANCE',
  'NOTICE_BOARD',
  'GUARD_PATROL',
];

const ENTITLEMENT_STATUSES = ['ACTIVE', 'INACTIVE', 'EXPIRED', 'SUSPENDED'];

export const verifyEntitlementRules = [
  param('organisationId')
    .isMongoId()
    .withMessage('Invalid Organisation ID format'),

  query('featureKey')
    .notEmpty()
    .withMessage('featureKey query parameter is required')
    .isIn(FEATURE_KEYS)
    .withMessage(`featureKey must be one of: ${FEATURE_KEYS.join(', ')}`),
];

export const grantEntitlementRules = [
  body('organisationId')
    .notEmpty()
    .withMessage('Organisation ID is required')
    .isMongoId()
    .withMessage('Invalid Organisation ID format'),

  body('subscriptionId')
    .notEmpty()
    .withMessage('Subscription ID is required')
    .isMongoId()
    .withMessage('Invalid Subscription ID format'),

  body('featureKey')
    .notEmpty()
    .withMessage('featureKey is required')
    .isIn(FEATURE_KEYS)
    .withMessage(`featureKey must be one of: ${FEATURE_KEYS.join(', ')}`),

  body('status')
    .optional()
    .isIn(ENTITLEMENT_STATUSES)
    .withMessage(`status must be one of: ${ENTITLEMENT_STATUSES.join(', ')}`),

  body('quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('quantity must be a non-negative integer'),

  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('expiryDate must be a valid date'),
];

export const queryEntitlementRules = [
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
    .isIn(ENTITLEMENT_STATUSES)
    .withMessage(`status must be one of: ${ENTITLEMENT_STATUSES.join(', ')}`),

  query('featureKey')
    .optional()
    .isIn(FEATURE_KEYS)
    .withMessage(`featureKey must be one of: ${FEATURE_KEYS.join(', ')}`),

  query('organisationId')
    .optional()
    .isMongoId()
    .withMessage('Invalid Organisation ID format'),
];

export const getByIdEntitlementRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid entitlement ID format'),
];

export const getByOrgIdRules = [
  param('organisationId')
    .isMongoId()
    .withMessage('Invalid Organisation ID format'),
];

export const updateEntitlementStatusRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid entitlement ID format'),

  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(ENTITLEMENT_STATUSES)
    .withMessage(`status must be one of: ${ENTITLEMENT_STATUSES.join(', ')}`),
];

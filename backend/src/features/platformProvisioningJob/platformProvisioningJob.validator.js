import { body, query, param } from 'express-validator';

const JOB_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'RETRY_PENDING', 'MANUAL_REVIEW'];

/**
 * Rules for creating a provisioning job.
 */
export const createJobRules = [
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid Order ID format'),

  body('paymentId')
    .notEmpty()
    .withMessage('Payment ID is required')
    .isMongoId()
    .withMessage('Invalid Payment ID format'),

  body('organisationId')
    .optional()
    .isMongoId()
    .withMessage('Invalid Organisation ID format'),

  body('requestedFeatures')
    .isArray({ min: 1 })
    .withMessage('Requested features must be a non-empty array of feature strings'),

  body('requestedFeatures.*')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Feature names must be non-empty strings'),

  body('maxRetries')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('maxRetries must be an integer between 1 and 10'),
];

/**
 * Rules for querying provisioning jobs.
 */
export const queryJobRules = [
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
    .isIn(JOB_STATUSES)
    .withMessage(`Status filter must be one of: ${JOB_STATUSES.join(', ')}`),

  query('organisationId')
    .optional()
    .isMongoId()
    .withMessage('Invalid Organisation ID filter format'),

  query('orderId')
    .optional()
    .isMongoId()
    .withMessage('Invalid Order ID filter format'),

  query('search')
    .optional()
    .isString()
    .trim(),
];

/**
 * Rules for job ID parameter validation.
 */
export const getJobByIdRules = [
  param('id')
    .notEmpty()
    .withMessage('Job ID is required')
    .custom((value) => {
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(value);
      const isJobString = /^PROV-JOB-.+$/.test(value);
      if (!isMongoId && !isJobString) {
        throw new Error('ID must be a valid Mongo ObjectId or Job String (e.g. PROV-JOB-...)');
      }
      return true;
    }),
];

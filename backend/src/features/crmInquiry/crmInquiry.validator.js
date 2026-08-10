import { body, param, query } from 'express-validator';

export const validatePublicLead = [
  body('customerName')
    .isString().withMessage('Customer name must be a string')
    .trim()
    .isLength({ min: 2 }).withMessage('Customer name must be at least 2 characters long'),
  body('contactEmail')
    .isEmail().withMessage('Contact email must be a valid email address')
    .normalizeEmail(),
  body('contactPhone')
    .optional({ checkFalsy: true })
    .isString().withMessage('Contact phone must be a string')
    .trim()
    .matches(/^\+?[\d\s-]+$/).withMessage('Contact phone format is invalid'),
  body('organizationName')
    .notEmpty().withMessage('Organization name is required')
    .isString().withMessage('Organization name must be a string')
    .trim(),
  body('unitCount')
    .notEmpty().withMessage('Unit count is required')
    .isInt({ min: 1 }).withMessage('Unit count must be an integer of at least 1')
    .toInt(),
  body('selectedFeatures')
    .optional()
    .isArray().withMessage('selectedFeatures must be an array')
];

export const createInquiryRules = [
  body('customerName')
    .notEmpty()
    .withMessage('Customer name is required')
    .isString()
    .withMessage('Customer name must be a string')
    .trim(),
  body('organizationName')
    .notEmpty()
    .withMessage('Organization name is required')
    .isString()
    .withMessage('Organization name must be a string')
    .trim(),
  body('unitCount')
    .notEmpty()
    .withMessage('Unit count is required')
    .isInt({ min: 1 })
    .withMessage('Unit count must be an integer of at least 1')
    .toInt(),
  body('contactEmail')
    .notEmpty()
    .withMessage('Contact email is required')
    .isEmail()
    .withMessage('Contact email must be a valid email address')
    .normalizeEmail(),
  body('contactPhone')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Contact phone must be a string')
    .trim(),
  body('status')
    .optional()
    .isIn(['NEW', 'QUALIFIED', 'DEMO_SCHEDULED', 'PROPOSAL_SENT', 'CLOSED_WON', 'CLOSED_LOST'])
    .withMessage('Invalid status value'),
  body('assignedAgentId')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('assignedAgentId must be a valid MongoDB ObjectId'),
  body('selectedFeatures')
    .optional()
    .isArray().withMessage('selectedFeatures must be an array'),
];

export const updateInquiryRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid CRM Inquiry ID'),
  body('customerName')
    .optional()
    .isString()
    .withMessage('Customer name must be a string')
    .trim(),
  body('contactEmail')
    .optional()
    .isEmail()
    .withMessage('Contact email must be a valid email address')
    .normalizeEmail(),
  body('contactPhone')
    .optional({ nullable: true })
    .isString()
    .withMessage('Contact phone must be a string')
    .trim(),
  body('status')
    .optional()
    .isIn(['NEW', 'QUALIFIED', 'DEMO_SCHEDULED', 'PROPOSAL_SENT', 'CLOSED_WON', 'CLOSED_LOST'])
    .withMessage('Invalid status value'),
  body('assignedAgentId')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('assignedAgentId must be a valid MongoDB ObjectId'),
];

export const getInquiryRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid CRM Inquiry ID'),
];

export const queryInquiryRules = [
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
    .isIn(['NEW', 'QUALIFIED', 'DEMO_SCHEDULED', 'PROPOSAL_SENT', 'CLOSED_WON', 'CLOSED_LOST'])
    .withMessage('Invalid status query filter'),
  query('assignedAgentId')
    .optional()
    .isMongoId()
    .withMessage('assignedAgentId query filter must be a valid MongoId'),
];

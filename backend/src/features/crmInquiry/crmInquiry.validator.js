import { body, param, query } from 'express-validator';

export const validatePublicLead = [
  body('customerName')
    .optional({ checkFalsy: true })
    .isString().withMessage('Customer name must be a string')
    .trim(),
  body('contactEmail')
    .optional({ checkFalsy: true })
    .isEmail().withMessage('Contact email must be a valid email address'),
  body('contactPhone')
    .optional({ checkFalsy: true })
    .isString().withMessage('Contact phone must be a string')
    .trim(),
  body('organizationName')
    .optional({ checkFalsy: true })
    .isString().withMessage('Organization name must be a string')
    .trim(),
  body('unitCount')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 }).withMessage('Unit count must be an integer of at least 1')
    .toInt(),
  body('selectedFeatures')
    .optional()
    .isArray().withMessage('selectedFeatures must be an array'),
];

export const createInquiryRules = [
  body('customerName')
    .custom((val, { req }) => {
      const name = val || req.body.contactName;
      if (!name || typeof name !== 'string' || !name.trim()) {
        throw new Error('Customer name is required');
      }
      return true;
    }),
  body('contactEmail')
    .custom((val, { req }) => {
      const email = val || req.body.email;
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        throw new Error('Valid contact email is required');
      }
      return true;
    }),
  body('organizationName')
    .custom((val, { req }) => {
      const org = val || req.body.communityName;
      if (!org || typeof org !== 'string' || !org.trim()) {
        throw new Error('Organization / Community name is required');
      }
      return true;
    }),
  body('unitCount')
    .custom((val, { req }) => {
      const units = val ?? req.body.villaCount ?? 1;
      if (isNaN(Number(units)) || Number(units) < 1) {
        throw new Error('Villa / Unit count must be at least 1');
      }
      return true;
    }),
  body('assignedAgentId')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('assignedAgentId must be a valid MongoDB ObjectId'),
];

export const validateStatusTransition = [
  param('id')
    .notEmpty()
    .withMessage('Inquiry ID is required'),
  body('nextStatus')
    .optional({ checkFalsy: true })
    .isIn(['NEW_INQUIRY', 'QUALIFIED', 'DEMO_SCHEDULED', 'DEMO_COMPLETED'])
    .withMessage('Invalid nextStatus value'),
  body('status')
    .optional({ checkFalsy: true })
    .isIn(['NEW_INQUIRY', 'QUALIFIED', 'DEMO_SCHEDULED', 'DEMO_COMPLETED'])
    .withMessage('Invalid status value'),
];

export const updateInquiryRules = [
  param('id')
    .notEmpty()
    .withMessage('Inquiry ID is required'),
  body('customerName')
    .optional()
    .isString()
    .withMessage('Customer name must be a string')
    .trim(),
  body('contactEmail')
    .optional()
    .isEmail()
    .withMessage('Contact email must be a valid email address'),
];

export const getInquiryRules = [
  param('id')
    .notEmpty()
    .withMessage('Inquiry ID is required'),
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
    .isIn(['NEW_INQUIRY', 'QUALIFIED', 'DEMO_SCHEDULED', 'DEMO_COMPLETED'])
    .withMessage('Invalid status query filter'),
];

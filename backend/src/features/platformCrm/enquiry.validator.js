import { body, param } from 'express-validator';

export const createEnquiryRules = [
  body('username')
    .notEmpty().withMessage('Username is required')
    .isString().withMessage('Username must be a string')
    .trim(),

  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .isString().withMessage('Phone number must be a string')
    .trim(),

  body('organizationName')
    .notEmpty().withMessage('Organization name is required')
    .isString().withMessage('Organization name must be a string')
    .trim(),

  body('totalUnits')
    .notEmpty().withMessage('Total units is required')
    .isInt({ min: 1 }).withMessage('Total units must be a positive integer'),

  body('selectedFeatures')
    .optional()
    .isArray().withMessage('Features must be an array of strings'),
    
  body('selectedFeatures.*')
    .isString().withMessage('Feature name must be a string')
    .trim(),
];

export const updateEnquiryStatusRules = [
  param('id').isMongoId().withMessage('Invalid enquiry ID'),
  
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['New', 'Contacted', 'Demo Scheduled', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'])
    .withMessage('Invalid status value'),
    
  body('notes')
    .optional()
    .isString()
    .trim(),
];

export const assignEnquiryRules = [
  param('id').isMongoId().withMessage('Invalid enquiry ID'),
  
  body('assignedTo')
    .notEmpty().withMessage('assignedTo is required')
    .isMongoId().withMessage('Invalid assigned user ID'),
];

export const convertEnquiryRules = [
  param('id').isMongoId().withMessage('Invalid enquiry ID'),
];

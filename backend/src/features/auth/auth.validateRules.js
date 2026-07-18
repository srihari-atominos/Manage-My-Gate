import { body } from 'express-validator';

/**
 * Validation rules for registration endpoint
 */
export const registerRules = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isAlphanumeric()
    .withMessage('Username must be alphanumeric')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .isString()
    .withMessage('Phone must be a string')
    .trim(),
];

/**
 * Validation rules for login endpoint
 */
export const loginRules = [
  body('login')
    .notEmpty()
    .withMessage('Email or Username is required')
    .trim(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

/**
 * Validation rules for accepting an invitation endpoint
 */
export const acceptInviteRules = [
  body('token')
    .notEmpty()
    .withMessage('Invitation token is required')
    .trim(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

/**
 * Validation rules for switching workspace context endpoint
 */
export const switchContextRules = [
  body('targetOrgId')
    .notEmpty()
    .withMessage('targetOrgId is required')
    .isMongoId()
    .withMessage('targetOrgId must be a valid Mongo ID')
    .trim(),
  body('targetRole')
    .optional()
    .isString()
    .withMessage('targetRole must be a string')
    .trim(),
];

/**
 * Validation rules for SSO token verification
 */
export const ssoVerifyRules = [
  body('token')
    .notEmpty()
    .withMessage('SSO provider token is required')
    .isString()
    .withMessage('Token must be a string')
    .trim(),
];

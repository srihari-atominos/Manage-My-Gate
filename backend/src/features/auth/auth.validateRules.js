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
  body('roleId')
    .notEmpty()
    .withMessage('Role ID is required')
    .isMongoId()
    .withMessage('Invalid Role ID format'),
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

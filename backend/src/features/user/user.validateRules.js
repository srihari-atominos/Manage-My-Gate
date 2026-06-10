import { body, param } from 'express-validator';

/**
 * Validation rules for inviting a new user.
 */
export const inviteUserRules = [
  body('email')
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .trim(),
];

/**
 * Validation rules for updating user roles.
 */
export const updateUserRolesRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid User ID format'),
  body('roles')
    .exists()
    .withMessage('roles field is required')
    .isArray()
    .withMessage('roles must be an array'),
];

/**
 * Validation rules for updating user profile.
 */
export const updateProfileRules = [
  body('name')
    .optional()
    .trim()
    .escape(),
  body('phone')
    .optional()
    .trim()
    .escape(),
];

import { body, param, query } from 'express-validator';
import mongoose from 'mongoose';

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
  body('villaId')
    .optional({ nullable: true, checkFalsy: true })
    .custom((val) => {
      if (val === '' || val === null) return true;
      return mongoose.Types.ObjectId.isValid(val);
    })
    .withMessage('Villa ID must be a valid Mongo ID'),
  body('residentType')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('Resident type must be a string')
    .trim(),
  body('roleName')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('Role name must be a string')
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
  body('villaId')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('Invalid Villa ID format'),
];

/**
 * Validation rules for requesting an email OTP during profile update.
 */
export const requestEmailOtpRules = [
  body('newEmail')
    .notEmpty()
    .withMessage('New email address is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .trim(),
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
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('emailOtp')
    .optional()
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits'),
];

export const bulkInviteUserRules = [
  body('invitations')
    .isArray({ min: 1 })
    .withMessage('invitations must be a non-empty array'),
  body('invitations.*.email')
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .trim(),
  body('invitations.*.residentType')
    .optional()
    .isString()
    .withMessage('Resident type must be a string')
    .trim(),
  body('invitations.*.roleName')
    .notEmpty()
    .withMessage('Role name is required')
    .isString()
    .trim(),
  body('invitations.*.villaNumber')
    .optional()
    .custom((val) => {
      if (val === undefined || val === null || val === '') return true;
      return typeof val === 'string';
    })
    .withMessage('Villa Number must be a string')
    .trim(),
];

/**
 * Validation rules for public unauthenticated account deletion requests.
 */
export const requestDeletionRules = [
  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .isEmail()
    .withMessage('Please provide a valid email address')
    .trim(),
  body('mobile')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('Mobile number must be a string')
    .trim()
    .escape(),
  body('reason')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('Reason must be text')
    .trim()
    .escape(),
];

/**
 * Validation rules for revoking an invitation.
 */
export const revokeInvitationRules = [
  param('id')
    .notEmpty()
    .withMessage('Invitation ID is required')
    .isMongoId()
    .withMessage('Invalid Invitation ID format'),
];

/**
 * Validation rules for listing organization invitations.
 */
export const listInvitationsRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100')
    .toInt(),
  query('status')
    .optional()
    .isIn(['ALL', 'PENDING', 'ACCEPTED', 'REJECTED', 'REVOKED', 'EXPIRED'])
    .withMessage('Invalid status filter value'),
  query('search')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Search query cannot exceed 100 characters')
    .trim(),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'expiresAt', 'status'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc', '1', '-1'])
    .withMessage('Invalid sort order'),
];

/**
 * Validation rules for resending an invitation.
 */
export const resendInvitationRules = [
  param('id')
    .notEmpty()
    .withMessage('Invitation ID is required')
    .isMongoId()
    .withMessage('Invalid Invitation ID format'),
];



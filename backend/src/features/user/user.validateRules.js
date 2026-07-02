import { body, param } from 'express-validator';
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
    .optional()
    .custom((val) => {
      if (val === '' || val === null) return true;
      return mongoose.Types.ObjectId.isValid(val);
    })
    .withMessage('Villa ID must be a valid Mongo ID'),
  body('residentType')
    .optional()
    .isIn(['Owner', 'Tenant', 'Family', 'Guest', 'None'])
    .withMessage('Resident type must be one of: Owner, Tenant, Family, Guest, None'),
  body('roleName')
    .optional()
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
    .isIn(['Owner', 'Tenant', 'Family', 'Guest', 'None'])
    .withMessage('Resident type must be one of: Owner, Tenant, Family, Guest, None'),
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

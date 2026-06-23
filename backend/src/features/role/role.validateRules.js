import { body, param } from 'express-validator';

/**
 * Validation rules for creating a role
 */
export const createRoleRules = [
  body('name')
    .notEmpty()
    .withMessage('Role name is required')
    .isString()
    .withMessage('Role name must be a string')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Role name must be between 2 and 50 characters'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('integrationMappings')
    .optional()
    .isObject()
    .withMessage('integrationMappings must be an object'),
  body('integrationMappings.*')
    .optional()
    .isMongoId()
    .withMessage('Mapped integration values must be valid Mongo IDs'),
];

/**
 * Validation rules for updating permissions of a role
 */
export const updateRolePermissionsRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid Role ID format'),
  body('permissionIds')
    .exists()
    .withMessage('permissionIds field is required')
    .isArray()
    .withMessage('permissionIds must be an array'),
  body('permissionIds.*')
    .isMongoId()
    .withMessage('Each permission ID in the array must be a valid Mongo ID'),
];

/**
 * Validation rules for updating role metadata and permissions list.
 */
export const updateRoleRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid Role ID format'),
  body('name')
    .notEmpty()
    .withMessage('Role name is required')
    .isString()
    .withMessage('Role name must be a string')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Role name must be between 2 and 50 characters'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array of strings'),
  body('integrationMappings')
    .optional()
    .isObject()
    .withMessage('integrationMappings must be an object'),
  body('integrationMappings.*')
    .optional()
    .isMongoId()
    .withMessage('Mapped integration values must be valid Mongo IDs'),
];

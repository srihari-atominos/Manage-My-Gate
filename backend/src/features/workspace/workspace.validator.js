import { body, param } from 'express-validator';

export const createWorkspaceRules = [
  body('workspaceName')
    .notEmpty()
    .withMessage('Workspace name is required')
    .isString()
    .withMessage('Workspace name must be a string')
    .trim(),

  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .trim(),

  body('organizationId')
    .optional()
    .isMongoId()
    .withMessage('Organization ID must be a valid Mongo ID'),

  body('status')
    .optional()
    .isIn(['Active', 'Inactive', 'Pending'])
    .withMessage('Status must be Active, Inactive, or Pending'),
];

export const updateWorkspaceRules = [
  body('workspaceName')
    .optional()
    .isString()
    .withMessage('Workspace name must be a string')
    .trim(),

  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .trim(),

  body('status')
    .optional()
    .isIn(['Active', 'Inactive', 'Pending'])
    .withMessage('Status must be Active, Inactive, or Pending'),
];

export const addModuleRules = [
  body('moduleName')
    .notEmpty()
    .withMessage('Module name is required')
    .isString()
    .withMessage('Module name must be a string')
    .trim(),

  body('moduleKey')
    .notEmpty()
    .withMessage('Module key is required')
    .isString()
    .withMessage('Module key must be a string')
    .trim(),

  body('route')
    .notEmpty()
    .withMessage('Route is required')
    .isString()
    .withMessage('Route must be a string')
    .trim(),

  body('icon')
    .notEmpty()
    .withMessage('Icon is required')
    .isString()
    .withMessage('Icon must be a string')
    .trim(),

  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Display order must be a non-negative integer'),

  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('Enabled must be a boolean'),

  body('sidebarVisible')
    .optional()
    .isBoolean()
    .withMessage('Sidebar visible must be a boolean'),
];

export const updateModuleRules = [
  body('moduleName')
    .optional()
    .isString()
    .withMessage('Module name must be a string')
    .trim(),

  body('moduleKey')
    .optional()
    .isString()
    .withMessage('Module key must be a string')
    .trim(),

  body('route')
    .optional()
    .isString()
    .withMessage('Route must be a string')
    .trim(),

  body('icon')
    .optional()
    .isString()
    .withMessage('Icon must be a string')
    .trim(),

  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Display order must be a non-negative integer'),

  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('Enabled must be a boolean'),

  body('sidebarVisible')
    .optional()
    .isBoolean()
    .withMessage('Sidebar visible must be a boolean'),
];

export const toggleModuleRules = [
  body('enabled')
    .notEmpty()
    .withMessage('Enabled is required')
    .isBoolean()
    .withMessage('Enabled must be a boolean'),
];

export const reorderModulesRules = [
  body('orders')
    .isArray()
    .withMessage('Orders must be an array')
    .bail()
    .custom((value) => {
      if (!value.every(item => typeof item === 'object' && item.moduleId && typeof item.displayOrder === 'number')) {
        throw new Error('Every order item must have moduleId and displayOrder number');
      }
      return true;
    }),
];

export const addMemberRules = [
  body('identifier')
    .notEmpty()
    .withMessage('User identifier (ID, username, or email) is required')
    .isString()
    .withMessage('User identifier must be a string')
    .trim(),
];

import { Router } from 'express';
import roleController from './role.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import { createRoleRules, updateRolePermissionsRules } from './role.validateRules.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import { authorizePermission } from '../../middlewares/rbac.middleware.js';

const router = Router();

// Protect all role routes
router.use(isAuthenticated);

/**
 * @swagger
 * /roles:
 *   get:
 *     summary: Get all roles
 *     responses:
 *       200:
 *         description: List of roles.
 */
router.get(
  '/', 
  authorizePermission('roles', 'read'), 
  roleController.getAllRoles
);

/**
 * @swagger
 * /roles:
 *   post:
 *     summary: Create a new role
 *     responses:
 *       201:
 *         description: Role created.
 */
router.post(
  '/', 
  authorizePermission('roles', 'create'), 
  validate(createRoleRules), 
  roleController.createRole
);

/**
 * @swagger
 * /roles/permissions:
 *   get:
 *     summary: Get all system permissions
 *     responses:
 *       200:
 *         description: List of permissions.
 */
router.get(
  '/permissions', 
  authorizePermission('roles', 'read'), 
  roleController.getAllPermissions
);

/**
 * @swagger
 * /roles/{id}/permissions:
 *   get:
 *     summary: Get permissions mapped to a specific role
 *     responses:
 *       200:
 *         description: List of mapped permissions.
 */
router.get(
  '/:id/permissions', 
  authorizePermission('roles', 'read'), 
  roleController.getRolePermissions
);

/**
 * @swagger
 * /roles/{id}/permissions:
 *   put:
 *     summary: Update permissions mapped to a specific role
 *     responses:
 *       200:
 *         description: Permissions updated.
 */
router.put(
  '/:id/permissions', 
  authorizePermission('roles', 'update'), 
  validate(updateRolePermissionsRules), 
  roleController.updateRolePermissions
);

export default router;

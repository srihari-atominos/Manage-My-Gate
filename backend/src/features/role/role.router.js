import { Router } from 'express';
import roleController from './role.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import { createRoleRules, updateRolePermissionsRules, updateRoleRules } from './role.validateRules.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import { authorizePermission } from '../../middlewares/rbac.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';

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
  tenantContext,
  authorizePermission('roles', 'read'), 
  roleController.getAllRoles
);

/**
 * @swagger
 * /roles:
 *   post:
 *     summary: Create a new role
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: "Auditor"
 *               description:
 *                 type: string
 *                 maxLength: 200
 *                 example: "Responsible for reviewing system audit logs"
 *     responses:
 *       201:
 *         description: Role created.
 *       400:
 *         description: Validation error.
 */
router.post(
  '/', 
  tenantContext,
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     responses:
 *       200:
 *         description: List of mapped permissions.
 */
router.get(
  '/:id/permissions', 
  tenantContext,
  authorizePermission('roles', 'read'), 
  roleController.getRolePermissions
);

/**
 * @swagger
 * /roles/{id}/permissions:
 *   put:
 *     summary: Update permissions mapped to a specific role
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Permissions updated.
 */
router.put(
  '/:id/permissions', 
  tenantContext,
  authorizePermission('roles', 'update'), 
  validate(updateRolePermissionsRules), 
  roleController.syncRolePermissions
);

/**
 * @swagger
 * /roles/{id}:
 *   put:
 *     summary: Update an existing role
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Role updated successfully.
 */
router.put(
  '/:id',
  tenantContext,
  authorizePermission('roles', 'update'),
  validate(updateRoleRules),
  roleController.updateRole
);

/**
 * @swagger
 * /roles/{id}:
 *   delete:
 *     summary: Delete a role
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role deleted successfully.
 */
router.delete(
  '/:id',
  tenantContext,
  authorizePermission('roles', 'delete'),
  roleController.deleteRole
);

export default router;

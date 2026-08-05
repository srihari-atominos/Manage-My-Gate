import { Router } from 'express'
import userController from './user.controller.js'
import { validate } from '../../middlewares/validator.middleware.js'
import { inviteUserRules, bulkInviteUserRules, updateUserRolesRules, updateProfileRules } from './user.validateRules.js'
import isAuthenticated from '../../middlewares/auth.middleware.js'
import { authorizePermission, authorizeAnyPermission } from '../../middlewares/rbac.middleware.js'
import { upload, imageSignatureValidator } from './middlewares/upload.middleware.js'
import tenantContext from '../../middlewares/tenant.middleware.js'

import userPreferenceRouter from '../userPreference/userPreference.router.js'

const router = Router()

// Mount user preferences sub-router
router.use('/preferences', userPreferenceRouter)

// Protect all user routes
router.use(isAuthenticated)

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Retrieve all users
 *     responses:
 *       200:
 *         description: List of all users.
 */
router.get(
  '/',
  tenantContext,
  authorizePermission('users', 'read'),
  userController.getAllUsers
)

/**
 * @swagger
 * /users/invite:
 *   post:
 *     summary: Invite a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       201:
 *         description: Invitation sent successfully.
 *       400:
 *         description: Validation error.
 */
router.post(
  '/invite',
  tenantContext,
  authorizeAnyPermission(['users:create', 'villas:read']),
  validate(inviteUserRules),
  userController.inviteUser
)

/**
 * @swagger
 * /users/bulk-invite:
 *   post:
 *     summary: Bulk invite new users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - invitations
 *             properties:
 *               invitations:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Bulk invitation processed successfully.
 *       400:
 *         description: Validation error.
 */
router.post(
  '/bulk-invite',
  tenantContext,
  authorizePermission('users', 'create'),
  validate(bulkInviteUserRules),
  userController.bulkInviteUsers
)

/**
 * @swagger
 * /users/profile:
 *   put:
 *     summary: Update profile details and avatar image
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Avatar image file to upload
 *     responses:
 *       200:
 *         description: Profile updated successfully.
 *       400:
 *         description: Validation or upload error.
 */
router.put(
  '/profile',
  upload.single('avatar'),
  imageSignatureValidator,
  validate(updateProfileRules),
  userController.updateProfile
)

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully.
 *       400:
 *         description: Invalid User ID or validation error.
 */
router.delete(
  '/:id',
  tenantContext,
  authorizePermission('users', 'delete'),
  userController.deleteUser
)

/**
 * @swagger
 * /users/{id}/roles:
 *   put:
 *     summary: Update user roles
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roles
 *             properties:
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["60d21b4667d0d8992e610c85"]
 *     responses:
 *       200:
 *         description: User roles updated successfully.
 *       400:
 *         description: Validation error.
 */
router.put(
  '/:id/roles',
  tenantContext,
  authorizePermission('users', 'update'),
  validate(updateUserRolesRules),
  userController.updateUserRoles
)

export default router

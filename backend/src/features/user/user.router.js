import { Router } from 'express'
import userController from './user.controller.js'
import { validate } from '../../middlewares/validator.middleware.js'
import { inviteUserRules, updateUserRolesRules, updateProfileRules } from './user.validateRules.js'
import isAuthenticated from '../../middlewares/auth.middleware.js'
import { authorizePermission } from '../../middlewares/rbac.middleware.js'
import { upload, imageSignatureValidator } from '../../middlewares/upload.middleware.js'

const router = Router()

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
  authorizePermission('users', 'create'),
  validate(inviteUserRules),
  userController.inviteUser
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
  authorizePermission('users', 'update'),
  validate(updateUserRolesRules),
  userController.updateUserRoles
)

export default router

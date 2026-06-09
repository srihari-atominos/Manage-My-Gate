import { Router } from 'express'
import userController from './user.controller.js'
import { validate } from '../../middlewares/validator.middleware.js'
import { inviteUserRules, updateUserRolesRules } from './user.validateRules.js'
import isAuthenticated from '../../middlewares/auth.middleware.js'
import { authorizePermission } from '../../middlewares/rbac.middleware.js'

const router = Router()

// Protect all user routes
router.use(isAuthenticated)

router.get(
  '/',
  authorizePermission('users', 'read'),
  userController.getAllUsers
)

router.post(
  '/invite',
  authorizePermission('users', 'create'),
  validate(inviteUserRules),
  userController.inviteUser
)

router.delete(
  '/:id',
  authorizePermission('users', 'delete'),
  userController.deleteUser
)

router.put(
  '/:id/roles',
  authorizePermission('users', 'update'),
  validate(updateUserRolesRules),
  userController.updateUserRoles
)

export default router

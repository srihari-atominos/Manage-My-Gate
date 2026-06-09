import userService from './user.services.js'
import HttpError from '../../utils/httpError.utils.js'

export class UserController {
  /**
   * Retrieves and formats all users.
   */
  async getAllUsers(req, res, next) {
    try {
      const users = await userService.getAllUsers()
      const formatted = users.map((u) => ({
        id: u._id,
        name: u.username,
        email: u.email,
        role: u.roleId?.name || '',
        status: 'Active',
      }))
      res.success(formatted, 'Users retrieved successfully')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Invites a new user.
   */
  async inviteUser(req, res, next) {
    try {
      const { email } = req.body
      const user = await userService.inviteUser(email)
      const formatted = {
        id: user._id,
        name: user.username,
        email: user.email,
        role: '',
        status: 'Pending',
      }
      res.success(formatted, 'User invited successfully', 201)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Deletes a user by ID.
   */
  async deleteUser(req, res, next) {
    try {
      const { id } = req.params
      await userService.deleteUser(id)
      res.success({ id }, 'User deleted successfully')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Updates roles for a user.
   */
  async updateUserRoles(req, res, next) {
    try {
      const { id } = req.params
      const { roles } = req.body // Array of role names, e.g. ["Super Admin"]
      
      const Role = (await import('../role/role.model.js')).default
      const firstRoleName = Array.isArray(roles) && roles.length > 0 ? roles[0] : 'Branch Manager'
      
      const role = await Role.findOne({ name: firstRoleName })
      if (!role) {
        throw new HttpError(400, `Role '${firstRoleName}' not found`)
      }

      const updatedUser = await userService.updateUser(id, { roleId: role._id })
      res.success({ id: updatedUser._id, role: role.name }, 'User roles updated successfully')
    } catch (error) {
      next(error)
    }
  }
}

export default new UserController()

import userService from './user.services.js'
import HttpError from '../../utils/httpError.utils.js'
import fs from 'fs'

export class UserController {
  /**
   * Retrieves and formats all users.
   */
  async getAllUsers(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const { data: users, pagination } = await userService.getAllUsers(page, limit);
      const formatted = users.map((u) => ({
        id: u._id,
        name: u.username,
        email: u.email,
        role: u.roleId?.name || '',
        status: u.status || 'Pending',
      }));
      res.success({ data: formatted, pagination }, 'Users retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Invites a new user.
   */
  async inviteUser(req, res, next) {
    try {
      const { email } = req.body
      const { user, invitationToken } = await userService.inviteUser(email)
      const formatted = {
        id: user._id,
        name: user.username,
        email: user.email,
        role: '',
        status: user.status || 'Pending',
        invitationToken,
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

  /**
   * Updates current user's profile and avatar.
   */
  async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const { name, phone } = req.body;
      const avatarFilename = req.file ? req.file.filename : undefined;

      const updatedUser = await userService.updateProfile(userId, { name, phone, avatarFilename });
      
      res.success({
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        name: updatedUser.name,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
      }, 'Profile updated successfully');
    } catch (error) {
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting file on profile update error:', err);
        });
      }
      next(error);
    }
  }
}

export default new UserController()

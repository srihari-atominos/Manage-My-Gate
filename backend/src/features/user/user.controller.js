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
      const orgId = req.tenant.orgId;

      const search = req.query.search || '';
      let roles = req.query.roles || [];
      if (typeof roles === 'string') {
        roles = roles.split(',').map(r => r.trim()).filter(Boolean);
      }
      let status = req.query.status || [];
      if (typeof status === 'string') {
        status = status.split(',').map(s => s.trim()).filter(Boolean);
      }

      const { data: users, pagination } = await userService.getAllUsersInOrg(orgId, page, limit, { search, roles, status });

      const formatted = users.map((u) => ({
        id: u.id || u._id,
        _id: u._id || u.id,
        username: u.username,
        name: u.name || u.username,
        phone: u.phone || '',
        email: u.email,
        role: u.role || '',
        status: u.status || 'Pending',
        assignedUnits: u.assignedUnits || [],
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
      const { email, phone, villaId, residentType, roleName } = req.body;
      const orgId = req.tenant.orgId;
      const { user, invitationToken } = await userService.inviteUser(email, orgId, villaId, residentType, roleName, phone);
      const formatted = {
        id: user._id,
        username: user.username,
        name: user.name || user.username,
        phone: user.phone || '',
        email: user.email,
        role: roleName || '',
        status: user.status || 'Pending',
        villaId: villaId || null,
        residentType: residentType || 'None',
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
      const { id } = req.params;
      const { villaId } = req.query;
      const orgId = req.tenant.orgId;
      await userService.deleteUserFromOrg(id, orgId, villaId);
      res.success({ id }, 'User deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates roles for a user.
   */
  async updateUserRoles(req, res, next) {
    try {
      const { id } = req.params;
      const { roles, villaId } = req.body;
      const orgId = req.tenant.orgId;

      const result = await userService.updateUserRoles(id, orgId, roles, villaId);
      res.success(result, 'User roles updated successfully')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Requests an OTP to verify a new email address during profile update.
   */
  async requestEmailOtp(req, res, next) {
    try {
      const userId = req.user.id;
      const { newEmail } = req.body;
      const result = await userService.requestEmailOtp(userId, newEmail);
      res.success(result, 'Verification OTP sent to new email address');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates current user's profile, email (with OTP), and avatar.
   */
  async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const { name, phone, email, emailOtp } = req.body;
      const avatarFilename = req.file ? req.file.filename : undefined;

      const updatedUser = await userService.updateProfile(userId, { name, phone, email, emailOtp, avatarFilename });
      
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

  /**
   * Bulk invites multiple users.
   */
  async bulkInviteUsers(req, res, next) {
    try {
      const { invitations } = req.body;
      const orgId = req.tenant.orgId;
      const result = await userService.bulkInviteUsers(invitations, orgId);
      res.success(result, 'Bulk invitation process completed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Self-service account deletion for the currently authenticated user.
   */
  async deleteMyAccount(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await userService.deleteOwnAccount(userId);
      res.success(result, 'Account deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Public unauthenticated account deletion request.
   */
  async requestAccountDeletion(req, res, next) {
    try {
      const { email, mobile, reason } = req.body;
      const result = await userService.requestAccountDeletion({ email, mobile, reason });
      res.success(result, 'Deletion request processed successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController()

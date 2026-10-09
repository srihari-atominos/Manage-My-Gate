import userService from './user.services.js'
import HttpError from '../../utils/httpError.utils.js'
import { generateInviteLink, resolveInvitationSource } from './utils/invite.utils.js'
import { assertRolesAssignable, listAssignableRoles } from './utils/roleAssignment.js'
import fs from 'fs'
import ExcelJS from 'exceljs'
import villaService from '../villa/villa.services.js'


export class UserController {
  /**
   * Generates and downloads the Excel template for bulk inviting users,
   * with a dropdown for Villa Number.
   */
  async downloadBulkInviteTemplate(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      
      const { data: villas } = await villaService.getUnitsPaginated({ orgId, page: 1, limit: 10000 });
      
      const assignableRoles = await listAssignableRoles(req, orgId);
      let roleNames = assignableRoles.map(r => r.name);
      if (roleNames.length === 0) {
        roleNames = ['Resident Owner', 'Resident Tenant', 'Family Member', 'Security Guard'];
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Bulk Invite Users');
      const dataSheet = workbook.addWorksheet('DropdownData');
      dataSheet.state = 'hidden';
      
      const roleSheet = workbook.addWorksheet('RoleData');
      roleSheet.state = 'hidden';
      
      roleNames.forEach((r, idx) => {
        roleSheet.getCell(`A${idx + 1}`).value = r;
      });


      const villaNames = villas.map(v => `Unit ${v.unitNumber || ''} (${v.blockOrBuilding || ''})`.trim());
      
      if (villaNames.length > 0) {
        villaNames.forEach((name, idx) => {
          dataSheet.getCell(`A${idx + 1}`).value = name;
        });
      } else {
        dataSheet.getCell('A1').value = 'No Villas Created Yet';
      }

      sheet.columns = [
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone Number', key: 'phone', width: 20 },
        { header: 'Role', key: 'role', width: 25 },
        { header: 'Villa Number', key: 'villa', width: 30 }
      ];

      sheet.addRow({ email: 'resident.owner@example.com', phone: '+919876543211', role: 'Resident Owner', villa: villaNames[0] || '' });
      sheet.addRow({ email: 'resident.tenant@example.com', phone: '+919876543212', role: 'Resident Tenant', villa: villaNames[1] || '' });
      sheet.addRow({ email: 'security.guard@example.com', phone: '+919876543213', role: 'Security Guard', villa: '' });

      
      const endRow = Math.max(villaNames.length, 1);
      const roleEndRow = Math.max(roleNames.length, 1);
      
      for (let i = 2; i <= 1000; i++) {
        sheet.getCell(`C${i}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`RoleData!$A$1:$A${roleEndRow}`],
          showErrorMessage: true,
          errorStyle: 'error',
          errorTitle: 'Invalid Role',
          error: 'Please select a valid Role from the dropdown list.'
        };

        sheet.getCell(`D${i}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`DropdownData!$A$1:$A${endRow}`],
          showErrorMessage: true,
          errorStyle: 'error',
          errorTitle: 'Invalid Villa',
          error: 'Please select a valid Villa from the dropdown list.'
        };
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="bulk_invite_users_template.xlsx"');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      next(error);
    }
  }

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
      const { email, phone, roleName, name, villaId = null, residentType = 'None', onboardingMode = 'INVITATION' } = req.body;
      const orgId = req.tenant.orgId;

      const inviterId = req.user?.id || req.user?._id || null;

      // The web admin panel always sends web invitations — the email link must
      // always point to the smart /invite/:token web landing page, never to a
      // mobile-specific path. Do NOT derive this from Referer/Origin headers.
      const invitationSource = 'WEB';

      await assertRolesAssignable(req, orgId, roleName);

      const { user, invitationToken, membership } = await userService.inviteUser(
        email,
        orgId,
        villaId,
        residentType,
        roleName,
        phone,
        name || '',
        invitationSource,
        inviterId,
        onboardingMode
      );

      // Generate the canonical invite URL for the admin UI "Copy Link" feature
      const inviteLink = generateInviteLink(invitationToken);

      const formatted = {
        id: user._id,
        username: user.username,
        name: user.name || user.username,
        phone: user.phone || '',
        email: user.email,
        role: roleName || '',
        status: membership?.status || 'Pending',
        villaId: villaId || null,
        residentType: residentType || 'None',
        invitationToken,
        invitationSource,
        inviteLink,
        onboardingMode,
      };
      res.success(formatted, 'User processed successfully', 201);
    } catch (error) {
      next(error);
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
  
  async requestCurrentContactOtp(req, res, next) {
    try {
      const userId = req.user.id || req.user._id;
      const result = await userService.requestCurrentContactOtp(userId);
      res.success(result, 'Authorization OTP sent to current contact method');
    } catch (error) {
      next(error);
    }
  }

  async verifyCurrentContactOtp(req, res, next) {
    try {
      const userId = req.user.id || req.user._id;
      const { otp } = req.body;
      const result = await userService.verifyCurrentContactOtp(userId, otp);
      res.success(result, 'Authorization successful');
    } catch (error) {
      next(error);
    }
  }

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
   * Requests an OTP to verify a new phone number during profile update.
   */
  async requestPhoneOtp(req, res, next) {
    try {
      const userId = req.user.id || req.user._id;
      const { newPhone } = req.body;
      const result = await userService.requestPhoneOtp(userId, newPhone);
      res.success(result, 'Verification OTP sent to new phone number');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates current user's profile, contact verification fields, avatar, and profile details.
   */
  async updateProfile(req, res, next) {
    try {
      const userId = req.user.id || req.user._id;
      const { name, phone, phoneOtp, email, emailOtp, updateAuthToken, removeAvatar, bio, work, hometown, allowIntercomCalls } = req.body;
      let interests = req.body.interests;
      if (typeof interests === 'string') {
        interests = JSON.parse(interests);
      }
      const avatarFilename = req.file ? req.file.filename : undefined;

      const updatedUser = await userService.updateProfile(userId, {
        name,
        phone,
        phoneOtp,
        email,
        emailOtp,
        bio,
        work,
        hometown,
        allowIntercomCalls,
        interests,
        avatarFilename,
        removeAvatar: removeAvatar === 'true' || removeAvatar === true || removeAvatar === '1',
        updateAuthToken,
      });
      
      res.success({
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        name: updatedUser.name,
        phone: updatedUser.phone,
        phoneVerified: updatedUser.phoneVerified,
        avatar: updatedUser.avatar || null,
        bio: updatedUser.bio || '',
        work: updatedUser.work || '',
        hometown: updatedUser.hometown || '',
        allowIntercomCalls: Boolean(updatedUser.allowIntercomCalls),
        interests: updatedUser.interests || [],
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
   * Bulk validates user contacts to check for existing registrations.
   */
  async bulkValidateUsers(req, res, next) {
    try {
      const { contacts } = req.body;
      const orgId = req.tenant.orgId;
      const result = await userService.bulkValidateUsers(contacts, orgId);
      res.success(result, 'Bulk validation completed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk invites multiple users.
   */
  async getAssignableRoles(req, res, next) {
    try {
      const roles = await listAssignableRoles(req, req.tenant.orgId)
      res.success(roles, 'Assignable roles fetched successfully')
    } catch (error) {
      next(error)
    }
  }

  async bulkInviteUsers(req, res, next) {
    try {
      const { invitations, onboardingMode } = req.body;
      const organizationService = (await import('../organization/organization.services.js')).default;
      const org = await organizationService.getOrganizationById(req.tenant.orgId).catch(() => null);
      const effectiveOnboardingMode = onboardingMode || org?.onboardingMode || 'INVITATION';
      const orgId = req.tenant.orgId;
      const inviterId = req.user?.id || req.user?._id || null;

      const defaultSource = resolveInvitationSource(req);
      
      for (const invite of invitations) {
        if (invite.roleName) {
          await assertRolesAssignable(req, orgId, invite.roleName);
        }
      }

      const result = await userService.bulkInviteUsers(invitations, orgId, defaultSource, inviterId, effectiveOnboardingMode);
      res.success(result, 'Bulk user processing completed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves organization invitations with pagination, status filtering, and recipient search.
   */
  async getInvitations(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const { page, limit, status, search, sortBy, sortOrder } = req.query;
      const result = await userService.listInvitations({
        orgId,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
        status: status || 'ALL',
        search: search || '',
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder || 'desc',
      });
      res.success(result, 'Invitations retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resends an eligible invitation with a fresh token.
   */
  async resendInvitation(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      const inviterId = req.user?.id || req.user?._id || null;

      const result = await userService.resendInvitation(id, orgId, inviterId);
      res.success(result, 'Invitation resent successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revokes an existing invitation.
   */
  async revokeInvitation(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      const inviterId = req.user?.id || req.user?._id || null;

      const result = await userService.revokeInvitation(id, orgId, inviterId);
      res.success(result, 'Invitation revoked successfully');
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

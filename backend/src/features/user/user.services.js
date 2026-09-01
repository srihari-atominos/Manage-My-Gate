import mongoose from 'mongoose';
import userRepository from './user.repository.js';
import userEvents from './user.events.js';
import { hashPassword } from '../../utils/crypto.utils.js';
import HttpError from '../../utils/httpError.utils.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../../config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');
const uploadDir = path.resolve(projectRoot, config.avatarUploadPath);

export class UserService {
  async getUserById(id, session) {
    const user = await userRepository.findById(id, session);
    if (!user) {
      throw new HttpError(404, `User with ID ${id} not found.`);
    }
    return user;
  }

  async getUserByEmail(email, session) {
    return await userRepository.findByEmail(email, session);
  }

  async getUserByUsername(username, session) {
    return await userRepository.findByUsername(username, session);
  }

  async getUserByEmailOrUsername(emailOrUsername, session) {
    const userByEmail = await userRepository.findByEmail(emailOrUsername, session);
    if (userByEmail) return userByEmail;

    return await userRepository.findByUsername(emailOrUsername, session);
  }

  async createUser(userData, session = null) {
    let localSession = null;
    if (!session) {
      localSession = await mongoose.startSession();
      localSession.startTransaction();
    }
    const currentSession = session || localSession;

    try {
      // Normalization & Validation
      if (userData.email) userData.email = userData.email.trim().toLowerCase();
      if (userData.username) userData.username = userData.username.trim();
      if (userData.phone) userData.phone = userData.phone.trim();

      // Check uniqueness
      const existingEmail = await userRepository.findByEmail(userData.email, currentSession);
      if (existingEmail) {
        throw new HttpError(400, `User with email '${userData.email}' already exists.`);
      }

      const existingUsername = await userRepository.findByUsername(userData.username, currentSession);
      if (existingUsername) {
        throw new HttpError(400, `User with username '${userData.username}' already exists.`);
      }

      if (userData.phone) {
        const existingPhoneUser = await userRepository.findByPhone(userData.phone, currentSession);
        if (existingPhoneUser) {
          throw new HttpError(400, `User with phone number '${userData.phone}' already exists.`);
        }
      }

      // Hash the password securely using crypto utilities if provided
      if (userData.password) {
        userData.password = await hashPassword(userData.password);
      }

      const newUser = await userRepository.create(userData, currentSession);
      
      if (localSession) {
        await localSession.commitTransaction();
      }
      return newUser;
    } catch (error) {
      if (localSession) {
        await localSession.abortTransaction();
      }
      throw error;
    } finally {
      if (localSession) {
        await localSession.endSession();
      }
    }
  }

  async getAllUsers(page = 1, limit = 10) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const skip = (page - 1) * limit;
      const { data, totalRecords } = await userRepository.findAllPaginated(skip, limit, session);
      await session.commitTransaction();
      const totalPages = Math.ceil(totalRecords / limit);
      return {
        data,
        pagination: {
          totalRecords,
          currentPage: page,
          totalPages: totalPages || 1,
          limit,
        },
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async updateUser(id, updateData, session = null) {
    let localSession = null;
    if (!session) {
      localSession = await mongoose.startSession();
      localSession.startTransaction();
    }
    const currentSession = session || localSession;
    try {
      await this.getUserById(id, currentSession); // Throws if user doesn't exist
      if (updateData.phone && updateData.phone.trim()) {
        const existingPhoneUser = await userRepository.findByPhone(updateData.phone.trim(), currentSession);
        if (existingPhoneUser && existingPhoneUser._id.toString() !== id.toString()) {
          throw new HttpError(400, `User with phone number '${updateData.phone}' already exists.`);
        }
      }
      const updatedUser = await userRepository.update(id, updateData, currentSession);
      if (localSession) {
        await localSession.commitTransaction();
      }
      return updatedUser;
    } catch (error) {
      if (localSession) {
        await localSession.abortTransaction();
      }
      throw error;
    } finally {
      if (localSession) {
        await localSession.endSession();
      }
    }
  }

  async deleteUserFromOrg(id, orgId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const user = await this.getUserById(id, session); // Throws if user doesn't exist
      const orgMembershipService = (await import('../orgMembership/orgMembership.services.js')).default;
      await orgMembershipService.deleteMembership(id, orgId, session);

      // Remove user from any Villa residents arrays they might be in within this organization
      const villaService = (await import('../villa/villa.services.js')).default;
      await villaService.removeUserFromAllVillasInOrg(id, orgId, session);

      // Delete technician records linked to this user or email in this org
      const Technician = (await import('../technician/technician.model.js')).default;
      const techOrConditions = [{ userId: id }];
      if (user.email) techOrConditions.push({ email: user.email });
      await Technician.deleteMany({ orgId, $or: techOrConditions }).session(session);

      // Check if user has any OTHER community memberships left across the platform
      const remainingMemberships = await orgMembershipService.getUserMemberships(id, session);
      const remainingCommunityMemberships = remainingMemberships.filter(m => {
        if (!m.orgId) return false;
        const memberOrgId = m.orgId._id ? m.orgId._id.toString() : m.orgId.toString();
        return memberOrgId !== orgId.toString() && !m.orgId.isPlatform;
      });

      if (remainingCommunityMemberships.length === 0) {
        // If they don't belong to any other community organization, hard-delete their global user record and all memberships
        await userRepository.delete(id, session);
        await orgMembershipService.deleteMembershipsByUserId(id, session);
        await Technician.deleteMany({ $or: techOrConditions }).session(session);
        
        // Clean up linked SSO identities
        const userIdentityService = (await import('../userIdentity/userIdentity.services.js')).default;
        await userIdentityService.deleteIdentitiesByUserId(id, session);

        // Revoke all active sessions
        const sessionService = (await import('../session/session.services.js')).default;
        await sessionService.revokeAllUserSessions(id, null, session);
      } else {
        const remaining = remainingCommunityMemberships[0];
        const getResidencyTypeFromMemberType = (type) => {
          switch (type) {
            case 'Owner': return 'Resident Owner';
            case 'Tenant': return 'Tenant';
            case 'Family': return 'Family Member';
            default: return 'None';
          }
        };
        const User = (await import('./user.model.js')).default;
        await User.updateOne(
          { _id: id },
          {
            $set: {
              villaId: remaining.villaId || null,
              residencyType: getResidencyTypeFromMemberType(remaining.residentType),
              roleId: remaining.roleId || null,
              roleIds: remaining.roleIds || []
            }
          }
        ).session(session);
      }

      await session.commitTransaction();
      userEvents.emit('USER_UPDATED', { userId: id, orgId, action: 'deleted' });
      return { id };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async inviteUser(email, orgId, villaId = null, residentType = 'None', roleName = null, phone = '', name = '') {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const existing = await userRepository.findByEmail(trimmedEmail, session);

      if (phone && phone.trim()) {
        const existingPhoneUser = await userRepository.findByPhone(phone.trim(), session);
        if (existingPhoneUser && (!existing || existingPhoneUser._id.toString() !== existing._id.toString())) {
          throw new HttpError(400, `User with phone number '${phone}' already exists.`);
        }
      }
      
      let user = existing;
      if (!existing) {
        let baseUsername = trimmedEmail.split('@')[0];
        let username = baseUsername;
        let usernameExists = await userRepository.findByUsername(username, session);
        
        // Auto-generate a unique username if the base one is taken
        while (usernameExists) {
          username = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`;
          usernameExists = await userRepository.findByUsername(username, session);
        }

        const userData = {
          email: trimmedEmail,
          username: username,
          name: name || username,
          status: 'Pending Verification',
          ...(phone ? { phone } : {}),
        };
        user = await userRepository.create(userData, session);
      } else {
        const updates = {};
        if (phone && !user.phone) updates.phone = phone;
        if (name && !user.name) updates.name = name;
        if (Object.keys(updates).length > 0) {
          user = await userRepository.update(user._id, updates, session);
        }
      }

      // Check if membership already exists
      const orgMembershipService = (await import('../orgMembership/orgMembership.services.js')).default;
      const existingMembership = await orgMembershipService.getMembership(user._id, orgId, session);
      if (existingMembership && existingMembership.status !== 'Pending') {
        if (!villaId) {
          throw new HttpError(400, 'User is already an active member of this community.');
        }
      }

      // Resolve roles if roleName is provided
      let roleIds = [];
      let calculatedResidentType = residentType;
      let role = null;
      if (roleName) {
        const roleService = (await import('../role/role.services.js')).default;
        role = await roleService.getRoleByName(roleName, orgId, session);
        if (role) {
          roleIds.push(role._id);
          // If residentType is missing or 'None', default it directly to the dynamic role name
          if (!calculatedResidentType || calculatedResidentType === 'None') {
            calculatedResidentType = role.name;
          }
        } else {
          throw new HttpError(400, `Role '${roleName}' not found in this community.`);
        }
      }

      // Setup units array update
      let membershipUnits = [];
      if (existingMembership && existingMembership.units) {
        membershipUnits = [...existingMembership.units];
      }

      if (villaId) {
        const unitIndex = membershipUnits.findIndex(u => u.villaId && u.villaId.toString() === villaId.toString());
        if (unitIndex > -1) {
          membershipUnits[unitIndex].residentType = calculatedResidentType;
        } else {
          membershipUnits.push({ villaId, residentType: calculatedResidentType });
        }
      }

      // Sync root fields to units[0]
      let rootVillaId = null;
      let rootResidentType = 'None';
      if (membershipUnits.length > 0) {
        rootVillaId = membershipUnits[0].villaId;
        rootResidentType = membershipUnits[0].residentType;
      } else if (villaId) {
        rootVillaId = villaId;
        rootResidentType = calculatedResidentType;
      }

      if (existingMembership) {
        // Update the existing membership with new role, villa, and resident type details (explicitly Pending status until accepted)
        if (roleIds.length > 0) {
          existingMembership.roleIds = roleIds;
          existingMembership.roleId = roleIds[0] || null;
        }
        existingMembership.villaId = rootVillaId;
        existingMembership.residentType = rootResidentType;
        existingMembership.units = membershipUnits;
        existingMembership.status = 'Pending';
        await existingMembership.save({ session });
      } else {
        // Create membership with villa association and roles (explicitly Pending status)
        const initialUnits = villaId ? [{ villaId, residentType: calculatedResidentType }] : [];
        await orgMembershipService.createMembership({
          userId: user._id,
          orgId,
          roleIds,
          roleId: roleIds[0] || null,
          villaId: rootVillaId,
          residentType: rootResidentType,
          units: initialUnits,
          status: 'Pending'
        }, session);
      }

      // Sync user profile with villa and residencyType
      const userResidencyType = roleName || calculatedResidentType || 'None';

      // Dynamically calculate a baseSystemType for mitigation/recommendation
      let baseSystemType = 'Tenant';
      if (role) {
        if (role.isTenantRole === true) {
          baseSystemType = 'Tenant';
        } else {
          const lowerRoleName = role.name.toLowerCase();
          if (lowerRoleName.includes('owner') && lowerRoleName.includes('non')) {
            baseSystemType = 'Non-Resident Owner';
          } else if (lowerRoleName.includes('owner')) {
            baseSystemType = 'Resident Owner';
          } else if (lowerRoleName.includes('tenant')) {
            baseSystemType = 'Tenant';
          } else if (lowerRoleName.includes('family')) {
            baseSystemType = 'Family Member';
          } else if (lowerRoleName.includes('staff')) {
            baseSystemType = 'Staff';
          } else {
            if (calculatedResidentType === 'Owner') {
              baseSystemType = 'Resident Owner';
            } else if (calculatedResidentType === 'Family') {
              baseSystemType = 'Family Member';
            } else if (calculatedResidentType === 'Guest') {
              baseSystemType = 'Staff';
            }
          }
        }
      }

      await userRepository.update(user._id, { villaId: rootVillaId, residencyType: userResidencyType }, session);

      // Add to Villa residents array via villa service to respect boundaries
      if (villaId) {
        const villaService = (await import('../villa/villa.services.js')).default;
        // RECOMMENDATION: Eventually update the InvoiceService and other strict-string services
        // to check role.isTenantRole or a baseSystemType classification (calculated as: ${baseSystemType})
        // rather than strictly matching residencyType strings like 'Tenant' or 'Resident Owner'.
        await villaService.assignResidentToVilla(villaId, user._id, userResidencyType, session);
      }

      // Always generate an invitationToken with orgId (for both new and existing users)
      const tokenService = (await import('../token/token.services.js')).default;
      const result = await tokenService.generateInvitationToken(user._id, orgId, session);
      const invitationToken = result.invitationToken;

      // Insert transactional outbox event for async email processing
      const OutboxEvent = (await import('../outbox/outboxEvent.model.js')).default;
      const outboxEvent = new OutboxEvent({
        eventType: 'USER_INVITED',
        payload: { email: trimmedEmail, orgId, invitationToken },
        status: 'PENDING',
      });
      await outboxEvent.save({ session });

      // Auto-sync technician record if assigned a staff/vendor role
      if (roleName) {
        await this.syncTechnicianForStaffUser(user._id, orgId, [roleName], session);
      }

      await session.commitTransaction();
      
      // Dispatch event for real-time frontend syncing
      userEvents.emit('USER_UPDATED', { userId: user._id, orgId, action: 'invited' });

      return { user, invitationToken };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async syncTechnicianForStaffUser(userId, orgId, roleNames = [], session = null) {
    try {
      const isStaffRole = roleNames.some(r => {
        if (!r) return false;
        const lower = r.toLowerCase();
        return lower.includes('staff') || lower.includes('vendor') || lower.includes('technician') || lower.includes('maintenance');
      });

      if (!isStaffRole) return;

      const User = (await import('./user.model.js')).default;
      const user = await User.findById(userId).session(session || null);
      if (!user) return;

      const Technician = (await import('../technician/technician.model.js')).default;

      const existingTech = await Technician.findOne({
        orgId,
        $or: [
          { userId: user._id },
          ...(user.email ? [{ email: user.email }] : []),
          ...(user.phone && user.phone !== 'N/A' ? [{ phone: user.phone }] : [])
        ]
      }).session(session || null);

      if (existingTech) {
        existingTech.userId = user._id;
        if (user.name && user.name !== user.username) {
          existingTech.name = user.name;
        }
        if (user.phone && user.phone !== 'N/A') {
          existingTech.phone = user.phone;
        }
        existingTech.isDeleted = false;
        existingTech.status = user.status === 'Active' ? 'Active' : 'Pending';
        await existingTech.save(session ? { session } : undefined);
      } else {
        await Technician.create([{
          orgId,
          userId: user._id,
          name: user.name || user.username || user.email.split('@')[0],
          email: user.email,
          phone: user.phone || 'N/A',
          department: 'Others',
          type: 'In-House Staff',
          status: user.status === 'Active' ? 'Active' : 'Pending',
          whatsappEnabled: true,
          isDeleted: false
        }], session ? { session } : undefined);
      }
    } catch (err) {
      console.error('Failed to sync technician for staff user:', err);
    }
  }

  async updateUserRoles(userId, orgId, roles, villaId = null, session = null) {
    let localSession = null;
    if (!session) {
      localSession = await mongoose.startSession();
      localSession.startTransaction();
    }
    const currentSession = session || localSession;

    try {
      const roleService = (await import('../role/role.services.js')).default;
      const roleIds = [];
      const foundRoleNames = [];
      
      const roleNames = Array.isArray(roles) ? roles : [roles].filter(Boolean);
      
      for (const name of roleNames) {
        const role = await roleService.getRoleByName(name, orgId, currentSession);
        if (role) {
          roleIds.push(role._id);
          foundRoleNames.push(role.name);
        } else {
          throw new HttpError(400, `Role '${name}' not found`);
        }
      }

      const orgMembershipService = (await import('../orgMembership/orgMembership.services.js')).default;
      
      let newResidentType = null;
      if (foundRoleNames.includes('Resident Owner')) newResidentType = 'Owner';
      else if (foundRoleNames.includes('Resident Tenant')) newResidentType = 'Tenant';
      else if (foundRoleNames.includes('Family Member')) newResidentType = 'Family';

      const updatedMembership = await orgMembershipService.updateMembershipRole(userId, orgId, roleIds, villaId, newResidentType, currentSession);
      if (!updatedMembership) {
        throw new HttpError(404, 'User organization membership not found.');
      }
      
      // Auto-sync technician record if updated to a staff/vendor role
      await this.syncTechnicianForStaffUser(userId, orgId, foundRoleNames, currentSession);

      // Fetch fresh permission array for newly assigned roles
      const rolePermissionService = (await import('../rolePermission/rolePermission.services.js')).default;
      rolePermissionService.clearCache();
      
      let updatedPermissions = [];
      for (const rId of roleIds) {
        const perms = await rolePermissionService.getPermissionsByRoleId(rId);
        updatedPermissions.push(...perms.map((p) => p.name));
      }
      updatedPermissions = Array.from(new Set(updatedPermissions));

      if (localSession) {
        await localSession.commitTransaction();
      }
      userEvents.emit('USER_UPDATED', {
        userId,
        orgId,
        action: 'roles_updated',
        roles: foundRoleNames,
        roleIds: roleIds.map((r) => r.toString()),
        permissions: updatedPermissions,
      });
      return { id: userId, roles: foundRoleNames, permissions: updatedPermissions };
    } catch (error) {
      if (localSession) {
        await localSession.abortTransaction();
      }
      throw error;
    } finally {
      if (localSession) {
        await localSession.endSession();
      }
    }
  }

  async getAllUsersInOrg(orgId, page = 1, limit = 10, filters = {}) {
    const orgMembershipService = (await import('../orgMembership/orgMembership.services.js')).default;
    return await orgMembershipService.getPaginatedUsersForOrg(orgId, page, limit, filters);
  }

  async activateUser(id, hashedPassword, session) {
    const updatedUser = await userRepository.update(id, { password: hashedPassword, status: 'Active' }, session);
    return updatedUser;
  }

  async updateProfile(id, { name, phone, avatarFilename }) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const user = await this.getUserById(id, session);

      const payload = { $set: {}, $unset: {} };
      if (name !== undefined) payload.$set.name = name;
      
      if (phone !== undefined) {
        if (phone.trim() === '') {
          payload.$unset.phone = 1;
        } else {
          const trimmedPhone = phone.trim();
          const existingPhoneUser = await userRepository.findByPhone(trimmedPhone, session);
          if (existingPhoneUser && existingPhoneUser._id.toString() !== id.toString()) {
            throw new HttpError(400, `User with phone number '${phone}' already exists.`);
          }
          payload.$set.phone = trimmedPhone;
        }
      }

      if (avatarFilename !== undefined) {
        payload.$set.avatar = `public/uploads/avatars/${avatarFilename}`;

        // Delete old avatar from disk if it exists
        if (user.avatar) {
          const oldFilename = path.basename(user.avatar);
          const oldFilePath = path.join(uploadDir, oldFilename);
          if (fs.existsSync(oldFilePath)) {
            fs.unlink(oldFilePath, (err) => {
              if (err) console.error('Error deleting old avatar file:', err);
            });
          }
        }
      }

      if (Object.keys(payload.$set).length === 0) delete payload.$set;
      if (Object.keys(payload.$unset).length === 0) delete payload.$unset;

      const updatedUser = await userRepository.update(id, payload, session);
      await session.commitTransaction();
      
      userEvents.emit('USER_UPDATED', { userId: id, action: 'profile_updated' });
      return updatedUser;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async bulkInviteUsers(invitations, orgId) {
    const successes = [];
    const failures = [];

    const villaService = (await import('../villa/villa.services.js')).default;

    for (const invite of invitations) {
      const { email, residentType = 'None', roleName, villaNumber, villaId: payloadVillaId } = invite;
      const trimmedEmail = email ? email.trim().toLowerCase() : '';

      try {
        if (!trimmedEmail) {
          throw new HttpError(400, 'Email address is required.');
        }

        let villaId = payloadVillaId || null;

        // If villa number is provided and villaId not explicit, resolve it
        if (!villaId && villaNumber && villaNumber.trim()) {
          const trimmedVillaNo = villaNumber.trim();
          const villa = await villaService.getVillaByNumber(trimmedVillaNo, orgId);
          if (villa) {
            villaId = villa._id;
          }
        }

        // Call the single inviteUser logic
        await this.inviteUser(trimmedEmail, orgId, villaId, residentType, roleName);

        successes.push({
          email: trimmedEmail,
          status: 'Invited',
          role: roleName,
          villaNumber: villaNumber || '',
        });
      } catch (error) {
        failures.push({
          email: trimmedEmail || 'Unknown',
          error: error.message || 'Invitation failed',
          role: roleName || '',
          villaNumber: villaNumber || '',
        });
      }
    }

    return {
      total: invitations.length,
      successCount: successes.length,
      failureCount: failures.length,
      successes,
      failures,
    };
  }

  async getUsersByIds(ids, session = null) {
    const User = (await import('./user.model.js')).default;
    return await User.find({ _id: { $in: ids } }).session(session);
  }

  async getUserByPhone(phone, session = null) {
    return await userRepository.findByPhone(phone, session);
  }

  async getUserByEmailOrPhone(identifier, session = null) {
    const trimmed = identifier.trim();
    if (trimmed.includes('@')) {
      return await userRepository.findByEmail(trimmed.toLowerCase(), session);
    }
    return await userRepository.findByPhone(trimmed, session);
  }
}

export default new UserService();

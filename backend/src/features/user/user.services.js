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

      // Check uniqueness
      const existingEmail = await userRepository.findByEmail(userData.email, currentSession);
      if (existingEmail) {
        throw new HttpError(400, `User with email '${userData.email}' already exists.`);
      }

      const existingUsername = await userRepository.findByUsername(userData.username, currentSession);
      if (existingUsername) {
        throw new HttpError(400, `User with username '${userData.username}' already exists.`);
      }

      // Hash the password securely using crypto utilities
      userData.password = await hashPassword(userData.password);

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

  async deleteUser(id) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await this.getUserById(id, session); // Throws if user doesn't exist
      const orgMembershipService = (await import('../orgMembership/orgMembership.services.js')).default;
      await orgMembershipService.deleteMembershipsByUserId(id, session);

      // Remove user from any Villa residents arrays they might be in
      const VillaModel = (await import('../villa/villa.model.js')).default;
      await VillaModel.updateMany(
        { 'residents.userId': id },
        { $pull: { residents: { userId: id } } }
      ).session(session);

      const deletedUser = await userRepository.delete(id, session);
      await session.commitTransaction();
      userEvents.emit('USER_UPDATED', { userId: id, action: 'deleted' });
      return deletedUser;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async inviteUser(email, orgId, villaId = null, residentType = 'None', roleName = null) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const existing = await userRepository.findByEmail(trimmedEmail, session);
      
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
          status: 'Pending Verification',
        };
        user = await userRepository.create(userData, session);
      }

      // Check if membership already exists
      const orgMembershipService = (await import('../orgMembership/orgMembership.services.js')).default;
      const existingMembership = await orgMembershipService.getMembership(user._id, orgId, session);
      if (existingMembership) {
        throw new HttpError(400, 'User is already a member of this community.');
      }

      // Resolve roles if roleName is provided
      let roleIds = [];
      if (roleName) {
        const roleService = (await import('../role/role.services.js')).default;
        const role = await roleService.getRoleByName(roleName, orgId, session);
        if (role) {
          roleIds.push(role._id);
          // Auto-determine residentType if it is 'None' or empty based on role name keywords
          if (!residentType || residentType === 'None') {
            const lowerRoleName = role.name.toLowerCase();
            if (lowerRoleName.includes('owner')) {
              residentType = 'Owner';
            } else if (lowerRoleName.includes('tenant')) {
              residentType = 'Tenant';
            } else if (lowerRoleName.includes('family')) {
              residentType = 'Family';
            }
          }
        } else {
          throw new HttpError(400, `Role '${roleName}' not found in this community.`);
        }
      }

      // Create membership with villa association and roles
      await orgMembershipService.createMembership({
        userId: user._id,
        orgId,
        roleIds,
        roleId: roleIds[0] || null,
        villaId: villaId || null,
        residentType
      }, session);

      // Sync user profile with villa and residencyType (must be one of: 'Resident Owner', 'Tenant', 'Family Member', 'Non-Resident Owner', 'Staff')
      let residencyType = 'Tenant';
      const normalizedRole = roleName ? roleName.toLowerCase() : '';
      if (normalizedRole.includes('owner') && normalizedRole.includes('non')) {
        residencyType = 'Non-Resident Owner';
      } else if (normalizedRole.includes('owner')) {
        residencyType = 'Resident Owner';
      } else if (normalizedRole.includes('tenant')) {
        residencyType = 'Tenant';
      } else if (normalizedRole.includes('family')) {
        residencyType = 'Family Member';
      } else if (normalizedRole.includes('staff')) {
        residencyType = 'Staff';
      } else {
        // Fallback to residentType mapping
        if (residentType === 'Owner') {
          residencyType = 'Resident Owner';
        } else if (residentType === 'Family') {
          residencyType = 'Family Member';
        } else if (residentType === 'Guest') {
          residencyType = 'Staff';
        }
      }

      await userRepository.update(user._id, { villaId, residencyType }, session);

      // Add to Villa residents array if villaId is provided
      if (villaId) {
        const VillaModel = (await import('../villa/villa.model.js')).default;
        const villa = await VillaModel.findOne({ _id: villaId, orgId }).session(session);
        if (villa) {
          const alreadyAssigned = villa.residents.some(r => String(r.userId) === String(user._id));
          if (!alreadyAssigned) {
            // Use in-memory push to residents array
            villa.residents.push({
              userId: user._id,
              residencyType,
              isPrimary: false,
              assignedAt: new Date()
            });
          }

          // In-memory occupancy status update
          if (residentType === 'Owner' || residentType === 'Tenant') {
            villa.status = 'Occupied';
          } else if (villa.status === 'Vacant') {
            villa.status = 'Occupied';
          }

          // Single save execution
          await villa.save({ session });
        }
      }

      // Dynamically import tokenService to follow clean cross-feature flow
      const tokenService = (await import('../token/token.services.js')).default;
      const { invitationToken } = await tokenService.generateInvitationToken(user._id, session);

      await session.commitTransaction();

      // Dispatch event for asynchronous SMTP email transmission
      userEvents.emit('USER_INVITED', { email: trimmedEmail, orgId, invitationToken });
      
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

  async updateUserRoles(userId, orgId, roles) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const roleService = (await import('../role/role.services.js')).default;
      const roleIds = [];
      const foundRoleNames = [];
      
      const roleNames = Array.isArray(roles) ? roles : [roles].filter(Boolean);
      
      for (const name of roleNames) {
        const role = await roleService.getRoleByName(name, orgId, session);
        if (role) {
          roleIds.push(role._id);
          foundRoleNames.push(role.name);
        } else {
          throw new HttpError(400, `Role '${name}' not found`);
        }
      }

      const orgMembershipService = (await import('../orgMembership/orgMembership.services.js')).default;
      const updatedMembership = await orgMembershipService.updateMembershipRole(userId, orgId, roleIds, session);
      if (!updatedMembership) {
        throw new HttpError(404, 'User organization membership not found.');
      }
      
      await session.commitTransaction();
      userEvents.emit('USER_UPDATED', { userId, orgId, action: 'roles_updated' });
      return { id: userId, roles: foundRoleNames };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async getAllUsersInOrg(orgId, page = 1, limit = 10, filters = {}) {
    const orgMembershipService = (await import('../orgMembership/orgMembership.services.js')).default;
    return await orgMembershipService.getPaginatedUsersForOrg(orgId, page, limit, filters);
  }

  async activateUser(id, hashedPassword, session) {
    const updatedUser = await userRepository.update(id, { password: hashedPassword, status: 'Active' }, session);
    userEvents.emit('USER_ACTIVATED', { userId: id, session });
    userEvents.emit('USER_UPDATED', { userId: id, action: 'activated' });
    return updatedUser;
  }

  async updateProfile(id, { name, phone, avatarFilename }) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const user = await this.getUserById(id, session);

      const payload = {};
      if (name !== undefined) payload.name = name;
      if (phone !== undefined) payload.phone = phone;
      if (avatarFilename !== undefined) {
        payload.avatar = `public/uploads/avatars/${avatarFilename}`;

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
      const { email, residentType = 'None', roleName, villaNumber } = invite;
      const trimmedEmail = email ? email.trim().toLowerCase() : '';

      try {
        if (!trimmedEmail) {
          throw new HttpError(400, 'Email address is required.');
        }

        let villaId = null;

        // If villa number is provided, resolve it
        if (villaNumber && villaNumber.trim()) {
          const trimmedVillaNo = villaNumber.trim();
          const villa = await villaService.getVillaByNumber(trimmedVillaNo, orgId);
          if (!villa) {
            throw new HttpError(404, `Villa number '${trimmedVillaNo}' not found in this community.`);
          }
          villaId = villa._id;
        } else if (['Owner', 'Tenant', 'Family'].includes(residentType)) {
          // Residents must have a villa number
          throw new HttpError(400, `Villa number is required for resident type '${residentType}'.`);
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
}

export default new UserService();

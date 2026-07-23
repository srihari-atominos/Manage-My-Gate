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

  async deleteUserFromOrg(id, orgId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await this.getUserById(id, session); // Throws if user doesn't exist
      const orgMembershipService = (await import('../orgMembership/orgMembership.services.js')).default;
      await orgMembershipService.deleteMembership(id, orgId, session);

      // Remove user from any Villa residents arrays they might be in within this organization
      const villaService = (await import('../villa/villa.services.js')).default;
      await villaService.removeUserFromAllVillasInOrg(id, orgId, session);

      await session.commitTransaction();
      userEvents.emit('USER_UPDATED', { userId: id, action: 'deleted' });
      return { id };
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
        if (existingMembership.status !== 'Pending') {
          throw new HttpError(400, 'User is already a member of this community.');
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
        // Update the existing pending membership with new role, villa, and resident type details
        existingMembership.roleIds = roleIds;
        existingMembership.roleId = roleIds[0] || null;
        existingMembership.villaId = rootVillaId;
        existingMembership.residentType = rootResidentType;
        existingMembership.units = membershipUnits;
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
      await OutboxEvent.create(
        [
          {
            eventType: 'USER_INVITED',
            payload: { email: trimmedEmail, orgId, invitationToken },
            status: 'PENDING',
          },
        ],
        { session }
      );

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

  async updateUserRoles(userId, orgId, roles, session = null) {
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
      const updatedMembership = await orgMembershipService.updateMembershipRole(userId, orgId, roleIds, currentSession);
      if (!updatedMembership) {
        throw new HttpError(404, 'User organization membership not found.');
      }
      
      if (localSession) {
        await localSession.commitTransaction();
      }
      userEvents.emit('USER_UPDATED', { userId, orgId, action: 'roles_updated' });
      return { id: userId, roles: foundRoleNames };
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

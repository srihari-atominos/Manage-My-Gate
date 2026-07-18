import organizationRepository from './organization.repository.js';
import HttpError from '../../utils/httpError.utils.js';
import mongoose from 'mongoose';
import orgEventEmitter from './organization.events.js';


export class OrganizationService {
  async createOrganization(orgData, session) {
    return await organizationRepository.create(orgData, session);
  }

  async getOrganizationById(id, session) {
    const org = await organizationRepository.findById(id, session);
    if (!org) {
      throw new HttpError(404, `Organization with ID ${id} not found.`);
    }
    return org;
  }

  async updateFeatures(orgId, requestingOrgId, featuresArray, userId = null, isPlatformUser = false, session = null) {
    if (orgId !== requestingOrgId && !isPlatformUser) {
      throw new HttpError(403, 'Forbidden. You do not have permission to access another organization.');
    }

    let localSession = null;
    if (!session) {
      localSession = await mongoose.startSession();
      localSession.startTransaction();
    }
    const currentSession = session || localSession;

    try {
      // 1. Validate organization exists
      await this.getOrganizationById(orgId, currentSession);

      // 2. Update allowedFeatures in Organization document
      const updatedOrg = await organizationRepository.updateAllowedFeatures(orgId, featuresArray, currentSession);

      // 3. Crucial Permission Linkage:
      // Dynamically import services to respect feature boundaries
      const roleService = (await import('../role/role.services.js')).default;
      const rolePermissionService = (await import('../rolePermission/rolePermission.services.js')).default;
      const permissionService = (await import('../permission/permission.services.js')).default;

      // 4. Fetch the 'Community Admin' role for this orgId
      const adminRole = await roleService.getRoleByName('Community Admin', orgId, currentSession);
      if (!adminRole) {
        throw new HttpError(404, 'Community Admin role not found for this organization.');
      }

      // 5. Get all system permissions and filter them by features in the featuresArray
      const allPermissions = await permissionService.getAllPermissions();
      const targetPermissions = allPermissions.filter((perm) =>
        featuresArray.includes(perm.feature)
      );
      const granularPermissionIds = targetPermissions.map((perm) => perm._id.toString());

      // Ensure base UI permissions: ['users:read', 'roles:read'] are always included for Workspace Admin
      const basePermissions = allPermissions.filter((perm) =>
        ['users:read', 'roles:read'].includes(perm.name)
      );
      for (const basePerm of basePermissions) {
        const baseId = basePerm._id.toString();
        if (!granularPermissionIds.includes(baseId)) {
          granularPermissionIds.push(baseId);
        }
      }

      // 6. Update role permissions for the Workspace Admin role
      await rolePermissionService.updateRolePermissions(adminRole._id.toString(), granularPermissionIds, currentSession);

      if (localSession) {
        await localSession.commitTransaction();
      }

      // Generate a new token if userId is provided
      let token = null;
      if (userId) {
        const authService = (await import('../auth/auth.services.js')).default;
        const user = await authService.getUserById(userId);
        token = await authService.generateToken(user, orgId);
      }

      return token ? { organization: updatedOrg, token } : updatedOrg;
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

  async getAllOrganizations(page = 1, limit = 10) {
    return await organizationRepository.findAllPaginated(Number(page), Number(limit));
  }

  async changeOrganizationStatus(orgId, status, requestingUserId = null) {
    const validStatuses = ['Active', 'Pending', 'Rejected'];
    if (!validStatuses.includes(status)) {
      throw new HttpError(400, `Invalid status. Must be one of ${validStatuses.join(', ')}.`);
    }

    const localSession = await mongoose.startSession();
    localSession.startTransaction();

    try {
      // 1. Verify organization exists
      const org = await organizationRepository.findById(orgId, localSession);
      if (!org) {
        throw new HttpError(404, `Organization with ID ${orgId} not found.`);
      }

      if (org.isPlatform === true) {
        throw new HttpError(403, 'Critical System Restriction: The System Platform cannot be blocked or modified.');
      }

      const oldStatus = org.status;

      // 2. Update status
      const updatedOrg = await organizationRepository.updateStatus(orgId, status, localSession);

      await localSession.commitTransaction();

      // Emit decoupled status changed event outside transaction lifecycle
      orgEventEmitter.emit('ORG_STATUS_CHANGED', {
        actorId: requestingUserId,
        targetId: orgId,
        oldStatus,
        newStatus: status,
      });

      return updatedOrg;
    } catch (error) {
      await localSession.abortTransaction();
      throw error;
    } finally {
      await localSession.endSession();
    }
  }

  async checkNameAvailability(name) {
    if (!name || !name.trim()) {
      throw new HttpError(400, 'Organization name query parameter is required.');
    }
    const org = await organizationRepository.findByName(name.trim());
    return !org;
  }

  async setupWorkspace({ name, organizationType, contactEmail, contactPhone, expectedMemberCount, timezone, userId, password }) {
    // Enforce name uniqueness checks BEFORE starting the write transaction
    const trimmedName = name.trim();
    const existingOrg = await organizationRepository.findByName(trimmedName);
    if (existingOrg) {
      throw new HttpError(409, 'Conflict. Organization name already exists.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (password) {
        const userService = (await import('../user/user.services.js')).default;
        const { hashPassword } = await import('../../utils/crypto.utils.js');
        const hashedPassword = await hashPassword(password);
        await userService.updateUser(userId, { password: hashedPassword }, session);
      }

      // 1. Create Organization
      const orgPayload = {
        name: trimmedName,
        organizationType,
        contactEmail,
        contactPhone,
        expectedMemberCount,
        timezone: timezone || 'Asia/Kolkata',
        status: 'Active',
        allowedFeatures: ['users', 'roles', 'integrations', 'villas', 'amenities', 'notices']
      };
      const newOrg = await organizationRepository.create(orgPayload, session);

      // 2. Create the default Roles and assign Permissions
      const roleService = (await import('../role/role.services.js')).default;
      const rolePermissionService = (await import('../rolePermission/rolePermission.services.js')).default;
      const permissionService = (await import('../permission/permission.services.js')).default;

      const allPermissions = await permissionService.getAllPermissions();

      // Helper function to get IDs by name list
      const getPermissionIds = (names) => {
        return allPermissions
          .filter(p => names.includes(p.name))
          .map(p => p._id.toString());
      };

      // Create Community Admin Role
      const adminRole = await roleService.createRole(
        { name: 'Community Admin', description: 'Gated community administrator with full access privileges.', orgId: newOrg._id, isTenantRole: false },
        session
      );
      // Admin gets all permissions
      const allPermissionIds = allPermissions.map(p => p._id.toString());
      await rolePermissionService.updateRolePermissions(adminRole._id.toString(), allPermissionIds, session);

      // Create Resident Owner Role
      const ownerRole = await roleService.createRole(
        { name: 'Resident Owner', description: 'Villa Owner residing in the community.', orgId: newOrg._id, isTenantRole: true },
        session
      );
      const ownerPerms = getPermissionIds([
        'villas:read', 'users:read', 
        'amenities:discover', 'amenities:my_booking', 
        'amenities:wallet', 'amenities:history', 'amenities:amenities',
        'notices:read'
      ]);
      await rolePermissionService.updateRolePermissions(ownerRole._id.toString(), ownerPerms, session);

      // Create Resident Tenant Role
      const tenantRole = await roleService.createRole(
        { name: 'Resident Tenant', description: 'Villa Tenant residing in the community.', orgId: newOrg._id, isTenantRole: true },
        session
      );
      const tenantPerms = getPermissionIds([
        'villas:read', 'users:read', 
        'amenities:discover', 'amenities:my_booking', 
        'amenities:wallet', 'amenities:history', 'amenities:amenities',
        'notices:read'
      ]);
      await rolePermissionService.updateRolePermissions(tenantRole._id.toString(), tenantPerms, session);

      // Create Family Member Role
      const familyRole = await roleService.createRole(
        { name: 'Family Member', description: 'Family member of a resident.', orgId: newOrg._id, isTenantRole: true },
        session
      );
      const familyPerms = getPermissionIds([
        'villas:read', 
        'amenities:discover', 'amenities:my_booking', 'amenities:history',
        'notices:read'
      ]);
      await rolePermissionService.updateRolePermissions(familyRole._id.toString(), familyPerms, session);

      // Create Security Guard Role
      const guardRole = await roleService.createRole(
        { name: 'Security Guard', description: 'Security gate staff.', orgId: newOrg._id, isTenantRole: false },
        session
      );
      const guardPerms = getPermissionIds([
        'villas:read', 'users:read', 
        'amenities:scanner', 'amenities:security_logs',
        'notices:read'
      ]);
      await rolePermissionService.updateRolePermissions(guardRole._id.toString(), guardPerms, session);

      // 3. Create the Organization Membership linking user, org, and role
      const orgMembershipService = (await import('../orgMembership/orgMembership.services.js')).default;
      await orgMembershipService.createMembership(
        { userId, orgId: newOrg._id, roleIds: [adminRole._id] },
        session
      );

      await session.commitTransaction();

      // Outside the write transaction, generate the fresh token context
      const authService = (await import('../auth/auth.services.js')).default;
      const user = await authService.getUserById(userId);
      
      const { tokenPayload, availableWorkspaces } = await authService.getScopedTokenPayload(user, newOrg._id.toString());
      const { signToken } = await import('../../utils/jwt.utils.js');
      const token = signToken(tokenPayload);

      return {
        token,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          role: tokenPayload.role,
          permissions: tokenPayload.permissions,
          orgId: tokenPayload.orgId,
          isPlatform: tokenPayload.isPlatform,
        },
        availableWorkspaces,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
}

export default new OrganizationService();

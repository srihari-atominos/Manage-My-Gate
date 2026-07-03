import organizationRepository from './organization.repository.js';
import HttpError from '../../utils/httpError.utils.js';
import mongoose from 'mongoose';


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

      // 4. Fetch the 'Workspace Admin' role for this orgId
      const adminRole = await roleService.getRoleByName('Workspace Admin', orgId, currentSession);
      if (!adminRole) {
        throw new HttpError(404, 'Workspace Admin role not found for this organization.');
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



  async checkNameAvailability(name) {
    if (!name || !name.trim()) {
      throw new HttpError(400, 'Organization name query parameter is required.');
    }
    const org = await organizationRepository.findByName(name.trim());
    return !org;
  }

  async setupWorkspace({ name, userId }) {
    // Enforce name uniqueness checks BEFORE starting the write transaction
    const trimmedName = name.trim();
    const existingOrg = await organizationRepository.findByName(trimmedName);
    if (existingOrg) {
      throw new HttpError(409, 'Conflict. Organization name already exists.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Create Organization
      const newOrg = await organizationRepository.create({ name: trimmedName, status: 'Active', allowedFeatures: [] }, session);

      // 2. Create the Workspace Admin Role for the Org
      const roleService = (await import('../role/role.services.js')).default;
      const newRole = await roleService.createRole(
        { name: 'Workspace Admin', orgId: newOrg._id },
        session
      );

      // 3. Create the Organization Membership linking user, org, and role
      const orgMembershipService = (await import('../orgMembership/orgMembership.services.js')).default;
      await orgMembershipService.createMembership(
        { userId, orgId: newOrg._id, roleIds: [newRole._id] },
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

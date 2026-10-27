import mongoose from 'mongoose';
import roleRepository from './role.repository.js';
import roleEvents from './role.events.js';
import HttpError from '../../utils/httpError.utils.js';
import { isTenantScope } from './roleScope.constants.js';
import logger from '../../utils/logger.utils.js';

// Role names that confer platform-level privileges. Only roles inside the platform organisation may use them.
export const RESERVED_PLATFORM_ROLE_NAMES = ['super admin', 'superadmin', 'platform admin', 'platform super admin', 'super_admin', 'platform_admin'];

// Shared platform roles nobody may change from a community.
export const PROTECTED_ROLE_NAMES = ['super admin', 'platform super admin'];
// Roles the rest of the system finds by name (admin checks, notifications): they may be tuned but never
// renamed or deleted, or the community can lose its administrators.
export const LOCKED_ROLE_NAMES = ['community admin', 'admin'];

const lower = (value) => String(value ?? '').trim().toLowerCase();
const normalizePermission = (value) => String(value ?? '').trim().replace(':', '.').toLowerCase();

/** Resolves requested permissions (ids, names like `staff:view`, `staff.view`, or codes) to catalog documents. */
export const matchPermissions = (allPermissions, requested) => {
  const wanted = (Array.isArray(requested) ? requested : []).filter(Boolean).map((perm) => String(perm).trim());
  if (wanted.length === 0) return [];
  const isMatch = (p, perm) => {
    const pId = p._id ? p._id.toString() : '';
    const pName = p.name ? p.name.trim() : '';
    const pCode = p.code ? p.code.trim() : '';
    return perm === pId || perm === pName || perm === pCode || normalizePermission(perm) === normalizePermission(pName);
  };
  const catalog = allPermissions || [];
  const unknown = wanted.filter((perm) => !catalog.some((p) => isMatch(p, perm)));
  if (unknown.length > 0) {
    // Not saved: surface drift between client permission codes and the catalog instead of hiding it.
    logger.warn(`[RoleService] Ignoring permissions not in the catalog: ${unknown.join(', ')}`);
  }
  return catalog.filter((p) => wanted.some((perm) => isMatch(p, perm)));
};

export class RoleService {
  /**
   * Who may touch a role. `actor` is { orgId, isPlatform, permissions } of the caller; when it is not
   * given (internal callers such as community setup) no check is made.
   * - A community can only see and change roles that belong to it.
   * - Shared roles (no community) are read-only for communities; only platform admins change them.
   */
  assertRoleAccess(role, actor, { write = false } = {}) {
    if (typeof actor === 'string' || (actor && actor._bsontype === 'ObjectID') || (actor && mongoose.Types.ObjectId.isValid(actor) && typeof actor !== 'object')) {
      actor = { orgId: String(actor) };
    }
    if (!actor || actor.isPlatform) return;
    const roleOrg = role.orgId ? String(role.orgId) : null;
    if (roleOrg && roleOrg !== String(actor.orgId)) {
      // Do not reveal that the role exists in another community.
      throw new HttpError(404, `Role with ID ${role._id} not found.`);
    }
    if (!roleOrg && write) {
      throw new HttpError(403, 'Shared system roles can only be changed by platform administrators.');
    }
  }

  assertRoleNotProtected(role, { renameOrDelete = false } = {}) {
    const name = lower(role.name);
    if (PROTECTED_ROLE_NAMES.includes(name)) {
      throw new HttpError(403, 'The Super Admin and Platform Super Admin roles are protected system roles and cannot be modified.');
    }
    if (renameOrDelete && LOCKED_ROLE_NAMES.includes(name)) {
      throw new HttpError(403, `The '${role.name}' role is required by the community and cannot be renamed or deleted. You can still adjust its permissions.`);
    }
  }

  /** A role manager can only newly grant permissions they hold themselves. */
  async assertCanGrant(addedPermissions, actor) {
    if (!actor || actor.isPlatform || addedPermissions.length === 0) return;
    const held = Array.isArray(actor.permissions) ? actor.permissions : [];
    if (held.includes('*')) return;
    const heldSet = new Set(held.map(normalizePermission));
    let missingPermissions = addedPermissions.filter((permission) =>
      !heldSet.has(normalizePermission(permission.name))
    );

    // The Platform Admin defines which feature modules a community owns. Its
    // Community Admin may delegate every permission in those selected modules,
    // even when their current session predates a feature change. Unselected
    // modules remain non-delegable.
    const actorRole = lower(actor.role).replace(/[_-]/g, ' ');
    if (actorRole === 'community admin' && actor.orgId && missingPermissions.length > 0) {
      const organizationModule = await import('../organization/organization.services.js');
      const organization = await organizationModule.default.getOrganizationById(actor.orgId);
      const enabledFeatures = organizationModule.expandFeatureKeys(organization.allowedFeatures || []);
      missingPermissions = missingPermissions.filter((permission) => !enabledFeatures.has(permission.feature));
    }

    const missing = missingPermissions.map((p) => p.name);
    if (missing.length > 0) {
      throw new HttpError(403, `You cannot grant permissions you do not have yourself: ${missing.join(', ')}.`);
    }
  }

  /**
   * Reject reserved platform role names for any non-platform organisation, so tenants cannot
   * mint a role that impersonates a platform administrator.
   */
  async assertRoleNameAllowed(name, orgId, session = null) {
    if (!name || !orgId) return;
    if (!RESERVED_PLATFORM_ROLE_NAMES.includes(String(name).trim().toLowerCase())) return;

    const organizationService = (await import('../organization/organization.services.js')).default;
    const org = await organizationService.getOrganizationById(orgId, session);
    if (!org.isPlatform) {
      throw new HttpError(403, `'${String(name).trim()}' is a reserved platform role name and cannot be used in a community.`);
    }
  }

  async getAllRoles(orgId, page = 1, limit = 10, search = '', scope = '') {
    {
      const skip = (page - 1) * limit;
      const { data, totalRecords, scopeCounts } = await roleRepository.findAllPaginated(orgId, skip, limit, null, search, scope);
      if (orgId && data.length > 0) {
        const orgMembershipService = (await import('../orgMembership/orgMembership.services.js')).default;
        const counts = await orgMembershipService.countActiveMembersByRole(orgId, data.map((r) => r._id));
        data.forEach((r) => {
          r.memberCount = counts[String(r._id)] || 0;
        });
      }
      const totalPages = Math.ceil(totalRecords / limit);
      return {
        data,
        pagination: {
          totalRecords,
          currentPage: page,
          totalPages: totalPages || 1,
          limit,
        },
        scopeCounts,
      };
    }
  }

  async getRoleById(id, session) {
    const role = await roleRepository.findById(id, session);
    if (!role) {
      throw new HttpError(404, `Role with ID ${id} not found.`);
    }
    return role;
  }

  async getRoleByName(name, orgId = null, session = null) {
    return await roleRepository.findByName(name, orgId, session);
  }

  async createRole(roleData, session = null, actor = null) {
    let localSession = null;
    if (!session) {
      localSession = await mongoose.startSession();
      localSession.startTransaction();
    }
    const currentSession = session || localSession;
    let pendingEvent = null;

    try {
      const { name, description, permissions, integrationMappings, orgId, isTenantRole, roleScope, communityOnly } = roleData;
      const trimmedName = name ? name.trim() : '';
      if (!trimmedName) {
        throw new HttpError(400, 'Role name is required.');
      }
      await this.assertRoleNameAllowed(trimmedName, orgId, currentSession);
      const existingRole = await roleRepository.findByOrgAndName(trimmedName, orgId, currentSession);
      if (existingRole) {
        throw new HttpError(400, `Role with name '${trimmedName}' already exists.`);
      }

      // Determine effective scope and tenant boolean
      let effectiveScope = roleScope;
      if (!effectiveScope) {
        effectiveScope = isTenantRole ? 'UNIT' : 'GLOBAL';
      }
      // Community Staff work community-wide; only unit-bound scopes are tenant roles.
      const effectiveIsTenantRole = effectiveScope === 'COMMUNITY_STAFF'
        ? false
        : isTenantScope(effectiveScope) || !!isTenantRole;

      const newRole = await roleRepository.create({
        name: trimmedName,
        description,
        integrationMappings,
        orgId,
        isTenantRole: effectiveIsTenantRole,
        roleScope: effectiveScope,
        communityOnly: effectiveScope === 'COMMUNITY_STAFF' && communityOnly === true,
      }, currentSession);

      let populatedPermissions = [];
      if (permissions && permissions.length > 0) {
        const permissionService = (await import('../permission/permission.services.js')).default;
        const rolePermissionService = (await import('../rolePermission/rolePermission.services.js')).default;

        const allPermissions = await permissionService.getAllPermissions();
        const matchedPermissions = matchPermissions(allPermissions, permissions);
        await this.assertCanGrant(matchedPermissions, actor);
        const permissionIds = matchedPermissions.map((p) => p._id);

        await rolePermissionService.updateRolePermissions(newRole._id.toString(), permissionIds, currentSession);
        populatedPermissions = matchedPermissions.map(p => p.name);
        pendingEvent = { roleId: newRole._id.toString(), permissionIds, permissions: populatedPermissions };
      }

      if (localSession) {
        await localSession.commitTransaction();
      }
      // Emit only once the data is committed (or hand over to the caller's transaction).
      if (pendingEvent) {
        if (localSession) {
          const rolePermissionService = (await import('../rolePermission/rolePermission.services.js')).default;
          await rolePermissionService.clearCache(pendingEvent.roleId, orgId);
        }
        roleEvents.emit('rolePermissionsUpdated', pendingEvent);
      }
      return {
        ...newRole.toObject(),
        permissions: populatedPermissions
      };
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

  async updateRole(id, updateData, actor = null) {
    const session = await mongoose.startSession();
    session.startTransaction();
    let pendingEvent = null;
    try {
      const currentRole = await this.getRoleById(id, session);
      this.assertRoleAccess(currentRole, actor, { write: true });
      this.assertRoleNotProtected(currentRole);
      const { name, description, permissions, integrationMappings, orgId, isTenantRole, roleScope, communityOnly } = updateData;

      const roleUpdates = { description, integrationMappings };
      if (communityOnly !== undefined) roleUpdates.communityOnly = communityOnly === true;
      if (roleScope !== undefined) {
        roleUpdates.roleScope = roleScope;
        roleUpdates.isTenantRole = isTenantScope(roleScope);
        if (roleScope !== 'COMMUNITY_STAFF') roleUpdates.communityOnly = false;
      } else if (isTenantRole !== undefined) {
        roleUpdates.isTenantRole = isTenantRole;
        roleUpdates.roleScope = isTenantRole ? 'UNIT' : 'GLOBAL';
      }
      if (name && lower(name) !== lower(currentRole.name)) {
        this.assertRoleNotProtected(currentRole, { renameOrDelete: true });
      }
      if (name) {
        const trimmedName = name.trim();
        await this.assertRoleNameAllowed(trimmedName, currentRole.orgId || orgId, session);
        const existing = await roleRepository.findByOrgAndName(trimmedName, currentRole.orgId || orgId, session);
        if (existing && existing._id.toString() !== id) {
          throw new HttpError(400, `Role with name '${trimmedName}' already exists.`);
        }
        roleUpdates.name = trimmedName;
      }
      const updatedRole = await roleRepository.update(id, roleUpdates, session);

      let populatedPermissions = [];
      const rolePermissionService = (await import('../rolePermission/rolePermission.services.js')).default;
      if (permissions !== undefined) {
        const permissionService = (await import('../permission/permission.services.js')).default;
        const allPermissions = await permissionService.getAllPermissions();
        const matchedPermissions = matchPermissions(allPermissions, permissions);
        // Only permissions the role does not already have count as newly granted.
        const currentPerms = await rolePermissionService.getPermissionsByRoleId(id);
        const currentIds = new Set(currentPerms.map((p) => String(p._id)));
        await this.assertCanGrant(matchedPermissions.filter((p) => !currentIds.has(String(p._id))), actor);
        const permissionIds = matchedPermissions.map((p) => p._id);

        await rolePermissionService.updateRolePermissions(id, permissionIds, session);
        populatedPermissions = matchedPermissions.map(p => p.name);
        pendingEvent = { roleId: id, permissionIds, permissions: populatedPermissions };
      } else {
        const permissionsList = await rolePermissionService.getPermissionsByRoleId(id, updatedRole?.orgId);
        populatedPermissions = permissionsList.map(p => p.name);
      }

      // A role is the source of truth for whether its Community Staff may serve residents.
      // Update every linked staff record so Staff Management and resident allocation use the same rule.
      const isCommunityStaffRole = updatedRole.roleScope === 'COMMUNITY_STAFF';
      const technicianRepository = (await import('../technician/technician.repository.js')).default;
      await technicianRepository.updateByRoleId(
        currentRole.orgId || orgId,
        updatedRole._id,
        {
          staffCategory: isCommunityStaffRole ? 'COMMUNITY' : 'UNIT',
          communityOnly: isCommunityStaffRole && updatedRole.communityOnly === true,
        },
        session
      );
      await session.commitTransaction();
      if (pendingEvent) {
        // Evict after commit so a concurrent read cannot re-cache the pre-update permissions.
        await rolePermissionService.clearCache(id, currentRole.orgId || orgId);
        roleEvents.emit('rolePermissionsUpdated', pendingEvent);
      }

      // Existing unit allocations must also stop immediately when the role becomes community-only.
      if (isCommunityStaffRole && updatedRole.communityOnly === true) {
        const linkedStaff = await technicianRepository.findAll(currentRole.orgId || orgId, { roleId: updatedRole._id });
        const associationRepository = (await import('../staffUnitAssociation/staffUnitAssociation.repository.js')).default;
        await Promise.all(linkedStaff.map((staff) =>
          associationRepository.deactivateAllForTechnician(
            currentRole.orgId || orgId,
            staff._id,
            'Staff role changed to community-only work'
          )
        ));
      }

      return {
        ...updatedRole.toObject(),
        permissions: populatedPermissions
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async deleteRole(id, actor = null) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const role = await this.getRoleById(id, session);
      this.assertRoleAccess(role, actor, { write: true });
      this.assertRoleNotProtected(role, { renameOrDelete: true });

      // Deleting a role that people still hold would silently strip their access.
      const orgMembershipService = (await import('../orgMembership/orgMembership.services.js')).default;
      const inUse = await orgMembershipService.countActiveMembersWithRole(id, session);
      if (inUse > 0) {
        throw new HttpError(
          409,
          `This role is assigned to ${inUse} active member${inUse === 1 ? '' : 's'}. Assign them a different role first, then delete it.`
        );
      }
      const deletedRole = await roleRepository.delete(id, session);

      const rolePermissionService = (await import('../rolePermission/rolePermission.services.js')).default;
      await rolePermissionService.updateRolePermissions(id, [], session);
      await rolePermissionService.clearCache(id, role?.orgId);
      await orgMembershipService.clearRoleFromMemberships(id, session);

      await session.commitTransaction();
      return deletedRole;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async isConnectionInUse(connectionId) {
    if (!connectionId) {
      throw new HttpError(400, 'Connection ID is required.');
    }
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const inUse = await roleRepository.isConnectionInUse(connectionId, session);
      await session.commitTransaction();
      return inUse;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async getGroupedPermissions() {
    const permissionService = (await import('../permission/permission.services.js')).default;
    const permissions = await permissionService.getAllPermissions();
    const grouped = {};
    permissions.forEach((perm) => {
      let feature = perm.feature || 'other';
      if (feature.toLowerCase() === 'billing' && perm.action === 'action_center') {
        feature = 'digital_wallet';
      }
      const category = feature.charAt(0).toUpperCase() + feature.slice(1);
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push({
        _id: perm._id,
        name: perm.name,
        feature: perm.feature,
        action: perm.action,
      });
    });
    return grouped;
  }

  async getRolePermissions(roleId, actor = null) {
    const role = await this.getRoleById(roleId);
    this.assertRoleAccess(role, actor);
    const rolePermissionService = (await import('../rolePermission/rolePermission.services.js')).default;
    return await rolePermissionService.getPermissionsByRoleId(roleId, role?.orgId);
  }

  async syncRolePermissions(roleId, permissionNames, actor = null) {
    const role = await this.getRoleById(roleId);
    this.assertRoleAccess(role, actor, { write: true });
    this.assertRoleNotProtected(role);

    const permissionService = (await import('../permission/permission.services.js')).default;
    const rolePermissionService = (await import('../rolePermission/rolePermission.services.js')).default;
    const allPermissions = await permissionService.getAllPermissions();
    const matchedPermissions = matchPermissions(allPermissions, permissionNames);

    // Only permissions the role does not already have count as newly granted.
    const currentPerms = await rolePermissionService.getPermissionsByRoleId(roleId, role?.orgId);
    const currentIds = new Set(currentPerms.map((p) => String(p._id)));
    await this.assertCanGrant(matchedPermissions.filter((p) => !currentIds.has(String(p._id))), actor);

    const permissionIds = matchedPermissions.map((p) => p._id);
    // Delete + re-create must be atomic, otherwise a failure leaves the role with no permissions.
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await rolePermissionService.updateRolePermissions(roleId, permissionIds, session);
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
    await rolePermissionService.clearCache(roleId, role?.orgId);
    const updatedPerms = await rolePermissionService.getPermissionsByRoleId(roleId, role?.orgId);
    const populatedPermissions = updatedPerms.map((p) => p.name || p);
    roleEvents.emit('rolePermissionsUpdated', { roleId, permissionIds, permissions: populatedPermissions });
    return updatedPerms;
  }

  async getRolesByIds(ids, session = null) {
    return await roleRepository.findByIds(ids, session);
  }
}

export default new RoleService();

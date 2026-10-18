import roleService, { PROTECTED_ROLE_NAMES, LOCKED_ROLE_NAMES } from './role.services.js';

// Who is calling: the validated community, whether they are a platform admin, and what they hold.
const actorOf = (req) => ({
  orgId: req.tenant?.orgId,
  role: req.tenant?.role,
  isPlatform: req.tenant?.isPlatform === true,
  permissions: req.tenant?.permissions || [],
});

const formatRole = (role) => {
  const name = String(role.name || '').trim().toLowerCase();
  return {
    id: role._id ?? role.id,
    name: role.name,
    description: role.description,
    isTenantRole: role.isTenantRole || false,
    roleScope: role.roleScope || (role.isTenantRole ? 'UNIT' : 'GLOBAL'),
    communityOnly: role.communityOnly === true,
    permissions: role.permissions || [],
    integrationMappings: role.integrationMappings || {},
    // For the UI: how many active members hold it, whether it is shared by every community, and
    // whether it is a built-in role that cannot be renamed/deleted.
    memberCount: role.memberCount ?? 0,
    isShared: !role.orgId,
    isLocked: PROTECTED_ROLE_NAMES.includes(name) || LOCKED_ROLE_NAMES.includes(name),
  };
};

export class RoleController {
  async getAllRoles(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const orgId = req.tenant.orgId;
      const search = typeof req.query.search === 'string' ? req.query.search : '';
      const { data: roles, pagination } = await roleService.getAllRoles(orgId, page, limit, search);
      const formatted = roles.map(formatRole);
      res.success({ data: formatted, pagination }, 'Roles retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createRole(req, res, next) {
    try {
      const { name, description, permissions, integrationMappings, isTenantRole, roleScope, communityOnly } = req.body;
      const orgId = req.tenant.orgId;
      const role = await roleService.createRole(
        { name, description, permissions, integrationMappings, orgId, isTenantRole, roleScope, communityOnly },
        null,
        actorOf(req)
      );

      res.success(formatRole(role), 'Role created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateRole(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      const { name, description, permissions, integrationMappings, isTenantRole, roleScope, communityOnly } = req.body;
      const role = await roleService.updateRole(
        id,
        { name, description, permissions, integrationMappings, orgId, isTenantRole, roleScope, communityOnly },
        actorOf(req)
      );

      res.success(formatRole(role), 'Role updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteRole(req, res, next) {
    try {
      const { id } = req.params;
      await roleService.deleteRole(id, actorOf(req));
      res.success({ id }, 'Role deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async getAllPermissions(req, res, next) {
    try {
      const groupedPermissions = await roleService.getGroupedPermissions();
      res.success(groupedPermissions, 'Permissions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getRolePermissions(req, res, next) {
    try {
      const { id } = req.params;
      const permissions = await roleService.getRolePermissions(id, actorOf(req));
      res.success(permissions, 'Role permissions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async syncRolePermissions(req, res, next) {
    try {
      const { id } = req.params;
      const { permissionIds } = req.body;
      const updated = await roleService.syncRolePermissions(id, permissionIds, actorOf(req));
      res.success(updated, 'Role permissions synced successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new RoleController();

import roleService from './role.services.js';
import HttpError from '../../utils/httpError.utils.js';

export class RoleController {
  async getAllRoles(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const orgId = req.tenant.orgId;
      const { data: roles, pagination } = await roleService.getAllRoles(orgId, page, limit);
      const formatted = roles.map((role) => ({
        id: role._id,
        name: role.name,
        description: role.description,
        permissions: role.permissions || [],
        integrationMappings: role.integrationMappings || {},
      }));
      res.success({ data: formatted, pagination }, 'Roles retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createRole(req, res, next) {
    try {
      const { name, description, permissions, integrationMappings } = req.body;
      const orgId = req.tenant.orgId;
      const role = await roleService.createRole({ name, description, permissions, integrationMappings, orgId });
      
      res.success({
        id: role._id,
        name: role.name,
        description: role.description,
        permissions: role.permissions || [],
        integrationMappings: role.integrationMappings || {},
      }, 'Role created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateRole(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      const existingRole = await roleService.getRoleById(id);
      if (existingRole.name === 'Super Admin') {
        throw new HttpError(403, 'The Super Admin role is a protected system role and cannot be modified.');
      }
      
      const { name, description, permissions, integrationMappings } = req.body;
      const role = await roleService.updateRole(id, { name, description, permissions, integrationMappings, orgId });
      
      res.success({
        id: role._id,
        name: role.name,
        description: role.description,
        permissions: role.permissions || [],
        integrationMappings: role.integrationMappings || {},
      }, 'Role updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteRole(req, res, next) {
    try {
      const { id } = req.params;
      const existingRole = await roleService.getRoleById(id);
      if (existingRole.name === 'Super Admin') {
        throw new HttpError(403, 'The Super Admin role is a protected system role and cannot be modified.');
      }
      
      await roleService.deleteRole(id);
      res.success({ id }, 'Role deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async getAllPermissions(req, res, next) {
    try {
      const permissions = await roleService.getAllPermissions();
      res.success(permissions, 'Permissions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getRolePermissions(req, res, next) {
    try {
      const { id } = req.params;
      const permissions = await roleService.getRolePermissions(id);
      res.success(permissions, 'Role permissions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateRolePermissions(req, res, next) {
    try {
      const { id } = req.params;
      const { permissionIds } = req.body;
      const updated = await roleService.updateRolePermissions(id, permissionIds);
      res.success(updated, 'Role permissions updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new RoleController();

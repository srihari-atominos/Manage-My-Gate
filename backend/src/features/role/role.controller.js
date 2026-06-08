import roleService from './role.services.js';
import permissionService from '../permission/permission.services.js';
import rolePermissionService from '../rolePermission/rolePermission.services.js';

export class RoleController {
  async getAllRoles(req, res, next) {
    try {
      const roles = await roleService.getAllRoles();
      res.success(roles, 'Roles retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createRole(req, res, next) {
    try {
      const role = await roleService.createRole(req.body);
      res.success(role, 'Role created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getAllPermissions(req, res, next) {
    try {
      const permissions = await permissionService.getAllPermissions();
      res.success(permissions, 'Permissions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getRolePermissions(req, res, next) {
    try {
      const { id } = req.params;
      await roleService.getRoleById(id); // validates role exists
      const permissions = await rolePermissionService.getPermissionsByRoleId(id);
      res.success(permissions, 'Role permissions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateRolePermissions(req, res, next) {
    try {
      const { id } = req.params;
      const { permissionIds } = req.body;
      await roleService.getRoleById(id); // validates role exists
      const updated = await rolePermissionService.updateRolePermissions(id, permissionIds);
      res.success(updated, 'Role permissions updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new RoleController();

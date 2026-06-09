import roleService from './role.services.js';
import permissionService from '../permission/permission.services.js';
import rolePermissionService from '../rolePermission/rolePermission.services.js';
import HttpError from '../../utils/httpError.utils.js';

export class RoleController {
  async getAllRoles(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const { data: roles, pagination } = await roleService.getAllRoles(page, limit);
      const formatted = roles.map((role) => ({
        id: role._id,
        name: role.name,
        description: role.description,
        permissions: role.permissions || [],
      }));
      res.success({ data: formatted, pagination }, 'Roles retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createRole(req, res, next) {
    try {
      const { name, description, permissions } = req.body;
      const role = await roleService.createRole({ name, description });
      
      let populatedPermissions = [];
      if (permissions && permissions.length > 0) {
        const Permission = (await import('../permission/permission.model.js')).default;
        const matchedPermissions = await Permission.find({ name: { $in: permissions } });
        const permissionIds = matchedPermissions.map(p => p._id);
        
        await rolePermissionService.updateRolePermissions(role._id, permissionIds);
        populatedPermissions = matchedPermissions.map(p => p.name);
      }
      
      res.success({
        id: role._id,
        name: role.name,
        description: role.description,
        permissions: populatedPermissions
      }, 'Role created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateRole(req, res, next) {
    try {
      const { id } = req.params;
      const existingRole = await roleService.getRoleById(id);
      if (existingRole.name === 'Super Admin') {
        throw new HttpError(403, 'The Super Admin role is a protected system role and cannot be modified.');
      }
      
      const { name, description, permissions } = req.body;
      const role = await roleService.updateRole(id, { name, description });
      
      let populatedPermissions = [];
      if (permissions) {
        const Permission = (await import('../permission/permission.model.js')).default;
        const matchedPermissions = await Permission.find({ name: { $in: permissions } });
        const permissionIds = matchedPermissions.map(p => p._id);
        
        await rolePermissionService.updateRolePermissions(id, permissionIds);
        populatedPermissions = matchedPermissions.map(p => p.name);
      } else {
        const permissionsList = await rolePermissionService.getPermissionsByRoleId(id);
        populatedPermissions = permissionsList.map(p => p.name);
      }
      
      res.success({
        id: role._id,
        name: role.name,
        description: role.description,
        permissions: populatedPermissions
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
      await rolePermissionService.updateRolePermissions(id, []);
      res.success({ id }, 'Role deleted successfully');
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

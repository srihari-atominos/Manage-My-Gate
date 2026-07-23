import rolePermissionRepository from './rolePermission.repository.js';
import HttpError from '../../utils/httpError.utils.js';

export class RolePermissionService {
  constructor() {
    this.cache = new Map();
  }

  async getPermissionsByRoleId(roleId) {
    if (!roleId) return [];
    
    const cacheKey = roleId.toString();
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const mappings = await rolePermissionRepository.findByRoleId(roleId);
    // Return the list of populated permissions
    const permissions = mappings
      .map((m) => m.permissionId)
      .filter((p) => p !== null && p !== undefined);

    this.cache.set(cacheKey, permissions);
    return permissions;
  }

  async assignPermissionToRole(roleId, permissionId) {
    try {
      const result = await rolePermissionRepository.create(roleId, permissionId);
      if (roleId) {
        this.cache.delete(roleId.toString());
      }
      return result;
    } catch (error) {
      if (error.code === 11000) {
        throw new HttpError(400, 'This permission is already assigned to this role.');
      }
      throw error;
    }
  }

  async removePermissionFromRole(roleId, permissionId) {
    const deleted = await rolePermissionRepository.deleteByRoleIdAndPermissionId(roleId, permissionId);
    if (!deleted) {
      throw new HttpError(404, 'Permission mapping not found.');
    }
    if (roleId) {
      this.cache.delete(roleId.toString());
    }
    return deleted;
  }

  async updateRolePermissions(roleId, permissionIds, session = null) {
    // Start transactional behavior (clear existing and map new ones)
    await rolePermissionRepository.deleteByRoleId(roleId, session);
    if (roleId) {
      this.cache.delete(roleId.toString());
    }

    if (permissionIds && permissionIds.length > 0) {
      const records = permissionIds.map((permissionId) => ({
        roleId,
        permissionId,
      }));
      return await rolePermissionRepository.bulkCreate(records, session);
    }
    return [];
  }
}

export default new RolePermissionService();

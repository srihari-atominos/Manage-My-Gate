import rolePermissionRepository from './rolePermission.repository.js';
import HttpError from '../../utils/httpError.utils.js';

export class RolePermissionService {
  async getPermissionsByRoleId(roleId) {
    const mappings = await rolePermissionRepository.findByRoleId(roleId);
    // Return the list of populated permissions
    return mappings
      .map((m) => m.permissionId)
      .filter((p) => p !== null && p !== undefined);
  }

  async assignPermissionToRole(roleId, permissionId) {
    try {
      return await rolePermissionRepository.create(roleId, permissionId);
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
    return deleted;
  }

  async updateRolePermissions(roleId, permissionIds) {
    // Start transactional behavior (clear existing and map new ones)
    await rolePermissionRepository.deleteByRoleId(roleId);
    
    if (permissionIds && permissionIds.length > 0) {
      const records = permissionIds.map((permissionId) => ({
        roleId,
        permissionId,
      }));
      return await rolePermissionRepository.bulkCreate(records);
    }
    return [];
  }
}

export default new RolePermissionService();

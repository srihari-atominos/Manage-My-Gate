import permissionRepository from './permission.repository.js';
import HttpError from '../../utils/httpError.utils.js';

export class PermissionService {
  async getAllPermissions() {
    return await permissionRepository.findAll();
  }

  async getPermissionById(id) {
    const permission = await permissionRepository.findById(id);
    if (!permission) {
      throw new HttpError(404, `Permission with ID ${id} not found.`);
    }
    return permission;
  }

  async getPermissionByName(name) {
    return await permissionRepository.findByName(name);
  }

  async createPermission(permissionData) {
    const name = `${permissionData.feature}:${permissionData.action}`;
    const existing = await permissionRepository.findByName(name);
    if (existing) {
      throw new HttpError(400, `Permission '${name}' already exists.`);
    }
    permissionData.name = name;
    return await permissionRepository.create(permissionData);
  }

  async upsertPermission(feature, action) {
    return await permissionRepository.upsert(feature, action);
  }
}

export default new PermissionService();

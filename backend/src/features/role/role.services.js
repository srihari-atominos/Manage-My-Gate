import roleRepository from './role.repository.js';
import HttpError from '../../utils/httpError.utils.js';

export class RoleService {
  async getAllRoles() {
    return await roleRepository.findAll();
  }

  async getRoleById(id) {
    const role = await roleRepository.findById(id);
    if (!role) {
      throw new HttpError(404, `Role with ID ${id} not found.`);
    }
    return role;
  }

  async getRoleByName(name) {
    return await roleRepository.findByName(name);
  }

  async createRole(roleData) {
    if (roleData.name) {
      roleData.name = roleData.name.trim();
    }
    const existingRole = await roleRepository.findByName(roleData.name);
    if (existingRole) {
      throw new HttpError(400, `Role with name '${roleData.name}' already exists.`);
    }
    return await roleRepository.create(roleData);
  }

  async updateRole(id, updateData) {
    await this.getRoleById(id);
    if (updateData.name) {
      updateData.name = updateData.name.trim();
      const existing = await roleRepository.findByName(updateData.name);
      if (existing && existing._id.toString() !== id) {
        throw new HttpError(400, `Role with name '${updateData.name}' already exists.`);
      }
    }
    return await roleRepository.update(id, updateData);
  }

  async deleteRole(id) {
    await this.getRoleById(id);
    return await roleRepository.delete(id);
  }
}

export default new RoleService();

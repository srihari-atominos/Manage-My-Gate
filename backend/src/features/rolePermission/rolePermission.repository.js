import RolePermission from './rolePermission.model.js';

export class RolePermissionRepository {
  async findByRoleId(roleId) {
    return await RolePermission.find({ roleId }).populate('permissionId');
  }

  async create(roleId, permissionId) {
    const rolePermission = new RolePermission({ roleId, permissionId });
    return await rolePermission.save();
  }

  async deleteByRoleIdAndPermissionId(roleId, permissionId) {
    return await RolePermission.findOneAndDelete({ roleId, permissionId });
  }

  async deleteByRoleId(roleId) {
    return await RolePermission.deleteMany({ roleId });
  }

  async bulkCreate(rolePermissions) {
    return await RolePermission.insertMany(rolePermissions);
  }
}

export default new RolePermissionRepository();

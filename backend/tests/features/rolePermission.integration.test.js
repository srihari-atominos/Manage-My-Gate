import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { connectDb, closeDb, clearDb } from './db.setup.js';
import rolePermissionRepository from '../../src/features/rolePermission/rolePermission.repository.js';
import RolePermission from '../../src/features/rolePermission/rolePermission.model.js';
import Permission from '../../src/features/permission/permission.model.js';
import Role from '../../src/features/role/role.model.js';

describe('RolePermissionRepository Integration', () => {
  beforeAll(async () => {
    await connectDb();
  }, 30000);

  afterAll(async () => {
    await closeDb();
  }, 30000);

  beforeEach(async () => {
    await clearDb();
  });

  describe('bulkCreate and findByRoleId', () => {
    it('should create and retrieve permissions for a role, isolated by role', async () => {
      const role1 = await Role.create({ name: 'Role 1', orgId: new mongoose.Types.ObjectId() });
      const role2 = await Role.create({ name: 'Role 2', orgId: new mongoose.Types.ObjectId() });

      const perm1 = await Permission.create({ name: 'FEATURE:A', feature: 'FEATURE', action: 'A' });
      const perm2 = await Permission.create({ name: 'FEATURE:B', feature: 'FEATURE', action: 'B' });

      await rolePermissionRepository.bulkCreate([
        { roleId: role1._id, permissionId: perm1._id },
        { roleId: role1._id, permissionId: perm2._id },
        { roleId: role2._id, permissionId: perm1._id }
      ]);

      const role1Perms = await rolePermissionRepository.findByRoleId(role1._id);
      expect(role1Perms.length).toBe(2);
      
      const role2Perms = await rolePermissionRepository.findByRoleId(role2._id);
      expect(role2Perms.length).toBe(1);
      
      // Ensure populate works
      expect(role1Perms[0].permissionId.name).toBeDefined();
    });
  });

  describe('deleteByRoleId', () => {
    it('should delete all mappings for a specific role', async () => {
      const roleId = new mongoose.Types.ObjectId();
      const permId = new mongoose.Types.ObjectId();

      await rolePermissionRepository.create(roleId, permId);
      
      const beforeDelete = await RolePermission.countDocuments({ roleId });
      expect(beforeDelete).toBe(1);

      await rolePermissionRepository.deleteByRoleId(roleId);

      const afterDelete = await RolePermission.countDocuments({ roleId });
      expect(afterDelete).toBe(0);
    });
  });
});

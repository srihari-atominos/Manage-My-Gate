import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { connectDb, closeDb, clearDb } from './db.setup.js';
import roleService from '../../src/features/role/role.services.js';
import roleRepository from '../../src/features/role/role.repository.js';
import Role from '../../src/features/role/role.model.js';
import '../../src/features/rolePermission/rolePermission.model.js';
import '../../src/features/orgMembership/orgMembership.model.js';
import HttpError from '../../src/utils/httpError.utils.js';
import roleController from '../../src/features/role/role.controller.js';

describe('Role Service & Controller Tenant Isolation (Phase 3C)', () => {
  beforeAll(async () => {
    await connectDb();
  }, 30000);

  afterAll(async () => {
    await closeDb();
  }, 30000);

  beforeEach(async () => {
    await clearDb();
  });

  describe('Service-Level Role Isolation', () => {
    it('1. Organization A can update its own organization-scoped role', async () => {
      const orgA = new mongoose.Types.ObjectId();
      const roleId = new mongoose.Types.ObjectId();
      
      await Role.collection.insertOne({
        _id: roleId,
        name: 'Manager',
        orgId: orgA,
        isSystemRole: false
      });

      const updatedRole = await roleService.updateRole(roleId.toString(), { name: 'Senior Manager', orgId: orgA }, orgA.toString());
      expect(updatedRole.name).toBe('Senior Manager');
      
      const inDb = await Role.findById(roleId);
      expect(inDb.name).toBe('Senior Manager');
    });

    it('2. Organization A cannot update Organization B\'s role', async () => {
      const orgA = new mongoose.Types.ObjectId();
      const orgB = new mongoose.Types.ObjectId();
      const roleId = new mongoose.Types.ObjectId();
      
      await Role.collection.insertOne({
        _id: roleId,
        name: 'Manager',
        orgId: orgB,
        isSystemRole: false
      });

      await expect(roleService.updateRole(roleId.toString(), { name: 'Hacked Manager', orgId: orgB }, orgA.toString()))
        .rejects.toThrow('Forbidden. This role belongs to another community.');

      const inDb = await Role.findById(roleId);
      expect(inDb.name).toBe('Manager'); // Unchanged
    });

    it('3. Organization A cannot delete Organization B\'s role', async () => {
      const orgA = new mongoose.Types.ObjectId();
      const orgB = new mongoose.Types.ObjectId();
      const roleId = new mongoose.Types.ObjectId();
      
      await Role.collection.insertOne({
        _id: roleId,
        name: 'Guard',
        orgId: orgB,
        isSystemRole: false
      });

      await expect(roleService.deleteRole(roleId.toString(), orgA.toString()))
        .rejects.toThrow('Forbidden. This role belongs to another community.');

      const inDb = await Role.findById(roleId);
      expect(inDb).not.toBeNull();
    });

    it('4. Missing or invalid tenant context cannot perform a tenant-scoped mutation', async () => {
      const orgA = new mongoose.Types.ObjectId();
      const invalidOrg = new mongoose.Types.ObjectId();
      const roleId = new mongoose.Types.ObjectId();

      await Role.collection.insertOne({
        _id: roleId,
        name: 'Supervisor',
        orgId: orgA,
        isSystemRole: false
      });

      await expect(
        roleService.updateRole(roleId.toString(), { name: 'Unscoped Supervisor' }, null)
      ).rejects.toThrow('Tenant context is required to modify a tenant-scoped role.');

      await expect(
        roleService.deleteRole(roleId.toString(), null)
      ).rejects.toThrow('Tenant context is required to delete a tenant-scoped role.');

      await expect(
        roleService.updateRole(roleId.toString(), { name: 'Spoofed Supervisor', orgId: orgA }, invalidOrg.toString())
      ).rejects.toThrow('Forbidden. This role belongs to another community.');

      await expect(
        roleService.updateRole(roleId.toString(), { name: 'Malformed Org Supervisor' }, 'malformed-org-id')
      ).rejects.toThrow();

      const inDb = await Role.findById(roleId);
      expect(inDb).not.toBeNull();
      expect(inDb.name).toBe('Supervisor');
    });

    it('6. Global/system roles retain their intended protections', async () => {
      const orgA = new mongoose.Types.ObjectId();
      const roleId = new mongoose.Types.ObjectId();
      
      await Role.collection.insertOne({
        _id: roleId,
        name: 'Super Admin',
        orgId: null, // Global
        isSystemRole: true
      });

      await expect(roleService.updateRole(roleId.toString(), { name: 'Super Admin', description: 'Updated' }, orgA.toString()))
        .rejects.toThrow(/not found or you lack permission/);
      
      const inDb = await Role.findById(roleId);
      expect(inDb.description).not.toBe('Updated');
    });
  });

  describe('Controller-Level Role Isolation', () => {
    it('5. A forged organization ID cannot override trusted tenant context during update', async () => {
      const trustedOrgId = new mongoose.Types.ObjectId();
      const forgedOrgId = new mongoose.Types.ObjectId();
      const roleId = new mongoose.Types.ObjectId();

      await Role.collection.insertOne({
        _id: roleId,
        name: 'Admin',
        orgId: forgedOrgId,
        isSystemRole: false
      });

      const req = {
        params: { id: roleId.toString() },
        tenant: { orgId: trustedOrgId.toString() },
        body: { name: 'Hacked', orgId: forgedOrgId.toString() } // Forged body payload
      };
      const res = {
        success: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await roleController.updateRole(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(HttpError));
      expect(next.mock.calls[0][0].message).toMatch(/Forbidden/);

      const inDb = await Role.findById(roleId);
      expect(inDb.name).toBe('Admin');
    });
  });
});

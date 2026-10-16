import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import connectToDb from '../src/config/db/mongodbConnectToDb.config.js';
import rolePermissionService, { RolePermissionService } from '../src/features/rolePermission/rolePermission.services.js';
import roleService from '../src/features/role/role.services.js';
import Organization from '../src/features/organization/organization.model.js';
import Role from '../src/features/role/role.model.js';
import Permission from '../src/features/permission/permission.model.js';
import RolePermission from '../src/features/rolePermission/rolePermission.model.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';
import User from '../src/features/user/user.model.js';
import { messageBroker } from '../src/utils/messageBroker.util.js';

describe('SEC-05.2-B — Role Permission Cache Tenant Isolation & Consistency Suite', () => {
  let orgA, orgB;
  let roleAdminA, roleResidentA, roleAdminB, roleResidentB, systemTemplateRole;
  let permManageNotices, permReadNotices, permCreateNotices, permVotePolls;
  const ts = Date.now();

  before(async () => {
    await connectToDb();

    // 1. Create test organizations
    orgA = await Organization.create({
      name: `Org A SEC-05.2B ${ts}`,
      organizationType: 'Other',
      status: 'Active',
    });

    orgB = await Organization.create({
      name: `Org B SEC-05.2B ${ts}`,
      organizationType: 'Other',
      status: 'Active',
    });

    // 2. Create permissions
    permManageNotices = await Permission.findOneAndUpdate(
      { name: 'notices:manage_notices' },
      { name: 'notices:manage_notices', feature: 'notices', action: 'manage_notices', description: 'Manage Notices' },
      { upsert: true, new: true }
    );

    permReadNotices = await Permission.findOneAndUpdate(
      { name: 'notices:read' },
      { name: 'notices:read', feature: 'notices', action: 'read', description: 'Read Notices' },
      { upsert: true, new: true }
    );

    permCreateNotices = await Permission.findOneAndUpdate(
      { name: 'notices:create' },
      { name: 'notices:create', feature: 'notices', action: 'create', description: 'Create Notices' },
      { upsert: true, new: true }
    );

    permVotePolls = await Permission.findOneAndUpdate(
      { name: 'polls:vote' },
      { name: 'polls:vote', feature: 'polls', action: 'vote', description: 'Vote in Polls' },
      { upsert: true, new: true }
    );

    // 3. Create tenant-scoped roles
    roleAdminA = await Role.create({
      name: `Admin_A_${ts}`,
      description: 'Admin for Org A',
      orgId: orgA._id,
      isTenantRole: true,
    });

    roleResidentA = await Role.create({
      name: `Resident_A_${ts}`,
      description: 'Resident for Org A',
      orgId: orgA._id,
      isTenantRole: true,
    });

    roleAdminB = await Role.create({
      name: `Admin_B_${ts}`,
      description: 'Admin for Org B',
      orgId: orgB._id,
      isTenantRole: true,
    });

    roleResidentB = await Role.create({
      name: `Resident_B_${ts}`,
      description: 'Resident for Org B',
      orgId: orgB._id,
      isTenantRole: true,
    });

    // System template role (unscoped system baseline)
    systemTemplateRole = await Role.create({
      name: `System_Template_${ts}`,
      description: 'System template role',
      orgId: null,
      isTenantRole: false,
    });

    // 4. Map permissions to roles
    await RolePermission.create([
      { roleId: roleAdminA._id, permissionId: permManageNotices._id },
      { roleId: roleAdminA._id, permissionId: permCreateNotices._id },
      { roleId: roleResidentA._id, permissionId: permReadNotices._id },
      { roleId: roleAdminB._id, permissionId: permManageNotices._id },
      { roleId: roleResidentB._id, permissionId: permReadNotices._id },
      { roleId: systemTemplateRole._id, permissionId: permReadNotices._id },
      { roleId: systemTemplateRole._id, permissionId: permVotePolls._id },
    ]);

    // Clear any existing cache
    await rolePermissionService.clearCache();
  });

  after(async () => {
    const orgIds = [orgA?._id, orgB?._id].filter(Boolean);
    const roleIds = [roleAdminA?._id, roleResidentA?._id, roleAdminB?._id, roleResidentB?._id, systemTemplateRole?._id].filter(Boolean);

    await RolePermission.deleteMany({ roleId: { $in: roleIds } });
    await Role.deleteMany({ _id: { $in: roleIds } });
    await Organization.deleteMany({ _id: { $in: orgIds } });
    await mongoose.connection.close();
  });

  describe('1. Cross-Tenant Cache Isolation & Key Partitioning', () => {
    it('should partition cache keys by organization and role', () => {
      const keyA = rolePermissionService.buildCacheKey(roleAdminA._id, orgA._id);
      const keyB = rolePermissionService.buildCacheKey(roleAdminA._id, orgB._id);
      const keySystem = rolePermissionService.buildCacheKey(systemTemplateRole._id, null);

      assert.equal(keyA, `rbac:perms:${orgA._id}:${roleAdminA._id}`);
      assert.equal(keyB, `rbac:perms:${orgB._id}:${roleAdminA._id}`);
      assert.equal(keySystem, `rbac:perms:system:${systemTemplateRole._id}`);
      assert.notEqual(keyA, keyB, 'Keys for different organizations must be partitioned');
    });

    it('cached permissions in Org A cannot grant permissions in Org B (cross-tenant boundary check)', async () => {
      // Prime cache for Org A
      const permsA = await rolePermissionService.getPermissionsByRoleId(roleAdminA._id, orgA._id);
      assert.ok(permsA.some((p) => p.name === 'notices:manage_notices'), 'Org A role must have manage_notices');

      // Attempt to retrieve roleAdminA under Org B context
      const permsCrossTenant = await rolePermissionService.getPermissionsByRoleId(roleAdminA._id, orgB._id);
      assert.equal(permsCrossTenant.length, 0, 'Cross-tenant role access must fail closed and return empty array');

      // Attempt to retrieve roleAdminB under Org A context
      const permsCrossTenantB = await rolePermissionService.getPermissionsByRoleId(roleAdminB._id, orgA._id);
      assert.equal(permsCrossTenantB.length, 0, 'Org B role cannot be retrieved in Org A context');
    });
  });

  describe('2. Permission Revocation & Cache Invalidation', () => {
    it('revoking a permission immediately invalidates cache and prevents continued use', async () => {
      // 1. Prime cache for roleResidentA in Org A
      const initialPerms = await rolePermissionService.getPermissionsByRoleId(roleResidentA._id, orgA._id);
      assert.equal(initialPerms.length, 1);
      assert.equal(initialPerms[0].name, 'notices:read');

      // Verify it is cached in localCache
      const cacheKey = rolePermissionService.buildCacheKey(roleResidentA._id, orgA._id);
      assert.ok(rolePermissionService.cache.has(cacheKey), 'Cache must be primed');

      // 2. Add permission to roleResidentA
      await rolePermissionService.assignPermissionToRole(roleResidentA._id, permVotePolls._id);
      assert.equal(rolePermissionService.cache.has(cacheKey), false, 'Assigning permission must evict cache');

      const updatedPerms = await rolePermissionService.getPermissionsByRoleId(roleResidentA._id, orgA._id);
      assert.equal(updatedPerms.length, 2, 'Must reflect 2 permissions after assignment');
      assert.ok(updatedPerms.some((p) => p.name === 'polls:vote'));

      // 3. Revoke permission
      await rolePermissionService.removePermissionFromRole(roleResidentA._id, permVotePolls._id);
      assert.equal(rolePermissionService.cache.has(cacheKey), false, 'Revoking permission must evict cache');

      const afterRevocationPerms = await rolePermissionService.getPermissionsByRoleId(roleResidentA._id, orgA._id);
      assert.equal(afterRevocationPerms.length, 1);
      assert.ok(!afterRevocationPerms.some((p) => p.name === 'polls:vote'), 'Revoked permission must not be present');
    });

    it('updateRolePermissions invalidates cache and replaces permissions atomically', async () => {
      const cacheKey = rolePermissionService.buildCacheKey(roleAdminB._id, orgB._id);
      await rolePermissionService.getPermissionsByRoleId(roleAdminB._id, orgB._id);
      assert.ok(rolePermissionService.cache.has(cacheKey));

      // Overwrite permissions with only permReadNotices
      await rolePermissionService.updateRolePermissions(roleAdminB._id, [permReadNotices._id]);
      assert.equal(rolePermissionService.cache.has(cacheKey), false, 'Cache must be invalidated after updateRolePermissions');

      const freshPerms = await rolePermissionService.getPermissionsByRoleId(roleAdminB._id, orgB._id);
      assert.equal(freshPerms.length, 1);
      assert.equal(freshPerms[0].name, 'notices:read');
      assert.ok(!freshPerms.some((p) => p.name === 'notices:manage_notices'), 'Stale manage_notices must be absent');
    });
  });

  describe('3. Role Lifecycle Invalidation (Update & Deletion)', () => {
    it('RoleService.deleteRole invalidates cached permissions and deletes mappings', async () => {
      // Create ephemeral role
      const tempRole = await Role.create({
        name: `Temp_Role_${Date.now()}`,
        orgId: orgA._id,
        isTenantRole: true,
      });
      await RolePermission.create({ roleId: tempRole._id, permissionId: permReadNotices._id });

      // Prime cache
      const tempPerms = await rolePermissionService.getPermissionsByRoleId(tempRole._id, orgA._id);
      assert.equal(tempPerms.length, 1);
      const cacheKey = rolePermissionService.buildCacheKey(tempRole._id, orgA._id);
      assert.ok(rolePermissionService.cache.has(cacheKey));

      // Delete role via roleService
      await roleService.deleteRole(tempRole._id.toString());

      // Verify cache was evicted
      assert.equal(rolePermissionService.cache.has(cacheKey), false, 'Role deletion must evict cache');

      // Verify subsequent lookup fails closed
      const permsAfterDelete = await rolePermissionService.getPermissionsByRoleId(tempRole._id, orgA._id);
      assert.equal(permsAfterDelete.length, 0, 'Deleted role must return 0 permissions');
    });
  });

  describe('4. Multi-Instance Invalidation Propagation', () => {
    it('invalidation propagates across simulated application pods via messageBroker event bus', async () => {
      // Simulate Pod 1 and Pod 2
      const pod1 = new RolePermissionService();
      const pod2 = new RolePermissionService();

      const testRole = await Role.create({
        name: `MultiPod_Role_${Date.now()}`,
        orgId: orgA._id,
        isTenantRole: true,
      });
      await RolePermission.create({ roleId: testRole._id, permissionId: permManageNotices._id });

      // Both Pod 1 and Pod 2 load and cache the permissions
      const pod1Perms = await pod1.getPermissionsByRoleId(testRole._id, orgA._id);
      const pod2Perms = await pod2.getPermissionsByRoleId(testRole._id, orgA._id);
      assert.equal(pod1Perms.length, 1);
      assert.equal(pod2Perms.length, 1);

      const cacheKey = pod1.buildCacheKey(testRole._id, orgA._id);
      assert.ok(pod1.cache.has(cacheKey), 'Pod 1 must cache');
      assert.ok(pod2.cache.has(cacheKey), 'Pod 2 must cache');

      // Pod 1 triggers cache invalidation (e.g. after admin updates role permissions on Pod 1)
      await pod1.clearCache(testRole._id, orgA._id);

      // Give message broker event dispatch a tick
      await new Promise((r) => setTimeout(r, 50));

      // Assert that Pod 2 received the invalidation event and evicted its local cache
      assert.equal(pod1.cache.has(cacheKey), false, 'Pod 1 must be evicted');
      assert.equal(pod2.cache.has(cacheKey), false, 'Pod 2 must be evicted via cluster pub/sub broadcast');

      // Cleanup
      await RolePermission.deleteMany({ roleId: testRole._id });
      await Role.findByIdAndDelete(testRole._id);
    });

    it('legacy cache.delete() triggers cluster-wide invalidation via Proxy wrapper', async () => {
      const pod1 = new RolePermissionService();
      const pod2 = new RolePermissionService();

      const legacyRole = await Role.create({
        name: `Legacy_Proxy_Role_${Date.now()}`,
        orgId: orgB._id,
        isTenantRole: true,
      });
      await RolePermission.create({ roleId: legacyRole._id, permissionId: permReadNotices._id });

      await pod1.getPermissionsByRoleId(legacyRole._id, orgB._id);
      await pod2.getPermissionsByRoleId(legacyRole._id, orgB._id);

      const cacheKey = pod1.buildCacheKey(legacyRole._id, orgB._id);
      assert.ok(pod1.cache.has(cacheKey));
      assert.ok(pod2.cache.has(cacheKey));

      // Legacy caller invokes pod1.cache.delete(roleId)
      pod1.cache.delete(legacyRole._id.toString());
      await new Promise((r) => setTimeout(r, 50));

      assert.equal(pod1.cache.has(cacheKey), false);
      assert.equal(pod2.cache.has(cacheKey), false, 'Legacy cache.delete must broadcast cluster invalidation');

      // Cleanup
      await RolePermission.deleteMany({ roleId: legacyRole._id });
      await Role.findByIdAndDelete(legacyRole._id);
    });
  });

  describe('5. Missing or Invalid Organization Context Enforcement', () => {
    it('missing organization context cannot retrieve an organization-specific role permissions', async () => {
      // Calling getPermissionsByRoleId without orgId for a tenant role must return []
      const perms = await rolePermissionService.getPermissionsByRoleId(roleAdminA._id, null);
      assert.equal(perms.length, 0, 'Tenant role requested without orgId must return empty array');
    });

    it('invalid organization context fails closed and does not leak permissions', async () => {
      const fakeOrgId = new mongoose.Types.ObjectId();
      const perms = await rolePermissionService.getPermissionsByRoleId(roleAdminA._id, fakeOrgId);
      assert.equal(perms.length, 0, 'Tenant role requested with foreign orgId must fail closed');
    });

    it('system template role can be retrieved with or without orgId', async () => {
      // System template role (orgId: null, isTenantRole: false)
      const permsSystem = await rolePermissionService.getPermissionsByRoleId(systemTemplateRole._id, null);
      assert.equal(permsSystem.length, 2, 'System template role must return baseline permissions');

      const permsSystemInTenant = await rolePermissionService.getPermissionsByRoleId(systemTemplateRole._id, orgA._id);
      assert.equal(permsSystemInTenant.length, 2, 'System template role can be used within tenant context');
    });
  });

  describe('6. Cache-Backend Failure & Fail-Closed Behavior', () => {
    it('simulated Redis read/write error fails soft and retrieves from DB repository safely', async () => {
      const service = new RolePermissionService();
      // Mock Redis getter to throw an unexpected network error
      const originalGetRedis = service._getRedis;
      service._getRedis = async () => {
        throw new Error('REDIS_CONNECTION_RESET');
      };

      // Permissions should still be retrieved safely from DB repository
      const perms = await service.getPermissionsByRoleId(roleAdminA._id, orgA._id);
      assert.ok(perms.length > 0, 'Must fallback to database repository when Redis fails');
      assert.ok(perms.some((p) => p.name === 'notices:manage_notices'));

      service._getRedis = originalGetRedis;
    });

    it('DB repository failure fails closed and returns empty permissions array (no privilege escalation)', async () => {
      const service = new RolePermissionService();
      const originalFetch = service._fetchAndFormatPermissions;
      service._fetchAndFormatPermissions = async () => {
        throw new Error('MONGO_PRIMARY_STEPDOWN');
      };

      const perms = await service.getPermissionsByRoleId(roleAdminA._id, orgA._id);
      assert.deepEqual(perms, [], 'DB failure must fail closed with empty array, never default admin');

      service._fetchAndFormatPermissions = originalFetch;
    });
  });

  describe('7. TTL Expiration & Memory Management', () => {
    it('cache entry expires after configured TTL', async () => {
      // Create service with very short TTL (50ms)
      const shortTtlService = new RolePermissionService({ ttlMs: 50 });
      const testRole = await Role.create({
        name: `Ttl_Role_${Date.now()}`,
        orgId: orgA._id,
        isTenantRole: true,
      });
      await RolePermission.create({ roleId: testRole._id, permissionId: permReadNotices._id });

      const perms = await shortTtlService.getPermissionsByRoleId(testRole._id, orgA._id);
      assert.equal(perms.length, 1);
      const cacheKey = shortTtlService.buildCacheKey(testRole._id, orgA._id);
      assert.ok(shortTtlService.cache.has(cacheKey), 'Entry must be initially cached');

      // Wait 70ms for TTL to expire
      await new Promise((r) => setTimeout(r, 70));

      assert.equal(shortTtlService.cache.has(cacheKey), false, 'Entry must be discarded after TTL expires');

      // Cleanup
      await RolePermission.deleteMany({ roleId: testRole._id });
      await Role.findByIdAndDelete(testRole._id);
    });
  });
});

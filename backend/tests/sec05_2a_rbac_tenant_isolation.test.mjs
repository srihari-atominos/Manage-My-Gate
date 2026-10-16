import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

import app from '../index.js';
import connectToDb from '../src/config/db/mongodbConnectToDb.config.js';
import config from '../src/config/config.js';
import User from '../src/features/user/user.model.js';
import Organization from '../src/features/organization/organization.model.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';
import Role from '../src/features/role/role.model.js';
import Permission from '../src/features/permission/permission.model.js';
import RolePermission from '../src/features/rolePermission/rolePermission.model.js';
import rolePermissionService from '../src/features/rolePermission/rolePermission.services.js';
import { checkIsAdmin, getPermissionsForUser, authorizeRoles, authorizePermission } from '../src/middlewares/rbac.middleware.js';

describe('SEC-05.2-A — RBAC Tenant Isolation & Privilege Escalation Regression Suite', () => {
  let server;
  let baseUrl;

  // Organizations
  let orgA, orgB;
  let orgA_Id, orgB_Id;

  // Roles
  let roleAdminA, roleResidentA;
  let roleAdminB, roleResidentB;

  // Users
  let multiTenantUser; // Admin in Org A, Resident in Org B
  let legitimateAdminB; // Admin in Org B
  let incompleteUser; // Active membership in Org B with no roles assigned
  let pendingUser; // Pending membership in Org B
  let nonMemberUser; // No membership in Org B
  let platformAdminUser; // Global platform super admin

  // Tokens
  let tokenMultiTenant;
  let tokenAdminB;
  let tokenIncomplete;
  let tokenPending;
  let tokenNonMember;
  let tokenPlatformAdmin;

  const signToken = (payload) => {
    return jwt.sign(payload, config.jwt.secret, { algorithm: 'HS256', expiresIn: '2h' });
  };

  before(async () => {
    await connectToDb();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const ts = Date.now();

    // 1. Create isolated Organizations
    orgA = await Organization.create({
      name: `Org A SEC-05.2A ${ts}`,
      isPlatform: false,
      organizationType: 'Residential',
      allowedFeatures: ['notices', 'polls', 'users', 'roles', 'dashboard'],
      status: 'Active',
    });
    orgA_Id = orgA._id.toString();

    orgB = await Organization.create({
      name: `Org B SEC-05.2A ${ts}`,
      isPlatform: false,
      organizationType: 'Residential',
      allowedFeatures: ['notices', 'polls', 'users', 'roles', 'dashboard'],
      status: 'Active',
    });
    orgB_Id = orgB._id.toString();

    // 2. Create Permissions
    const permNoticeManage = await Permission.findOneAndUpdate(
      { name: 'notices:manage_notices' },
      { name: 'notices:manage_notices', description: 'Manage notices', module: 'notices', action: 'manage_notices' },
      { upsert: true, new: true }
    );
    const permNoticeRead = await Permission.findOneAndUpdate(
      { name: 'notices:read' },
      { name: 'notices:read', description: 'Read notices', module: 'notices', action: 'read' },
      { upsert: true, new: true }
    );
    const permNoticeActive = await Permission.findOneAndUpdate(
      { name: 'notices:active_board' },
      { name: 'notices:active_board', description: 'Active board', module: 'notices', action: 'active_board' },
      { upsert: true, new: true }
    );

    // 3. Create Scoped Roles
    roleAdminA = await Role.create({
      name: `Admin_OrgA_${ts}`,
      orgId: orgA._id,
      isTenantRole: true,
      description: 'Admin role for Org A',
    });
    roleResidentA = await Role.create({
      name: `Resident_OrgA_${ts}`,
      orgId: orgA._id,
      isTenantRole: true,
      description: 'Resident role for Org A',
    });

    roleAdminB = await Role.create({
      name: `Admin_OrgB_${ts}`,
      orgId: orgB._id,
      isTenantRole: true,
      description: 'Admin role for Org B',
    });
    roleResidentB = await Role.create({
      name: `Resident_OrgB_${ts}`,
      orgId: orgB._id,
      isTenantRole: true,
      description: 'Resident role for Org B',
    });

    // Map Role Permissions
    await RolePermission.create([
      { roleId: roleAdminA._id, permissionId: permNoticeManage._id },
      { roleId: roleAdminA._id, permissionId: permNoticeRead._id },
      { roleId: roleAdminA._id, permissionId: permNoticeActive._id },

      { roleId: roleResidentB._id, permissionId: permNoticeRead._id },
      { roleId: roleResidentB._id, permissionId: permNoticeActive._id },

      { roleId: roleAdminB._id, permissionId: permNoticeManage._id },
      { roleId: roleAdminB._id, permissionId: permNoticeRead._id },
      { roleId: roleAdminB._id, permissionId: permNoticeActive._id },
    ]);

    // 4. Create Users
    // Multi-tenant user: Admin in Org A, Resident in Org B
    multiTenantUser = await User.create({
      name: 'Multi Tenant User',
      username: `multi_${ts}`,
      email: `multi_${ts}@test.local`,
      password: 'HashedPassword123!',
      status: 'Active',
      emailVerified: true,
      roles: [roleAdminA._id], // Legacy user.roles points to Org A admin!
    });

    legitimateAdminB = await User.create({
      name: 'Admin User Org B',
      username: `adminb_${ts}`,
      email: `adminb_${ts}@test.local`,
      password: 'HashedPassword123!',
      status: 'Active',
      emailVerified: true,
      roles: [roleAdminB._id],
    });

    incompleteUser = await User.create({
      name: 'Incomplete User',
      username: `incomp_${ts}`,
      email: `incomp_${ts}@test.local`,
      password: 'HashedPassword123!',
      status: 'Active',
      emailVerified: true,
      roles: [],
    });

    pendingUser = await User.create({
      name: 'Pending User',
      username: `pending_${ts}`,
      email: `pending_${ts}@test.local`,
      password: 'HashedPassword123!',
      status: 'Active',
      emailVerified: true,
      roles: [],
    });

    nonMemberUser = await User.create({
      name: 'Non Member User',
      username: `nonmem_${ts}`,
      email: `nonmem_${ts}@test.local`,
      password: 'HashedPassword123!',
      status: 'Active',
      emailVerified: true,
      roles: [],
    });

    platformAdminUser = await User.create({
      name: 'Platform Super Admin',
      username: `platform_${ts}`,
      email: `platform_${ts}@test.local`,
      password: 'HashedPassword123!',
      status: 'Active',
      emailVerified: true,
      isPlatform: true,
      roles: [],
    });

    // 5. Create OrgMemberships
    // multiTenantUser: Active Admin in Org A
    await OrgMembership.create({
      userId: multiTenantUser._id,
      orgId: orgA._id,
      roleId: roleAdminA._id,
      roleIds: [roleAdminA._id],
      status: 'Active',
    });
    // multiTenantUser: Active Resident in Org B
    await OrgMembership.create({
      userId: multiTenantUser._id,
      orgId: orgB._id,
      roleId: roleResidentB._id,
      roleIds: [roleResidentB._id],
      status: 'Active',
    });

    // legitimateAdminB: Active Admin in Org B
    await OrgMembership.create({
      userId: legitimateAdminB._id,
      orgId: orgB._id,
      roleId: roleAdminB._id,
      roleIds: [roleAdminB._id],
      status: 'Active',
    });

    // incompleteUser: Active membership in Org B with no roles
    await OrgMembership.create({
      userId: incompleteUser._id,
      orgId: orgB._id,
      roleId: null,
      roleIds: [],
      status: 'Active',
    });

    // pendingUser: Pending membership in Org B
    await OrgMembership.create({
      userId: pendingUser._id,
      orgId: orgB._id,
      roleId: roleResidentB._id,
      roleIds: [roleResidentB._id],
      status: 'Pending',
    });

    // nonMemberUser has NO OrgMembership in Org B

    // platformOrg for platformAdminUser
    const platformOrg = await Organization.create({
      name: `Platform Org SEC-05.2A ${ts}`,
      isPlatform: true,
      organizationType: 'Other',
      status: 'Active',
    });
    await OrgMembership.create({
      userId: platformAdminUser._id,
      orgId: platformOrg._id,
      status: 'Active',
    });

    // 6. Generate JWT Tokens
    tokenMultiTenant = signToken({
      id: multiTenantUser._id.toString(),
      email: multiTenantUser.email,
      orgId: orgA_Id,
      role: 'Admin',
      roles: [roleAdminA._id.toString()],
      isPlatform: false,
    });

    tokenAdminB = signToken({
      id: legitimateAdminB._id.toString(),
      email: legitimateAdminB.email,
      orgId: orgB_Id,
      role: 'Admin',
      roles: [roleAdminB._id.toString()],
      isPlatform: false,
    });

    tokenIncomplete = signToken({
      id: incompleteUser._id.toString(),
      email: incompleteUser.email,
      orgId: orgB_Id,
      role: 'Resident',
      isPlatform: false,
    });

    tokenPending = signToken({
      id: pendingUser._id.toString(),
      email: pendingUser.email,
      orgId: orgB_Id,
      role: 'Resident',
      isPlatform: false,
    });

    tokenNonMember = signToken({
      id: nonMemberUser._id.toString(),
      email: nonMemberUser.email,
      orgId: orgA_Id,
      role: 'Resident',
      isPlatform: false,
    });

    tokenPlatformAdmin = signToken({
      id: platformAdminUser._id.toString(),
      email: platformAdminUser.email,
      role: 'Super Admin',
      isPlatform: true,
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    // Cleanup seeded test documents
    const orgIds = [orgA?._id, orgB?._id].filter(Boolean);
    const userIds = [
      multiTenantUser?._id, legitimateAdminB?._id, incompleteUser?._id,
      pendingUser?._id, nonMemberUser?._id, platformAdminUser?._id
    ].filter(Boolean);

    await RolePermission.deleteMany({
      roleId: { $in: [roleAdminA?._id, roleResidentA?._id, roleAdminB?._id, roleResidentB?._id].filter(Boolean) },
    });
    await Role.deleteMany({ orgId: { $in: orgIds } });
    await OrgMembership.deleteMany({ userId: { $in: userIds } });
    await User.deleteMany({ _id: { $in: userIds } });
    await Organization.deleteMany({ _id: { $in: orgIds } });
    await mongoose.connection.close();
  });

  describe('1. Cross-Tenant Privilege Escalation Prevention (SEC-05.1-F01)', () => {
    it('should deny an Admin of Org A attempting to perform an administrative action in Org B', async () => {
      // multiTenantUser is Admin in Org A, but Resident in Org B
      // POST /api/v1/notices requires 'manage_notices' or 'create'
      const res = await fetch(`${baseUrl}/api/v1/notices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenMultiTenant}`,
          'X-Organization-Id': orgB_Id,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Unauthorized Cross-Tenant Notice',
          description: 'This notice should never be created in Org B by Org A Admin',
          priority: 'Medium',
          category: 'General',
        }),
      });

      assert.equal(res.status, 403, `Expected HTTP 403 Forbidden, got ${res.status}`);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.ok(body.message.includes('permission') || body.message.includes('Forbidden'));
    });

    it('should allow legitimate Admin of Org B to create notices in Org B', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenAdminB}`,
          'X-Organization-Id': orgB_Id,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Authorized Notice Org B',
          description: 'Legitimate notice created by Org B Admin',
          priority: 'Medium',
          category: 'Maintenance',
          expiryDate: new Date(Date.now() + 864000000).toISOString(),
        }),
      });

      // Status should be 201 Created (or 200)
      assert.ok([200, 201].includes(res.status), `Expected 200 or 201, got ${res.status}`);
      const body = await res.json();
      assert.equal(body.success, true);
    });

    it('should allow multiTenantUser to create notices in Org A where they are legitimately an Admin', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenMultiTenant}`,
          'X-Organization-Id': orgA_Id,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Authorized Notice Org A',
          description: 'Legitimate notice created in Org A',
          priority: 'Medium',
          category: 'General',
          expiryDate: new Date(Date.now() + 864000000).toISOString(),
        }),
      });

      assert.ok([200, 201].includes(res.status), `Expected 200 or 201, got ${res.status}`);
      const body = await res.json();
      assert.equal(body.success, true);
    });
  });

  describe('2. Legacy user.roles Elimination & Role Scoping', () => {
    it('getPermissionsForUser should NOT resolve foreign tenant permissions even if user.roles contains foreign admin role ID', async () => {
      // multiTenantUser.roles contains roleAdminA._id
      const permissions = await getPermissionsForUser(multiTenantUser, orgB_Id);

      // Should only contain Org B Resident permissions
      assert.ok(permissions.includes('notices:read'), 'Expected notices:read in Org B');
      assert.ok(permissions.includes('notices:active_board'), 'Expected notices:active_board in Org B');

      // MUST NOT contain Org A Admin permissions
      assert.ok(!permissions.includes('notices:manage_notices'), 'Foreign admin permission notices:manage_notices must NOT bleed into Org B');
    });

    it('checkIsAdmin should return false for Org B when user is only Admin in Org A', async () => {
      const mockReqOrgB = {
        user: {
          id: multiTenantUser._id.toString(),
          role: 'Admin', // Token claims Admin from Org A
          orgId: orgA_Id,
          roles: [roleAdminA._id.toString()],
        },
        tenant: {
          orgId: orgB_Id,
          role: 'Resident', // Verified tenant context from OrgMembership
        },
        tenantRole: 'Resident',
        headers: {
          'x-organization-id': orgB_Id,
        },
      };

      const isAdmin = await checkIsAdmin(mockReqOrgB);
      assert.equal(isAdmin, false, 'User must not be treated as admin in Org B');
    });

    it('checkIsAdmin should verify OrgMembership in DB if tenantRole is missing', async () => {
      const mockReqNoTenantRole = {
        user: {
          id: multiTenantUser._id.toString(),
          role: 'Admin', // Token claims Admin from Org A
          orgId: orgA_Id,
          roles: [roleAdminA._id.toString()],
        },
        headers: {
          'x-organization-id': orgB_Id,
        },
      };

      const isAdmin = await checkIsAdmin(mockReqNoTenantRole);
      assert.equal(isAdmin, false, 'Database membership check must deny admin status for Org B');
    });
  });

  describe('3. Incomplete, Missing, and Inactive Membership Validation', () => {
    it('should deny privileged access to a user with empty role mapping (incompleteUser)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenIncomplete}`,
          'X-Organization-Id': orgB_Id,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Incomplete Role Notice',
          content: 'Test content',
        }),
      });

      assert.equal(res.status, 403, `Expected HTTP 403 Forbidden, got ${res.status}`);
    });

    it('should deny access to a user whose membership is Pending', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notices`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenPending}`,
          'X-Organization-Id': orgB_Id,
        },
      });

      assert.equal(res.status, 403, `Expected HTTP 403 Forbidden for pending member, got ${res.status}`);
    });

    it('should deny access to a user who has no membership in the requested organization', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notices`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenNonMember}`,
          'X-Organization-Id': orgB_Id,
        },
      });

      assert.equal(res.status, 403, `Expected HTTP 403 Forbidden for non-member, got ${res.status}`);
    });

    it('should fail closed when organization context is missing or invalid', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notices`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenMultiTenant}`,
          'X-Organization-Id': 'invalid-mongodb-id',
        },
      });

      assert.ok([400, 403].includes(res.status), `Expected 400 or 403 for invalid orgId, got ${res.status}`);
    });
  });

  describe('4. Global Platform Admin Access Preservation', () => {
    it('checkIsAdmin should return true for platform super admin with isPlatform: true', async () => {
      const mockReqPlatform = {
        user: {
          id: platformAdminUser._id.toString(),
          role: 'Super Admin',
          isPlatform: true,
        },
        headers: {},
      };

      const isAdmin = await checkIsAdmin(mockReqPlatform);
      assert.equal(isAdmin, true, 'Platform admin must be recognized as admin');
    });

    it('getPermissionsForUser should return full wildcard for platform super admin', async () => {
      const permissions = await getPermissionsForUser(platformAdminUser, orgB_Id);
      assert.deepEqual(permissions, ['*'], 'Platform super admin must receive wildcard permissions');
    });

    it('authorizeRoles should allow platform super admin to proceed', async () => {
      const req = {
        user: {
          id: platformAdminUser._id.toString(),
          role: 'Super Admin',
          isPlatform: true,
        },
        headers: {},
      };
      const res = {};
      let nextCalled = false;

      const middleware = authorizeRoles('Admin', 'Community Admin');
      middleware(req, res, () => {
        nextCalled = true;
      });

      assert.equal(nextCalled, true, 'Platform super admin must bypass role restriction');
    });
  });

  describe('5. Cached Permissions Consistency', () => {
    it('cached permissions in RolePermissionService for Org A role cannot grant privileges in Org B', async () => {
      // 1. Prime the RolePermissionService cache for roleAdminA in Org A context
      const cachedAdminPerms = await rolePermissionService.getPermissionsByRoleId(roleAdminA._id, orgA_Id);
      assert.ok(cachedAdminPerms.some((p) => p.name === 'notices:manage_notices'));

      // 2. Resolve permissions for multiTenantUser in Org B
      const orgBPerms = await getPermissionsForUser(multiTenantUser, orgB_Id);

      // 3. Confirm that cached Org A admin permissions were not reintroduced into Org B context
      assert.ok(!orgBPerms.includes('notices:manage_notices'), 'Cached Org A permissions must never bleed into Org B');
    });
  });
});

/**
 * Phase 0 — regression tests for the invitation / account-setup security holes.
 * Each test reproduces an attack from the audit and asserts it now fails.
 *
 * Run: MONGODB_URI=mongodb://127.0.0.1:27017/mmg_auth_test?replicaSet=rs0 NODE_ENV=test \
 *      node --test tests/auth.phase0.security.test.mjs
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import mongoose from 'mongoose';

import app from '../index.js';
import config from '../src/config/config.js';
import User from '../src/features/user/user.model.js';
import Organization from '../src/features/organization/organization.model.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';
import Role from '../src/features/role/role.model.js';
import Permission from '../src/features/permission/permission.model.js';
import RolePermission from '../src/features/rolePermission/rolePermission.model.js';
import authService from '../src/features/auth/auth.services.js';
import tokenService from '../src/features/token/token.services.js';
import orgMembershipService from '../src/features/orgMembership/orgMembership.services.js';
import { issueAccountSetupToken } from '../src/features/auth/accountSetupToken.js';
import { signToken } from '../src/utils/jwt.utils.js';
import { hashPassword, comparePassword } from '../src/utils/crypto.utils.js';

const STRONG_PASSWORD = 'Str0ng!Pass';
const ORIGINAL_PASSWORD = 'Orig1nal!Pass';

describe('Phase 0 — invitation & account-setup security', () => {
  let server;
  let baseUrl;
  const t = Date.now();
  const perms = {};
  let orgA;
  let orgB;
  let victim; // established Active user, member of A (Active) and B (Pending)
  let residentToken;
  let managerToken;
  let adminToken;
  let adminUser;

  const api = async (method, path, { body, token } = {}) => {
    const res = await fetch(`${baseUrl}/api/v1${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try { json = await res.json(); } catch (_) {}
    return { status: res.status, body: json };
  };

  const makePermission = async (name) => {
    const [feature, action] = name.split(':');
    perms[name] = await Permission.create({ feature, action, name });
  };

  const makeRole = async (name, orgId, permNames) => {
    const role = await Role.create({ name, orgId });
    for (const p of permNames) {
      await RolePermission.create({ roleId: role._id, permissionId: perms[p]._id });
    }
    return role;
  };

  const makeUser = async (label, extra = {}) =>
    User.create({
      email: `${label}_${t}@p0.test`,
      username: `${label}_${t}`,
      password: await hashPassword(ORIGINAL_PASSWORD),
      status: 'Active',
      ...extra,
    });

  const tokenFor = async (user, orgId) => {
    const { tokenPayload } = await authService.getScopedTokenPayload(user, orgId);
    return signToken(tokenPayload);
  };

  const membershipStatus = async (userId, orgId) =>
    (await OrgMembership.findOne({ userId, orgId }).lean())?.status;

  before(async () => {
    const uri = config.mongodb?.uri || process.env.MONGODB_URI;
    if (!/auth_test/.test(uri)) {
      throw new Error(`Refusing to run Phase 0 tests against a non-test database: ${uri}`);
    }
    if (mongoose.connection.readyState === 0) await mongoose.connect(uri);
    // Clear rather than drop: the app may be creating collections/indexes concurrently
    for (const c of await mongoose.connection.db.collections()) {
      await c.deleteMany({});
    }
    await Promise.all([User.init(), Organization.init(), OrgMembership.init(), Role.init(), Permission.init()]);

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    for (const p of ['users:create', 'users:read', 'villas:read', 'villas:create', 'villas:update', 'roles:update', 'amenities:discover']) {
      await makePermission(p);
    }

    orgA = await Organization.create({ name: `P0 Alpha ${t}`, organizationType: 'Residential', status: 'Active' });
    orgB = await Organization.create({ name: `P0 Beta ${t}`, organizationType: 'Residential', status: 'Active' });

    const adminRoleA = await makeRole('Community Admin', orgA._id, Object.keys(perms));
    const residentRoleA = await makeRole('Resident Owner', orgA._id, ['villas:read', 'users:read', 'amenities:discover']);
    const managerRoleA = await makeRole('Unit Manager', orgA._id, ['users:create', 'villas:read', 'villas:update']);
    await makeRole('Viewer', orgA._id, ['villas:read']);
    await makeRole('Resident Owner', orgB._id, ['villas:read']);
    // A global role that must never be assignable through an invite
    await Role.create({ name: 'Global Overseer', orgId: null, isSystem: true });

    victim = await makeUser('victim');
    await OrgMembership.create({ userId: victim._id, orgId: orgA._id, roleIds: [residentRoleA._id], status: 'Active' });
    await OrgMembership.create({ userId: victim._id, orgId: orgB._id, roleIds: [], status: 'Pending' });

    adminUser = await makeUser('admin');
    await OrgMembership.create({ userId: adminUser._id, orgId: orgA._id, roleIds: [adminRoleA._id], status: 'Active' });
    adminToken = await tokenFor(adminUser, orgA._id);

    const resident = await makeUser('resident');
    await OrgMembership.create({ userId: resident._id, orgId: orgA._id, roleIds: [residentRoleA._id], status: 'Active' });
    residentToken = await tokenFor(resident, orgA._id);

    const manager = await makeUser('manager');
    await OrgMembership.create({ userId: manager._id, orgId: orgA._id, roleIds: [managerRoleA._id], status: 'Active' });
    managerToken = await tokenFor(manager, orgA._id);
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  });

  describe('setup-account-password', () => {
    it('rejects a request with no setup token (email + password alone)', async () => {
      const res = await api('POST', '/auth/setup-account-password', {
        body: { email: victim.email, password: 'Hijack!123' },
      });
      assert.equal(res.status, 400);
      const fresh = await User.findById(victim._id);
      assert.ok(await comparePassword(ORIGINAL_PASSWORD, fresh.password), 'victim password must be unchanged');
    });

    it('rejects a forged token', async () => {
      const res = await api('POST', '/auth/setup-account-password', {
        body: { email: victim.email, password: 'Hijack!123', setupToken: 'forged.jwt.value' },
      });
      assert.equal(res.status, 400);
    });

    it('rejects a valid token issued for a different email', async () => {
      const res = await api('POST', '/auth/setup-account-password', {
        body: { email: victim.email, password: 'Hijack!123', setupToken: issueAccountSetupToken(`other_${t}@p0.test`) },
      });
      assert.equal(res.status, 403);
    });

    it('accepts a valid link once, ignores a body orgName, and refuses re-use', async () => {
      const email = `owner_${t}@p0.test`;
      const setupToken = issueAccountSetupToken(email);
      const first = await api('POST', '/auth/setup-account-password', {
        body: { email, password: STRONG_PASSWORD, setupToken, orgName: orgA.name },
      });
      assert.equal(first.status, 200, JSON.stringify(first.body));
      const owner = await User.findOne({ email });
      assert.equal(await membershipStatus(owner._id, orgA._id), undefined, 'body orgName must not attach the caller to another community');

      const second = await api('POST', '/auth/setup-account-password', {
        body: { email, password: 'Another!123', setupToken },
      });
      assert.equal(second.status, 400);
    });
  });

  describe('accept-invite', () => {
    it('rejects email + password without a token', async () => {
      const res = await api('POST', '/auth/accept-invite', {
        body: { email: victim.email, password: STRONG_PASSWORD },
      });
      assert.equal(res.status, 400);
      const fresh = await User.findById(victim._id);
      assert.ok(await comparePassword(ORIGINAL_PASSWORD, fresh.password));
      assert.equal(await membershipStatus(victim._id, orgB._id), 'Pending');
    });

    it('does not let an invite-link holder reset an established account', async () => {
      const { invitationToken } = await tokenService.generateInvitationToken(victim._id, orgB._id);
      const res = await api('POST', '/auth/accept-invite', {
        body: { token: invitationToken, email: victim.email, password: STRONG_PASSWORD },
      });
      assert.equal(res.status, 401);
      const fresh = await User.findById(victim._id);
      assert.ok(await comparePassword(ORIGINAL_PASSWORD, fresh.password));
      assert.equal(await membershipStatus(victim._id, orgB._id), 'Pending');
    });

    it('lets the signed-in invitee accept, activating only that membership', async () => {
      const invitee = await makeUser('multi');
      await OrgMembership.create({ userId: invitee._id, orgId: orgA._id, status: 'Active' });
      await OrgMembership.create({ userId: invitee._id, orgId: orgB._id, status: 'Pending' });
      const orgC = await Organization.create({ name: `P0 Gamma ${t}`, organizationType: 'Residential', status: 'Active' });
      await OrgMembership.create({ userId: invitee._id, orgId: orgC._id, status: 'Pending' });

      const { invitationToken } = await tokenService.generateInvitationToken(invitee._id, orgB._id);
      const res = await api('POST', '/auth/accept-invite', {
        body: { token: invitationToken },
        token: await tokenFor(invitee, orgA._id),
      });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(await membershipStatus(invitee._id, orgB._id), 'Active');
      assert.equal(await membershipStatus(invitee._id, orgC._id), 'Pending', 'other pending invitations must stay pending');
      const fresh = await User.findById(invitee._id);
      assert.ok(await comparePassword(ORIGINAL_PASSWORD, fresh.password), 'accepting must not change credentials');
    });

    it('activates a brand-new invited user with their chosen password', async () => {
      const newbie = await User.create({ email: `newbie_${t}@p0.test`, username: `newbie_${t}`, status: 'Pending Verification' });
      await OrgMembership.create({ userId: newbie._id, orgId: orgA._id, status: 'Pending' });
      const { invitationToken } = await tokenService.generateInvitationToken(newbie._id, orgA._id);
      const res = await api('POST', '/auth/accept-invite', {
        body: { token: invitationToken, email: newbie.email, password: STRONG_PASSWORD },
      });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(await membershipStatus(newbie._id, orgA._id), 'Active');
    });
  });

  describe('reject-invite', () => {
    it('rejects an email-only request and leaves every membership untouched', async () => {
      const res = await api('POST', '/auth/reject-invite', { body: { email: victim.email } });
      assert.equal(res.status, 400);
      assert.equal(await membershipStatus(victim._id, orgA._id), 'Active');
      assert.equal(await membershipStatus(victim._id, orgB._id), 'Pending');
    });

    it('with a token, declines only that pending membership', async () => {
      const person = await makeUser('decliner');
      await OrgMembership.create({ userId: person._id, orgId: orgA._id, status: 'Active' });
      await OrgMembership.create({ userId: person._id, orgId: orgB._id, status: 'Pending' });
      const { invitationToken } = await tokenService.generateInvitationToken(person._id, orgB._id);
      const res = await api('POST', '/auth/reject-invite', { body: { token: invitationToken } });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(await membershipStatus(person._id, orgB._id), 'Rejected');
      assert.equal(await membershipStatus(person._id, orgA._id), 'Active');
    });
  });

  describe('membership activation', () => {
    it('switch-context cannot promote a Rejected or Pending membership', async () => {
      const person = await makeUser('switcher');
      await OrgMembership.create({ userId: person._id, orgId: orgA._id, status: 'Active' });
      await OrgMembership.create({ userId: person._id, orgId: orgB._id, status: 'Rejected' });
      const token = await tokenFor(person, orgA._id);

      const res = await api('POST', '/auth/switch-context', { body: { targetOrgId: String(orgB._id) }, token });
      assert.equal(res.status, 403);
      assert.equal(await membershipStatus(person._id, orgB._id), 'Rejected');

      await OrgMembership.updateOne({ userId: person._id, orgId: orgB._id }, { status: 'Pending' });
      const res2 = await api('POST', '/auth/switch-context', { body: { targetOrgId: String(orgB._id) }, token });
      assert.equal(res2.status, 403);
      assert.equal(await membershipStatus(person._id, orgB._id), 'Pending');
    });

    it('updateStatus refuses to run without both user and community', async () => {
      await assert.rejects(() => orgMembershipService.updateStatus(victim._id, null, 'Rejected'), /requires both/);
      await assert.rejects(() => orgMembershipService.updateStatus(null, orgA._id, 'Rejected'), /requires both/);
      assert.equal(await membershipStatus(victim._id, orgA._id), 'Active');
    });
  });

  describe('invite permissions and role ceiling', () => {
    it('a resident (villas:read only) cannot invite anyone', async () => {
      const res = await api('POST', '/users/invite', {
        body: { email: `res_invitee_${t}@p0.test`, phone: '+919811000001', roleName: 'Community Admin' },
        token: residentToken,
      });
      assert.equal(res.status, 403);
    });

    it('a non-admin inviter cannot assign a role with permissions they lack', async () => {
      const res = await api('POST', '/users/invite', {
        body: { email: `esc_${t}@p0.test`, phone: '+919811000002', roleName: 'Resident Owner' },
        token: managerToken,
      });
      assert.equal(res.status, 403, JSON.stringify(res.body));
      assert.equal(await User.exists({ email: `esc_${t}@p0.test` }), null);
    });

    it('a non-admin inviter can assign a role within their own permissions', async () => {
      const res = await api('POST', '/users/invite', {
        body: { email: `ok_${t}@p0.test`, phone: '+919811000003', roleName: 'Viewer' },
        token: managerToken,
      });
      assert.equal(res.status, 201, JSON.stringify(res.body));
    });

    it('bulk invite applies the same ceiling to each row', async () => {
      const res = await api('POST', '/users/bulk-invite', {
        body: { invitations: [{ email: `bulk_${t}@p0.test`, phone: '+919811000005', roleName: 'Community Admin' }] },
        token: managerToken,
      });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(res.body.data.successCount, 0);
      assert.equal(res.body.data.failures[0].code, 'ROLE_NOT_ASSIGNABLE');
      assert.equal(await User.exists({ email: `bulk_${t}@p0.test` }), null);
    });

    it('nobody can assign a global/system role through an invite', async () => {
      const res = await api('POST', '/users/invite', {
        body: { email: `global_${t}@p0.test`, phone: '+919811000004', roleName: 'Global Overseer' },
        token: adminToken,
      });
      assert.equal(res.status, 400, JSON.stringify(res.body));
    });

    it('villa bulk upload no longer passes on villas:read alone', async () => {
      const res = await api('POST', '/villas/bulk-upload', {
        body: { villas: [{ unitNumber: 'X1', email: `vb_${t}@p0.test`, roleName: 'Community Admin' }] },
        token: residentToken,
      });
      assert.equal(res.status, 403);
    });
  });

  describe('onboarding import', () => {
    it('requires villas:create and users:create', async () => {
      const res = await api('POST', '/onboarding/execute-import', {
        body: { validDataArray: [], orgId: String(orgB._id) },
        token: residentToken,
      });
      assert.equal(res.status, 403);
    });
  });
});

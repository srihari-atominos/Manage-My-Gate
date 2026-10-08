/**
 * Phase 4 — Platform Admin creates communities and assigns Community Admins;
 * self-serve creation closed; platform-only routes decided by the signed
 * isPlatform claim; feature selection never strips admin core permissions.
 *
 * Run: MONGODB_URI=mongodb://127.0.0.1:27017/mmg_auth_test?replicaSet=rs0 NODE_ENV=test \
 *      node --test tests/auth.phase4.platform.test.mjs
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
import Token from '../src/features/token/token.model.js';
import authService from '../src/features/auth/auth.services.js';
import { signToken } from '../src/utils/jwt.utils.js';
import { hashPassword } from '../src/utils/crypto.utils.js';

describe('Phase 4 — platform provisioning', () => {
  let server;
  let baseUrl;
  const t = Date.now();
  const tail = String(t).slice(-5);
  let phoneSeq = 0;
  const nextPhone = () => `+9195${tail}${String((phoneSeq += 1)).padStart(3, '0')}`;
  let platformToken;
  let platformUser;
  let communityAdminToken;
  let existingOrg;

  const api = async (method, path, { body, token } = {}) => {
    const res = await fetch(`${baseUrl}/api/v1${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try { json = await res.json(); } catch (_) {}
    return { status: res.status, body: json };
  };
  const errorCode = (res) => res.body?.code || res.body?.details?.code;
  const tokenFor = async (user, orgId) => signToken((await authService.getScopedTokenPayload(user, orgId)).tokenPayload);
  const rolePermissionNames = async (roleId) => {
    const links = await RolePermission.find({ roleId }).populate('permissionId').lean();
    return links.map((l) => l.permissionId?.name).filter(Boolean).sort();
  };

  before(async () => {
    const uri = config.mongodb?.uri || process.env.MONGODB_URI;
    if (!/auth_test/.test(uri)) throw new Error(`Refusing to run Phase 4 tests against a non-test database: ${uri}`);
    if (mongoose.connection.readyState === 0) await mongoose.connect(uri);
    for (const c of await mongoose.connection.db.collections()) await c.deleteMany({});
    await Promise.all([User.init(), Organization.init(), OrgMembership.init(), Role.init(), Permission.init(), Token.init()]);
    process.env.AUTH_IP_RATE_LIMIT = '1000';
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    // A realistic slice of the permission catalogue
    for (const name of [
      'users:create', 'users:read', 'users:update', 'roles:create', 'roles:read', 'roles:update',
      'villas:create', 'villas:read', 'villas:update', 'workspaces:read', 'workspaces:update',
      'integrations:read', 'visitor:resident', 'polls:read', 'amenities:discover', 'billing:action_center', 'notices:read',
    ]) {
      const [feature, action] = name.split(':');
      await Permission.create({ feature, action, name });
    }

    const platformOrg = await Organization.create({ name: `Platform ${t}`, organizationType: 'Other', status: 'Active', isPlatform: true });
    const superAdmin = await Role.create({ name: 'Super Admin', orgId: platformOrg._id });
    platformUser = await User.create({ email: `platform_${t}@p4.test`, username: `platform_${t}`, password: await hashPassword('Plat!0rm1'), status: 'Active' });
    await OrgMembership.create({ userId: platformUser._id, orgId: platformOrg._id, roleIds: [superAdmin._id], status: 'Active' });
    platformToken = await tokenFor(platformUser, platformOrg._id);

    existingOrg = await Organization.create({ name: `Existing ${t}`, organizationType: 'Residential', status: 'Active' });
    const caRole = await Role.create({ name: 'Community Admin', orgId: existingOrg._id });
    const ca = await User.create({ email: `ca_${t}@p4.test`, username: `ca_${t}`, password: await hashPassword('C0mm!Adm'), status: 'Active' });
    await OrgMembership.create({ userId: ca._id, orgId: existingOrg._id, roleIds: [caRole._id], status: 'Active' });
    communityAdminToken = await tokenFor(ca, existingOrg._id);
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  });

  describe('who can create communities', () => {
    it('a community admin cannot use self-serve creation any more', async () => {
      const res = await api('POST', '/organizations/setup', { body: { name: `Selfserve ${t}` }, token: communityAdminToken });
      assert.equal(res.status, 403);
      assert.equal(await Organization.exists({ name: `Selfserve ${t}` }), null);
    });

    it('a community admin cannot provision communities', async () => {
      const res = await api('POST', '/organizations/provision', { body: { name: `Sneaky ${t}` }, token: communityAdminToken });
      assert.equal(res.status, 403);
    });

    it('a community admin cannot reach the platform CRM or change platform pricing', async () => {
      assert.equal((await api('GET', '/platform-crm/enquiries', { token: communityAdminToken })).status, 403);
      assert.equal((await api('POST', '/master-pricing', { body: { name: 'Hack' }, token: communityAdminToken })).status, 403);
    });
  });

  describe('platform admin', () => {
    let provisionedId;

    it('creates a community with default roles and invites its Community Admin', async () => {
      const adminEmail = `newca_${t}@p4.test`;
      const res = await api('POST', '/organizations/provision', {
        body: {
          name: `Green Meadows ${t}`.slice(0, 60),
          features: ['administration_security', 'visitor', 'polls'],
          admin: { email: adminEmail, phone: nextPhone(), name: 'Meera' },
          // must be ignored
          isPlatform: true,
          status: 'Draft',
        },
        token: platformToken,
      });
      assert.equal(res.status, 201, JSON.stringify(res.body));
      provisionedId = res.body.data.organization._id;
      const org = await Organization.findById(provisionedId);
      assert.equal(org.isPlatform, false);
      assert.equal(org.status, 'Active');

      const roles = (await Role.find({ orgId: provisionedId }).lean()).map((r) => r.name).sort();
      assert.deepEqual(roles, ['Community Admin', 'Family Member', 'Resident Owner', 'Resident Tenant', 'Security Guard']);

      assert.equal(await OrgMembership.exists({ userId: platformUser._id, orgId: provisionedId }), null, 'platform user does not join');

      const invitee = await User.findOne({ email: adminEmail });
      assert.equal(invitee.status, 'Pending Verification');
      const membership = await OrgMembership.findOne({ userId: invitee._id, orgId: provisionedId }).populate('roleIds').lean();
      assert.equal(membership.status, 'Pending');
      assert.equal(membership.roleIds[0].name, 'Community Admin');
      assert.ok(await Token.exists({ userId: invitee._id, orgId: provisionedId, type: 'INVITATION', status: 'PENDING' }));
      assert.ok(res.body.data.invitation.inviteLink);
    });

    it('selected features never strip the admin\'s core permissions', async () => {
      const adminRole = await Role.findOne({ orgId: provisionedId, name: 'Community Admin' });
      const names = await rolePermissionNames(adminRole._id);
      for (const core of ['users:create', 'roles:update', 'villas:create', 'workspaces:update', 'integrations:read']) {
        assert.ok(names.includes(core), `missing ${core}`);
      }
      assert.ok(names.includes('visitor:resident'));
      assert.ok(names.includes('polls:read'), 'polls can now be granted');
      assert.ok(!names.includes('amenities:discover'), 'unselected features are not granted');
    });

    it('rejects a duplicate community name', async () => {
      const res = await api('POST', '/organizations/provision', { body: { name: `Existing ${t}` }, token: platformToken });
      assert.equal(res.status, 409);
      assert.equal(errorCode(res), 'COMMUNITY_NAME_TAKEN');
    });

    it('rejects unknown feature keys', async () => {
      const res = await api('POST', '/organizations/provision', { body: { name: `Bad Features ${t}`, features: ['teleport'] }, token: platformToken });
      assert.equal(res.status, 400);
    });

    it('assigns a Community Admin later; email and phone are required', async () => {
      const missing = await api('POST', `/organizations/${existingOrg._id}/admins`, { body: { email: `x_${t}@p4.test` }, token: platformToken });
      assert.equal(missing.status, 400);
      const ok = await api('POST', `/organizations/${existingOrg._id}/admins`, {
        body: { email: `second_${t}@p4.test`, phone: nextPhone() },
        token: platformToken,
      });
      assert.equal(ok.status, 201, JSON.stringify(ok.body));
      assert.equal(ok.body.data.membershipStatus, 'Pending');
    });

    it('a community admin cannot assign admins to another community', async () => {
      const res = await api('POST', `/organizations/${provisionedId}/admins`, {
        body: { email: `rogue_${t}@p4.test`, phone: nextPhone() },
        token: communityAdminToken,
      });
      assert.equal(res.status, 403);
    });
  });

  describe('CRM conversion', () => {
    it('uses the same provisioning: community + invited admin, nobody activated', async () => {
      const Enquiry = (await import('../src/features/platformCrm/enquiry.model.js')).default;
      const contactEmail = `lead_${t}@p4.test`;
      // An existing account with the lead's email must NOT be activated by conversion
      const existing = await User.create({ email: contactEmail, username: `lead_${t}`, status: 'Pending Verification' });
      const enquiry = await Enquiry.create({
        username: 'Lead Person',
        email: contactEmail,
        phone: nextPhone(),
        organizationName: `Lead Towers ${t}`.slice(0, 60),
        totalUnits: 120,
      });
      const res = await api('POST', `/platform-crm/enquiries/${enquiry._id}/convert`, { body: {}, token: platformToken });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      const org = await Organization.findOne({ name: enquiry.organizationName });
      assert.ok(org, 'community created');
      assert.equal(await Role.countDocuments({ orgId: org._id }), 5);
      assert.equal((await User.findById(existing._id)).status, 'Pending Verification');
      assert.equal((await OrgMembership.findOne({ userId: existing._id, orgId: org._id })).status, 'Pending');
    });

    it('is refused for a community admin', async () => {
      const res = await api('POST', '/platform-crm/enquiries/000000000000000000000000/convert', { body: {}, token: communityAdminToken });
      assert.equal(res.status, 403);
    });
  });

  describe('feature updates by a community admin', () => {
    it('keeps core management permissions when features change', async () => {
      const res = await api('PATCH', `/organizations/${existingOrg._id}/features`, {
        body: { features: ['visitor'] },
        token: communityAdminToken,
      });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      const adminRole = await Role.findOne({ orgId: existingOrg._id, name: 'Community Admin' });
      const names = await rolePermissionNames(adminRole._id);
      for (const core of ['users:create', 'roles:update', 'villas:create', 'workspaces:update']) {
        assert.ok(names.includes(core), `missing ${core}`);
      }
    });

    it('rejects unknown feature keys', async () => {
      const res = await api('PATCH', `/organizations/${existingOrg._id}/features`, {
        body: { features: ['visitor', 'nonsense'] },
        token: communityAdminToken,
      });
      assert.equal(res.status, 400);
    });
  });
});

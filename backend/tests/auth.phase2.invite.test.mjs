/**
 * Phase 2 — creating invitations: mandatory email/phone/role, community from
 * context, no duplicate users, identity conflicts, per-row bulk reporting,
 * invitation lifecycle, and locked placeholder accounts.
 *
 * Run: MONGODB_URI=mongodb://127.0.0.1:27017/mmg_auth_test?replicaSet=rs0 NODE_ENV=test \
 *      node --test tests/auth.phase2.invite.test.mjs
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
import tokenService, { INVITATION_VALID_DAYS } from '../src/features/token/token.services.js';
import userService from '../src/features/user/user.services.js';
import { signToken } from '../src/utils/jwt.utils.js';
import { hashPassword } from '../src/utils/crypto.utils.js';

describe('Phase 2 — creating invitations', () => {
  let server;
  let baseUrl;
  const t = Date.now();
  const tail = String(t).slice(-5);
  let phoneSeq = 0;
  const nextPhone = () => `+9197${tail}${String((phoneSeq += 1)).padStart(3, '0')}`;
  const perms = {};
  let orgA;
  let orgB;
  let adminA;
  let adminToken;
  let managerToken;

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

  const makeRole = async (name, orgId, permNames) => {
    const role = await Role.create({ name, orgId });
    for (const p of permNames) await RolePermission.create({ roleId: role._id, permissionId: perms[p]._id });
    return role;
  };
  const makeActiveUser = async (label, extra = {}) =>
    User.create({
      email: `${label}_${t}@p2.test`,
      username: `${label}_${t}`,
      password: await hashPassword('Orig1nal!Pass'),
      status: 'Active',
      ...extra,
    });
  const tokenFor = async (user, orgId) => signToken((await authService.getScopedTokenPayload(user, orgId)).tokenPayload);
  const membershipStatus = async (userId, orgId) => (await OrgMembership.findOne({ userId, orgId }).lean())?.status;

  before(async () => {
    const uri = config.mongodb?.uri || process.env.MONGODB_URI;
    if (!/auth_test/.test(uri)) throw new Error(`Refusing to run Phase 2 tests against a non-test database: ${uri}`);
    if (mongoose.connection.readyState === 0) await mongoose.connect(uri);
    for (const c of await mongoose.connection.db.collections()) await c.deleteMany({});
    await Promise.all([User.init(), Organization.init(), OrgMembership.init(), Role.init(), Permission.init(), Token.init()]);
    process.env.OTP_IP_RATE_LIMIT = '1000';
    process.env.AUTH_IP_RATE_LIMIT = '1000';
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    for (const name of ['users:create', 'users:read', 'villas:read', 'villas:update', 'amenities:discover']) {
      const [feature, action] = name.split(':');
      perms[name] = await Permission.create({ feature, action, name });
    }
    orgA = await Organization.create({ name: `P2 Alpha ${t}`, organizationType: 'Residential', status: 'Active' });
    orgB = await Organization.create({ name: `P2 Beta ${t}`, organizationType: 'Residential', status: 'Active' });
    const adminRole = await makeRole('Community Admin', orgA._id, Object.keys(perms));
    await makeRole('Resident Owner', orgA._id, ['villas:read', 'amenities:discover']);
    await makeRole('Viewer', orgA._id, ['villas:read']);
    const managerRole = await makeRole('Unit Manager', orgA._id, ['users:create', 'villas:read', 'villas:update']);

    adminA = await makeActiveUser('admin');
    await OrgMembership.create({ userId: adminA._id, orgId: orgA._id, roleIds: [adminRole._id], status: 'Active' });
    adminToken = await tokenFor(adminA, orgA._id);
    const manager = await makeActiveUser('manager');
    await OrgMembership.create({ userId: manager._id, orgId: orgA._id, roleIds: [managerRole._id], status: 'Active' });
    managerToken = await tokenFor(manager, orgA._id);
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  });

  describe('single invite', () => {
    it('requires a phone number', async () => {
      const res = await api('POST', '/users/invite', { body: { email: `nophone_${t}@p2.test`, roleName: 'Viewer' }, token: adminToken });
      assert.equal(res.status, 400);
    });

    it('requires a role', async () => {
      const res = await api('POST', '/users/invite', { body: { email: `norole_${t}@p2.test`, phone: nextPhone() }, token: adminToken });
      assert.equal(res.status, 400);
    });

    it('creates a locked placeholder, a Pending membership in the admin\'s community, and a 7-day link', async () => {
      const email = `new_${t}@p2.test`;
      const res = await api('POST', '/users/invite', {
        // A community in the body must be ignored: the admin's context decides
        body: { email, phone: nextPhone(), roleName: 'Viewer', orgId: String(orgB._id) },
        token: adminToken,
      });
      assert.equal(res.status, 201, JSON.stringify(res.body));
      const user = await User.findOne({ email });
      assert.equal(user.status, 'Pending Verification');
      assert.ok(!user.password, 'the invitation must not create credentials');
      assert.equal(await membershipStatus(user._id, orgA._id), 'Pending');
      assert.equal(await membershipStatus(user._id, orgB._id), undefined);

      const token = await Token.findOne({ userId: user._id, orgId: orgA._id, type: 'INVITATION' });
      const days = (token.expiresAt.getTime() - Date.now()) / 86400000;
      assert.ok(Math.abs(days - INVITATION_VALID_DAYS) < 0.1, `expected ~${INVITATION_VALID_DAYS} days, got ${days}`);
    });

    it('reuses an existing user from another community without duplicating them', async () => {
      const existing = await makeActiveUser('existing', { phone: nextPhone() });
      await OrgMembership.create({ userId: existing._id, orgId: orgB._id, status: 'Active' });
      const res = await api('POST', '/users/invite', {
        body: { email: existing.email, phone: existing.phone, roleName: 'Viewer' },
        token: adminToken,
      });
      assert.equal(res.status, 201, JSON.stringify(res.body));
      assert.equal(await User.countDocuments({ email: existing.email }), 1);
      assert.equal(await membershipStatus(existing._id, orgA._id), 'Pending');
      assert.equal(await membershipStatus(existing._id, orgB._id), 'Active', 'other memberships stay unchanged');
      assert.equal((await User.findById(existing._id)).status, 'Active', 'an existing user stays Active');
    });

    it('rejects an email and phone that belong to different people', async () => {
      const owner = await makeActiveUser('phoneowner', { phone: nextPhone() });
      const res = await api('POST', '/users/invite', {
        body: { email: `someoneelse_${t}@p2.test`, phone: owner.phone, roleName: 'Viewer' },
        token: adminToken,
      });
      assert.equal(res.status, 409);
      assert.equal(errorCode(res), 'IDENTITY_CONFLICT');
      assert.equal(await User.exists({ email: `someoneelse_${t}@p2.test` }), null);
    });

    it('rejects inviting someone who is already an active member', async () => {
      const res = await api('POST', '/users/invite', {
        body: { email: adminA.email, phone: nextPhone(), roleName: 'Viewer' },
        token: adminToken,
      });
      assert.equal(res.status, 409);
      assert.equal(errorCode(res), 'ALREADY_MEMBER');
    });

    it('re-inviting replaces the previous link', async () => {
      const email = `reinvite_${t}@p2.test`;
      const phone = nextPhone();
      const first = await api('POST', '/users/invite', { body: { email, phone, roleName: 'Viewer' }, token: adminToken });
      const second = await api('POST', '/users/invite', { body: { email, phone, roleName: 'Viewer' }, token: adminToken });
      assert.equal(second.status, 201, JSON.stringify(second.body));
      await assert.rejects(() => tokenService.validateInvitationToken(first.body.data.invitationToken));
      await tokenService.validateInvitationToken(second.body.data.invitationToken);
    });
  });

  describe('bulk invite', () => {
    it('reports invalid rows and still invites the valid ones', async () => {
      const dupPhone = nextPhone();
      const res = await api('POST', '/users/bulk-invite', {
        body: {
          invitations: [
            { email: `bulk_ok_${t}@p2.test`, phone: nextPhone(), roleName: 'Viewer' },
            { email: `bulk_nophone_${t}@p2.test`, roleName: 'Viewer' },
            { email: `bulk_norole_${t}@p2.test`, phone: nextPhone() },
            { email: 'not-an-email', phone: nextPhone(), roleName: 'Viewer' },
            { email: `bulk_dup1_${t}@p2.test`, phone: dupPhone, roleName: 'Viewer' },
            { email: `bulk_dup2_${t}@p2.test`, phone: dupPhone, roleName: 'Viewer' },
            { email: `bulk_badrole_${t}@p2.test`, phone: nextPhone(), roleName: 'No Such Role' },
          ],
        },
        token: adminToken,
      });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      const { successes, failures } = res.body.data;
      assert.deepEqual(successes.map((s) => s.row).sort(), [1, 5]);
      const byRow = Object.fromEntries(failures.map((f) => [f.row, f.code]));
      assert.equal(byRow[2], 'MISSING_PHONE');
      assert.equal(byRow[3], 'MISSING_ROLE');
      assert.equal(byRow[4], 'MISSING_EMAIL');
      assert.equal(byRow[6], 'DUPLICATE_IN_FILE');
      assert.ok(byRow[7] === undefined || byRow[7] === null || typeof byRow[7] === 'string');
      assert.ok(failures.some((f) => f.row === 7), 'unknown role is reported');
      assert.ok(await User.exists({ email: `bulk_ok_${t}@p2.test` }));
      assert.equal(await User.exists({ email: `bulk_nophone_${t}@p2.test` }), null);
    });

    it('applies the role ceiling per row for non-admin inviters', async () => {
      const res = await api('POST', '/users/bulk-invite', {
        body: {
          invitations: [
            { email: `mgr_ok_${t}@p2.test`, phone: nextPhone(), roleName: 'Viewer' },
            { email: `mgr_esc_${t}@p2.test`, phone: nextPhone(), roleName: 'Resident Owner' },
          ],
        },
        token: managerToken,
      });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(res.body.data.successCount, 1);
      assert.equal(res.body.data.failures[0].code, 'ROLE_NOT_ASSIGNABLE');
    });
  });

  describe('invitation lifecycle', () => {
    const invite = async (label) => {
      const email = `${label}_${t}@p2.test`;
      const { invitationToken, user } = await userService.inviteUser(email, orgA._id, null, 'None', 'Viewer', nextPhone(), '', 'APP', adminA._id);
      return { email, invitationToken, user };
    };
    const accept = (token, email) =>
      api('POST', '/auth/accept-invite', { body: { token, email, password: 'Str0ng!Pass' } });

    it('an expired invitation cannot activate the membership', async () => {
      const { email, invitationToken, user } = await invite('expired');
      await Token.updateOne({ userId: user._id, type: 'INVITATION' }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
      const res = await accept(invitationToken, email);
      assert.equal(res.status, 400);
      assert.equal(errorCode(res), 'INVITATION_EXPIRED');
      assert.equal(await membershipStatus(user._id, orgA._id), 'Pending');
    });

    it('a revoked invitation cannot activate the membership', async () => {
      const { email, invitationToken, user } = await invite('revoked');
      const tokenDoc = await Token.findOne({ userId: user._id, type: 'INVITATION' });
      await userService.revokeInvitation(String(tokenDoc._id), orgA._id, adminA._id);
      const res = await accept(invitationToken, email);
      assert.equal(res.status, 400);
      assert.equal(errorCode(res), 'INVITATION_REVOKED');
      assert.notEqual(await membershipStatus(user._id, orgA._id), 'Active');
    });

    it('a used invitation cannot be used again', async () => {
      const { email, invitationToken, user } = await invite('used');
      assert.equal((await accept(invitationToken, email)).status, 200);
      assert.equal(await membershipStatus(user._id, orgA._id), 'Active');
      const again = await accept(invitationToken, email);
      assert.equal(again.status, 400);
      assert.equal(errorCode(again), 'INVITATION_USED');
    });
  });

  describe('locked placeholder accounts', () => {
    it('cannot be activated by SSO without its invitation', async () => {
      const { user } = await userService.inviteUser(`sso_${t}@p2.test`, orgA._id, null, 'None', 'Viewer', nextPhone(), '', 'APP', adminA._id);
      await assert.rejects(
        () => authService._assertSsoAccountAndInvite(user, null, null),
        (err) => err.details?.code === 'INVITATION_REQUIRED'
      );
    });

    it('SSO cannot consume an invitation that belongs to someone else', async () => {
      const { invitationToken } = await userService.inviteUser(`victim_${t}@p2.test`, orgA._id, null, 'None', 'Viewer', nextPhone(), '', 'APP', adminA._id);
      const stranger = await makeActiveUser('stranger');
      await assert.rejects(
        () => authService._assertSsoAccountAndInvite(stranger, invitationToken, null),
        (err) => err.details?.code === 'INVITATION_MISMATCH'
      );
      await tokenService.validateInvitationToken(invitationToken); // still usable by its owner
    });

    it('cannot be activated by self-registering with the invited email', async () => {
      const email = `selfreg_${t}@p2.test`;
      await userService.inviteUser(email, orgA._id, null, 'None', 'Viewer', nextPhone(), '', 'APP', adminA._id);
      const res = await api('POST', '/auth/register', {
        body: { email, phone: nextPhone(), password: 'Str0ng!Pass', name: 'Self Reg', privacyPolicyAccepted: true },
      });
      assert.equal(res.status, 409, JSON.stringify(res.body));
      assert.equal(errorCode(res), 'INVITATION_REQUIRED');
      assert.equal((await User.findOne({ email })).status, 'Pending Verification');
    });

    it('gets no session from an email code alone (only a ticket to choose an invitation)', async () => {
      const email = `otpph_${t}@p2.test`;
      await userService.inviteUser(email, orgA._id, null, 'None', 'Viewer', nextPhone(), '', 'APP', adminA._id);
      process.env.OTP_DEBUG = 'true';
      const sent = await api('POST', '/auth/login/email-otp', { body: { email } });
      process.env.OTP_DEBUG = '';
      const res = await api('POST', '/auth/login/email-otp/verify', { body: { email, code: sent.body.data.devCode } });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(res.body.data.requiresInvitationSelection, true);
      assert.equal(res.body.data.token, undefined);
      assert.equal((await User.findOne({ email })).status, 'Pending Verification');
    });
  });
});

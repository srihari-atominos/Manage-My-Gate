/**
 * Phase 3 — accepting invitations after OTP/SSO verification, the
 * pending-invitations flow, one login result for every method, landing hint.
 *
 * Run: MONGODB_URI=mongodb://127.0.0.1:27017/mmg_auth_test?replicaSet=rs0 NODE_ENV=test \
 *      node --test tests/auth.phase3.acceptance.test.mjs
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
import userService from '../src/features/user/user.services.js';
import { signToken } from '../src/utils/jwt.utils.js';
import { hashPassword } from '../src/utils/crypto.utils.js';
import { OTP_RESEND_COOLDOWN_SECONDS } from '../src/features/otp/otp.services.js';
import OtpThrottle from '../src/features/otp/otpThrottle.model.js';

describe('Phase 3 — invitation acceptance and login result', () => {
  let server;
  let baseUrl;
  const t = Date.now();
  const tail = String(t).slice(-5);
  let phoneSeq = 0;
  const nextPhone = () => `+9196${tail}${String((phoneSeq += 1)).padStart(3, '0')}`;
  let seq = 0;
  const nextEmail = (label) => `${label}${(seq += 1)}_${t}@p3.test`;
  const perms = {};
  let orgA;
  let orgB;
  let orgC;
  let admin;

  const api = async (method, path, { body, token } = {}) => {
    const res = await fetch(`${baseUrl}/api/v1${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try { json = await res.json(); } catch (_) {}
    return { status: res.status, body: json, cookies: res.headers.get('set-cookie') };
  };
  const errorCode = (res) => res.body?.code || res.body?.details?.code;
  const membershipStatus = async (userId, orgId) => (await OrgMembership.findOne({ userId, orgId }).lean())?.status;
  const invite = async (email, phone, orgId, roleName = 'Resident') => {
    const res = await userService.inviteUser(email, orgId, null, 'None', roleName, phone, '', 'APP', admin._id);
    return res;
  };

  /** Requests an email code (bypassing the resend cooldown) and returns it. */
  const emailCode = async (email) => {
    await OtpThrottle.updateOne(
      { identifier: email.toLowerCase() },
      { $set: { lastSentAt: new Date(Date.now() - (OTP_RESEND_COOLDOWN_SECONDS + 5) * 1000) } }
    );
    process.env.OTP_DEBUG = 'true';
    const res = await api('POST', '/auth/login/email-otp', { body: { email } });
    process.env.OTP_DEBUG = '';
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return res.body.data.devCode;
  };
  const phoneCode = async (phone) => {
    process.env.OTP_DEBUG = 'true';
    const res = await api('POST', '/auth/login/phone', { body: { phone } });
    process.env.OTP_DEBUG = '';
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return res.body.data.devCode;
  };

  before(async () => {
    const uri = config.mongodb?.uri || process.env.MONGODB_URI;
    if (!/auth_test/.test(uri)) throw new Error(`Refusing to run Phase 3 tests against a non-test database: ${uri}`);
    if (mongoose.connection.readyState === 0) await mongoose.connect(uri);
    for (const c of await mongoose.connection.db.collections()) await c.deleteMany({});
    await Promise.all([User.init(), Organization.init(), OrgMembership.init(), Role.init(), Permission.init(), Token.init()]);
    process.env.OTP_IP_RATE_LIMIT = '1000';
    process.env.AUTH_IP_RATE_LIMIT = '1000';
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    for (const name of ['users:create', 'users:read', 'villas:read', 'roles:update']) {
      const [feature, action] = name.split(':');
      perms[name] = await Permission.create({ feature, action, name });
    }
    const roleWith = async (name, orgId, list) => {
      const role = await Role.create({ name, orgId });
      for (const p of list) await RolePermission.create({ roleId: role._id, permissionId: perms[p]._id });
      return role;
    };
    orgA = await Organization.create({ name: `P3 Alpha ${t}`, organizationType: 'Residential', status: 'Active' });
    orgB = await Organization.create({ name: `P3 Beta ${t}`, organizationType: 'Residential', status: 'Active' });
    orgC = await Organization.create({ name: `P3 Gamma ${t}`, organizationType: 'Residential', status: 'Active' });
    for (const org of [orgA, orgB, orgC]) {
      // "Steward" is a custom admin-like role: landing must come from permissions, not the name
      await roleWith('Steward', org._id, ['users:create', 'users:read', 'villas:read', 'roles:update']);
      await roleWith('Resident', org._id, ['villas:read']);
    }
    admin = await User.create({ email: nextEmail('admin'), username: `admin_${t}`, password: await hashPassword('Adm1n!Pass'), status: 'Active' });
    const steward = await Role.findOne({ name: 'Steward', orgId: orgA._id });
    await OrgMembership.create({ userId: admin._id, orgId: orgA._id, roleIds: [steward._id], status: 'Active' });
  });

  after(async () => {
    delete process.env.OTP_DEBUG;
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  });

  describe('new invitee (placeholder)', () => {
    it('email code + invite token activates exactly that membership and signs in', async () => {
      const email = nextEmail('newbie');
      const phone = nextPhone();
      const a = await invite(email, phone, orgA._id);
      await invite(email, phone, orgB._id);
      const code = await emailCode(email);

      const res = await api('POST', '/auth/login/email-otp/verify', { body: { email, code, inviteToken: a.invitationToken } });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      const data = res.body.data;
      assert.ok(data.token && data.refreshToken);
      assert.equal(data.user.orgId, String(orgA._id));
      assert.equal(data.landing, 'member');
      assert.equal(data.pendingInvitations.length, 1, 'the other invitation is still pending');
      assert.equal(data.pendingInvitations[0].orgId, String(orgB._id));

      const user = await User.findOne({ email });
      assert.equal(user.status, 'Active');
      assert.equal(user.emailVerified, true);
      assert.equal(await membershipStatus(user._id, orgA._id), 'Active');
      assert.equal(await membershipStatus(user._id, orgB._id), 'Pending');
    });

    it('phone code + invite token marks the phone verified', async () => {
      const email = nextEmail('phoner');
      const phone = nextPhone();
      const a = await invite(email, phone, orgA._id);
      const code = await phoneCode(phone);
      const res = await api('POST', '/auth/login/phone/verify', { body: { phone, code, inviteToken: a.invitationToken } });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      const user = await User.findOne({ email });
      assert.equal(user.phoneVerified, true);
      assert.equal(await membershipStatus(user._id, orgA._id), 'Active');
      assert.equal(res.body.data.user.phone, phone, 'phone login returns the full user, not a slim one');
    });

    it('without the link: gets a ticket and picks the exact invitation to accept', async () => {
      const email = nextEmail('picker');
      const phone = nextPhone();
      await invite(email, phone, orgA._id);
      await invite(email, phone, orgB._id);
      const code = await emailCode(email);

      const res = await api('POST', '/auth/login/email-otp/verify', { body: { email, code } });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      const data = res.body.data;
      assert.equal(data.requiresInvitationSelection, true);
      assert.equal(data.landing, 'pending_invitations');
      assert.ok(!data.token, 'no session before an invitation is accepted');
      assert.equal(res.cookies, null);
      assert.equal(data.pendingInvitations.length, 2);

      const chosen = data.pendingInvitations.find((i) => i.orgId === String(orgB._id));
      assert.equal(chosen.communityName, orgB.name);
      const accepted = await api('POST', '/auth/invitations/accept', { body: { ticket: data.ticket, invitationId: chosen.id } });
      assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
      assert.equal(accepted.body.data.user.orgId, String(orgB._id));

      const user = await User.findOne({ email });
      assert.equal(await membershipStatus(user._id, orgB._id), 'Active');
      assert.equal(await membershipStatus(user._id, orgA._id), 'Pending', 'never the first or an arbitrary invitation');
    });

    it('a ticket cannot accept someone else\'s invitation', async () => {
      const mine = nextEmail('ticketholder');
      await invite(mine, nextPhone(), orgA._id);
      const theirs = await invite(nextEmail('other'), nextPhone(), orgA._id);
      const theirDoc = await Token.findOne({ userId: theirs.user._id, type: 'INVITATION' });

      const code = await emailCode(mine);
      const { body } = await api('POST', '/auth/login/email-otp/verify', { body: { email: mine, code } });
      const res = await api('POST', '/auth/invitations/accept', { body: { ticket: body.data.ticket, invitationId: String(theirDoc._id) } });
      assert.equal(res.status, 403);
      assert.equal(errorCode(res), 'INVITATION_MISMATCH');
      assert.equal(await membershipStatus(theirs.user._id, orgA._id), 'Pending');
    });

    it('a forged ticket is refused', async () => {
      const doc = await Token.findOne({ type: 'INVITATION', status: 'PENDING' });
      const res = await api('POST', '/auth/invitations/accept', { body: { ticket: 'forged', invitationId: String(doc._id) } });
      assert.equal(res.status, 401);
    });

    it('someone else\'s invite token is refused at code verification', async () => {
      const mine = nextEmail('mine');
      await invite(mine, nextPhone(), orgA._id);
      const theirs = await invite(nextEmail('theirs'), nextPhone(), orgA._id);
      const code = await emailCode(mine);
      const res = await api('POST', '/auth/login/email-otp/verify', { body: { email: mine, code, inviteToken: theirs.invitationToken } });
      assert.equal(res.status, 403);
      assert.equal(errorCode(res), 'INVITATION_MISMATCH');
      assert.equal(await membershipStatus(theirs.user._id, orgA._id), 'Pending');
      assert.equal((await User.findOne({ email: mine })).status, 'Pending Verification');
    });

    it('an expired invitation does not activate anything', async () => {
      const email = nextEmail('late');
      const a = await invite(email, nextPhone(), orgA._id);
      await Token.updateOne({ userId: a.user._id, type: 'INVITATION' }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
      const code = await emailCode(email);
      const res = await api('POST', '/auth/login/email-otp/verify', { body: { email, code, inviteToken: a.invitationToken } });
      assert.equal(res.status, 400);
      assert.equal(errorCode(res), 'INVITATION_EXPIRED');
      assert.equal((await User.findOne({ email })).status, 'Pending Verification');
      assert.equal(await membershipStatus(a.user._id, orgA._id), 'Pending');
    });

    it('with no live invitation at all, sign-in is refused', async () => {
      const email = nextEmail('revoked');
      const a = await invite(email, nextPhone(), orgA._id);
      await Token.updateOne({ userId: a.user._id, type: 'INVITATION' }, { $set: { status: 'REVOKED' } });
      const code = await emailCode(email);
      const res = await api('POST', '/auth/login/email-otp/verify', { body: { email, code } });
      assert.equal(res.status, 403);
      assert.equal(errorCode(res), 'INVITATION_REQUIRED');
    });
  });

  describe('existing active user', () => {
    let john;
    let johnToken;

    before(async () => {
      john = await User.create({ email: nextEmail('john'), username: `john_${t}`, phone: nextPhone(), password: await hashPassword('J0hn!Pass'), status: 'Active' });
      const resident = await Role.findOne({ name: 'Resident', orgId: orgA._id });
      await OrgMembership.create({ userId: john._id, orgId: orgA._id, roleIds: [resident._id], status: 'Active' });
      await invite(john.email, john.phone, orgB._id);
      await invite(john.email, john.phone, orgC._id);
    });

    it('signs in normally and sees pending invitations; nothing is activated by login alone', async () => {
      const code = await emailCode(john.email);
      const res = await api('POST', '/auth/login/email-otp/verify', { body: { email: john.email, code } });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      johnToken = res.body.data.token;
      assert.equal(res.body.data.user.orgId, String(orgA._id));
      assert.equal(res.body.data.landing, 'member');
      assert.equal(res.body.data.pendingInvitations.length, 2);
      assert.equal(await membershipStatus(john._id, orgB._id), 'Pending');
      assert.equal(await membershipStatus(john._id, orgC._id), 'Pending');
      assert.equal(await User.countDocuments({ email: john.email }), 1, 'never a duplicate user');
    });

    it('accepts one chosen invitation while signed in; the other stays pending', async () => {
      const list = await api('GET', '/auth/invitations/pending', { token: johnToken });
      assert.equal(list.status, 200);
      const b = list.body.data.find((i) => i.orgId === String(orgB._id));
      const res = await api('POST', '/auth/invitations/accept', { body: { invitationId: b.id }, token: johnToken });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(res.body.data.user.orgId, String(orgB._id));
      assert.equal(await membershipStatus(john._id, orgA._id), 'Active');
      assert.equal(await membershipStatus(john._id, orgB._id), 'Active');
      assert.equal(await membershipStatus(john._id, orgC._id), 'Pending');
    });

    it('declines one invitation while signed in', async () => {
      const list = await api('GET', '/auth/invitations/pending', { token: johnToken });
      const c = list.body.data.find((i) => i.orgId === String(orgC._id));
      const res = await api('POST', '/auth/invitations/decline', { body: { invitationId: c.id }, token: johnToken });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(await membershipStatus(john._id, orgC._id), 'Rejected');
      assert.equal(res.body.data.pendingInvitations.length, 0);
      assert.equal((await Token.findById(c.id)).status, 'REJECTED');
    });

    it('password login with an invite token uses the same acceptance', async () => {
      const email = nextEmail('pw');
      const user = await User.create({ email, username: `pw_${t}`, phone: nextPhone(), password: await hashPassword('Pw0rd!Pass'), status: 'Active' });
      const a = await invite(email, user.phone, orgA._id);
      const res = await api('POST', '/auth/login', { body: { login: email, password: 'Pw0rd!Pass', inviteToken: a.invitationToken } });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(await membershipStatus(user._id, orgA._id), 'Active');
      assert.ok(Array.isArray(res.body.data.pendingInvitations));
      assert.ok(res.body.data.landing);
    });
  });

  describe('accepting from an invitation link while signed in', () => {
    it('accepts exactly the linked invitation with the session', async () => {
      const email = nextEmail('linked');
      const user = await User.create({ email, username: `linked_${t}`, phone: nextPhone(), password: await hashPassword('L1nk!Pass'), status: 'Active' });
      const resident = await Role.findOne({ name: 'Resident', orgId: orgA._id });
      await OrgMembership.create({ userId: user._id, orgId: orgA._id, roleIds: [resident._id], status: 'Active' });
      const b = await invite(email, user.phone, orgB._id);
      await invite(email, user.phone, orgC._id);
      const code = await emailCode(email);
      const login = await api('POST', '/auth/login/email-otp/verify', { body: { email, code } });

      const res = await api('POST', '/auth/invitations/accept', { body: { inviteToken: b.invitationToken }, token: login.body.data.token });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(res.body.data.user.orgId, String(orgB._id));
      assert.equal(await membershipStatus(user._id, orgB._id), 'Active');
      assert.equal(await membershipStatus(user._id, orgC._id), 'Pending');
    });

    it('requires an invitation id or token', async () => {
      const res = await api('POST', '/auth/invitations/accept', { body: {} });
      assert.equal(res.status, 400);
    });
  });

  describe('app config', () => {
    it('serves the minimum supported mobile version', async () => {
      process.env.MOBILE_MIN_SUPPORTED_VERSION = '1.1.0';
      const res = await api('GET', '/public/app/config');
      delete process.env.MOBILE_MIN_SUPPORTED_VERSION;
      assert.equal(res.status, 200);
      assert.equal(res.body.data.minSupportedVersion, '1.1.0');
      assert.ok(res.body.data.storeUrls.android && res.body.data.storeUrls.ios);
    });
  });

  describe('landing', () => {
    it('comes from permissions, not role names', async () => {
      const code = await emailCode(admin.email);
      const res = await api('POST', '/auth/login/email-otp/verify', { body: { email: admin.email, code } });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(res.body.data.landing, 'community_admin');
    });

    it('is no_community for an active user with no community and no invitations', async () => {
      const loner = await User.create({ email: nextEmail('loner'), username: `loner_${t}`, password: await hashPassword('L0ner!Pass'), status: 'Active' });
      const code = await emailCode(loner.email);
      const res = await api('POST', '/auth/login/email-otp/verify', { body: { email: loner.email, code } });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(res.body.data.landing, 'no_community');
    });
  });

  describe('SSO email linking', () => {
    it('does not link an account by an unverified provider email', async () => {
      const target = await User.create({ email: nextEmail('ssotarget'), username: `ssot_${t}`, password: await hashPassword('Ss0!Pass'), status: 'Active' });
      await assert.rejects(
        () => authService._handleSsoAuthentication({ provider: 'microsoft', providerId: `ms-${t}`, providerEmail: target.email, emailVerified: false, profileData: {} }),
        (err) => err.statusCode === 401
      );
    });

    it('links by a verified provider email', async () => {
      const target = await User.create({ email: nextEmail('ssook'), username: `ssok_${t}`, password: await hashPassword('Ss0!Pass'), status: 'Active' });
      const resident = await Role.findOne({ name: 'Resident', orgId: orgA._id });
      await OrgMembership.create({ userId: target._id, orgId: orgA._id, roleIds: [resident._id], status: 'Active' });
      const result = await authService._handleSsoAuthentication({ provider: 'google', providerId: `g-${t}`, providerEmail: target.email, emailVerified: true, profileData: {} });
      assert.ok(result.token);
      assert.equal(result.user.orgId, String(orgA._id));
    });
  });
});

/**
 * Phase 9 — the whole user story end to end over HTTP, as the apps call it:
 * Platform Admin creates a community and invites its Community Admin; the admin
 * signs in with the invitation (OTP); invites single and bulk users; a new user
 * joins without the link (pending-invitations flow); an existing member of another
 * community joins with the link; roles/landing come from the server; sessions keep
 * context; logout revokes. Only the starting data (permission catalogue, platform
 * account, one existing resident elsewhere) is seeded directly.
 *
 * Run: MONGODB_URI=mongodb://127.0.0.1:27017/mmg_auth_test?replicaSet=rs0 NODE_ENV=test \
 *      node --test tests/auth.phase9.journey.test.mjs
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

import app from '../index.js';
import config from '../src/config/config.js';
import User from '../src/features/user/user.model.js';
import Organization from '../src/features/organization/organization.model.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';
import Role from '../src/features/role/role.model.js';
import Permission from '../src/features/permission/permission.model.js';
import OtpThrottle from '../src/features/otp/otpThrottle.model.js';

describe('Phase 9 — invitation & sign-in journey (stories 1–11)', () => {
  let server;
  let baseUrl;
  const t = Date.now();
  const tail = String(t).slice(-5);
  const phone = (n) => `+9193${tail}${String(n).padStart(3, '0')}`;
  const ctx = {};

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
  const claims = (token) => jwt.decode(token) || {};

  /** Request a code (bypassing the 25 s cooldown between test steps) and verify it. */
  const signInWithCode = async ({ email, phoneNumber, inviteToken }) => {
    const identifier = (email || phoneNumber).toLowerCase();
    await OtpThrottle.updateOne({ identifier }, { $set: { lastSentAt: new Date(Date.now() - 60_000) } });
    process.env.OTP_DEBUG = 'true';
    const sent = email
      ? await api('POST', '/auth/login/email-otp', { body: { email } })
      : await api('POST', '/auth/login/phone', { body: { phone: phoneNumber } });
    process.env.OTP_DEBUG = '';
    assert.equal(sent.status, 200, JSON.stringify(sent.body));
    const code = sent.body.data.devCode;
    const verify = email
      ? await api('POST', '/auth/login/email-otp/verify', { body: { email, code, ...(inviteToken ? { inviteToken } : {}) } })
      : await api('POST', '/auth/login/phone/verify', { body: { phone: phoneNumber, code, ...(inviteToken ? { inviteToken } : {}) } });
    return verify;
  };

  before(async () => {
    const uri = config.mongodb?.uri || process.env.MONGODB_URI;
    if (!/auth_test/.test(uri)) throw new Error(`Refusing to run the journey against a non-test database: ${uri}`);
    if (mongoose.connection.readyState === 0) await mongoose.connect(uri);
    for (const c of await mongoose.connection.db.collections()) await c.deleteMany({});
    await Promise.all([User.init(), Organization.init(), OrgMembership.init(), Role.init(), Permission.init()]);
    process.env.OTP_IP_RATE_LIMIT = '1000';
    process.env.AUTH_IP_RATE_LIMIT = '1000';
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    // Seed: permission catalogue slice, the platform account, and John in another community
    for (const name of [
      'users:create', 'users:read', 'users:update', 'roles:create', 'roles:read', 'roles:update',
      'villas:create', 'villas:read', 'villas:update', 'workspaces:read', 'workspaces:update',
      'visitor:resident', 'amenities:discover', 'notices:read', 'billing:action_center',
    ]) {
      const [feature, action] = name.split(':');
      await Permission.create({ feature, action, name });
    }
    const platformOrg = await Organization.create({ name: `Platform ${t}`, organizationType: 'Other', status: 'Active', isPlatform: true });
    const superAdmin = await Role.create({ name: 'Super Admin', orgId: platformOrg._id });
    const platformUser = await User.create({ email: `platform_${t}@journey.test`, username: `platform_${t}`, status: 'Active' });
    await OrgMembership.create({ userId: platformUser._id, orgId: platformOrg._id, roleIds: [superAdmin._id], status: 'Active' });
    ctx.platformEmail = platformUser.email;

    const lakeside = await Organization.create({ name: `Lakeside ${t}`, organizationType: 'Residential', status: 'Active' });
    const john = await User.create({ email: `john_${t}@journey.test`, username: `john_${t}`, phone: phone(1), status: 'Active' });
    await OrgMembership.create({ userId: john._id, orgId: lakeside._id, status: 'Active' });
    Object.assign(ctx, { lakesideId: String(lakeside._id), john });
  });

  after(async () => {
    delete process.env.OTP_DEBUG;
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  });

  it('1. Platform Admin signs in with an email code (no password)', async () => {
    const res = await signInWithCode({ email: ctx.platformEmail });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.landing, 'platform');
    assert.equal(claims(res.body.data.token).isPlatform, true);
    ctx.platformToken = res.body.data.token;
  });

  it('1. Platform Admin creates a community and invites its Community Admin', async () => {
    const res = await api('POST', '/organizations/provision', {
      body: {
        name: `Green Meadows ${tail}`,
        features: ['administration_security', 'visitor'],
        admin: { email: `meera_${t}@journey.test`, phone: phone(2), name: 'Meera' },
      },
      token: ctx.platformToken,
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    ctx.communityId = String(res.body.data.organization._id);
    ctx.adminInviteToken = res.body.data.invitation.invitationToken; // stands in for the emailed link
    assert.ok(ctx.adminInviteToken);
  });

  it('5–6. The invitation link identifies the community but signs nobody in', async () => {
    const res = await api('GET', `/auth/validate-invite?token=${encodeURIComponent(ctx.adminInviteToken)}`);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.orgName, `Green Meadows ${tail}`);
    assert.equal(res.body.data.token, undefined);
  });

  it('2 & 8. Community Admin signs in with the same login (email code + invitation) and lands as admin', async () => {
    const res = await signInWithCode({ email: `meera_${t}@journey.test`, inviteToken: ctx.adminInviteToken });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.user.orgId, ctx.communityId);
    assert.equal(res.body.data.landing, 'community_admin');
    ctx.adminToken = res.body.data.token;
  });

  it('3. Community Admin invites an existing member of another community (community from context)', async () => {
    const roles = await api('GET', '/users/assignable-roles', { token: ctx.adminToken });
    assert.ok(roles.body.data.some((r) => r.name === 'Resident Owner'));
    const res = await api('POST', '/users/invite', {
      body: { email: ctx.john.email, phone: ctx.john.phone, roleName: 'Resident Owner', orgId: ctx.lakesideId },
      token: ctx.adminToken,
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    ctx.johnInviteToken = res.body.data.invitationToken;
    const membership = await OrgMembership.findOne({ userId: ctx.john._id, orgId: ctx.communityId }).lean();
    assert.equal(membership.status, 'Pending');
    assert.equal(await OrgMembership.countDocuments({ userId: ctx.john._id, orgId: ctx.lakesideId }), 1);
  });

  it('4. Community Admin bulk-invites; invalid rows are reported, valid rows go through', async () => {
    const res = await api('POST', '/users/bulk-invite', {
      body: {
        invitations: [
          { email: `asha_${t}@journey.test`, phone: phone(3), roleName: 'Resident Tenant' },
          { email: `nophone_${t}@journey.test`, roleName: 'Resident Tenant' },
          { email: `asha_${t}@journey.test`, phone: phone(4), roleName: 'Resident Tenant' },
        ],
      },
      token: ctx.adminToken,
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.successCount, 1);
    assert.deepEqual(res.body.data.failures.map((f) => f.code).sort(), ['DUPLICATE_IN_FILE', 'MISSING_PHONE']);
  });

  it('7 & 8. A new user who installed the app fresh (no link) verifies by phone and picks the invitation', async () => {
    const res = await signInWithCode({ phoneNumber: phone(3) });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.requiresInvitationSelection, true);
    assert.equal(res.body.data.token, undefined);
    const [invitation] = res.body.data.pendingInvitations;
    assert.equal(invitation.orgId, ctx.communityId);

    const accepted = await api('POST', '/auth/invitations/accept', { body: { ticket: res.body.data.ticket, invitationId: invitation.id } });
    assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
    assert.equal(accepted.body.data.landing, 'member');
    ctx.ashaToken = accepted.body.data.token;
    const asha = await User.findOne({ email: `asha_${t}@journey.test` });
    assert.equal(asha.status, 'Active');
    assert.equal(asha.phoneVerified, true);
  });

  it('7. Wrong codes count down and then lock the code', async () => {
    process.env.OTP_DEBUG = 'true';
    await OtpThrottle.updateOne({ identifier: ctx.john.email }, { $set: { lastSentAt: new Date(0) } });
    const sent = await api('POST', '/auth/login/email-otp', { body: { email: ctx.john.email } });
    process.env.OTP_DEBUG = '';
    const wrong = sent.body.data.devCode === '000000' ? '111111' : '000000';
    const messages = [];
    for (let i = 0; i < 3; i += 1) {
      const res = await api('POST', '/auth/login/email-otp/verify', { body: { email: ctx.john.email, code: wrong } });
      messages.push(errorCode(res));
    }
    assert.deepEqual(messages, ['OTP_INVALID', 'OTP_INVALID', 'OTP_EXHAUSTED']);
  });

  it('9–10. The existing user accepts with the link: same account, both communities active', async () => {
    const res = await signInWithCode({ email: ctx.john.email, inviteToken: ctx.johnInviteToken });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.user.orgId, ctx.communityId);
    assert.equal(await User.countDocuments({ email: ctx.john.email }), 1);
    const statuses = (await OrgMembership.find({ userId: ctx.john._id }).lean()).map((m) => m.status);
    assert.deepEqual(statuses.sort(), ['Active', 'Active']);
    ctx.johnSession = res.body.data;
  });

  it('11. Authorisation is server-side: a resident cannot invite or create communities', async () => {
    const invite = await api('POST', '/users/invite', {
      body: { email: `x_${t}@journey.test`, phone: phone(9), roleName: 'Community Admin' },
      token: ctx.ashaToken,
    });
    assert.equal(invite.status, 403);
    const provision = await api('POST', '/organizations/provision', { body: { name: `Rogue ${tail}` }, token: ctx.ashaToken });
    assert.equal(provision.status, 403);
  });

  it('Sessions keep the community the app is using; logout revokes', async () => {
    const refreshed = await api('POST', '/auth/refresh-token', {
      body: { refreshToken: ctx.johnSession.refreshToken, targetOrgId: ctx.lakesideId },
    });
    assert.equal(refreshed.status, 200, JSON.stringify(refreshed.body));
    assert.equal(claims(refreshed.body.token).orgId, ctx.lakesideId);

    const out = await api('POST', '/auth/logout', { body: { refreshToken: refreshed.body.refreshToken } });
    assert.equal(out.status, 200);
    const after = await api('POST', '/auth/refresh-token', { body: { refreshToken: refreshed.body.refreshToken } });
    assert.equal(after.status, 401);
  });
});

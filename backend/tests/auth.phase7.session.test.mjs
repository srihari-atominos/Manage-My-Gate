/**
 * Phase 7 — sessions: refresh keeps the community the app is using (membership
 * re-checked), refresh tokens rotate (with a short grace for racing requests),
 * and logout revokes the session even after the access token expired.
 *
 * Run: MONGODB_URI=mongodb://127.0.0.1:27017/mmg_auth_test?replicaSet=rs0 NODE_ENV=test \
 *      node --test tests/auth.phase7.session.test.mjs
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
import Session from '../src/features/session/session.model.js';
import sessionService from '../src/features/session/session.services.js';
import { hashPassword } from '../src/utils/crypto.utils.js';

describe('Phase 7 — sessions', () => {
  let server;
  let baseUrl;
  const t = Date.now();
  let user;
  let orgA;
  let orgB;

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
  const orgOf = (accessToken) => jwt.decode(accessToken)?.orgId;

  before(async () => {
    const uri = config.mongodb?.uri || process.env.MONGODB_URI;
    if (!/auth_test/.test(uri)) throw new Error(`Refusing to run Phase 7 tests against a non-test database: ${uri}`);
    if (mongoose.connection.readyState === 0) await mongoose.connect(uri);
    for (const c of await mongoose.connection.db.collections()) await c.deleteMany({});
    await Promise.all([User.init(), Organization.init(), OrgMembership.init(), Session.init()]);
    process.env.AUTH_IP_RATE_LIMIT = '1000';
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    orgA = await Organization.create({ name: `P7 Alpha ${t}`, organizationType: 'Residential', status: 'Active' });
    orgB = await Organization.create({ name: `P7 Beta ${t}`, organizationType: 'Residential', status: 'Active' });
    user = await User.create({ email: `p7_${t}@p7.test`, username: `p7_${t}`, password: await hashPassword('Sess!0n1'), status: 'Active' });
    await OrgMembership.create({ userId: user._id, orgId: orgA._id, status: 'Active' });
    await OrgMembership.create({ userId: user._id, orgId: orgB._id, status: 'Active' });
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  });

  it('refresh keeps the community the app is using and rotates the refresh token', async () => {
    const refreshToken = await sessionService.createSession(user._id, { deviceName: 'Pixel' });
    const res = await api('POST', '/auth/refresh-token', { body: { refreshToken, targetOrgId: String(orgB._id) } });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(orgOf(res.body.token), String(orgB._id), 'the switched community is kept');
    assert.ok(res.body.refreshToken && res.body.refreshToken !== refreshToken, 'a new refresh token is issued');

    const sessions = await Session.find({ userId: user._id }).lean();
    assert.ok(sessions.some((s) => s.status === 'Rotated'));
    assert.ok(sessions.some((s) => s.status === 'Active' && s.deviceName === 'Pixel'), 'device details carry over');

    const next = await api('POST', '/auth/refresh-token', { body: { refreshToken: res.body.refreshToken, targetOrgId: String(orgB._id) } });
    assert.equal(next.status, 200, 'the new refresh token works');
  });

  it('a racing duplicate refresh within the grace window gets an access token, not a new refresh token', async () => {
    const refreshToken = await sessionService.createSession(user._id, {});
    const first = await api('POST', '/auth/refresh-token', { body: { refreshToken } });
    const second = await api('POST', '/auth/refresh-token', { body: { refreshToken } });
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.ok(second.body.token);
    assert.equal(second.body.refreshToken, undefined);
  });

  it('an old refresh token stops working after the grace window', async () => {
    const refreshToken = await sessionService.createSession(user._id, {});
    await api('POST', '/auth/refresh-token', { body: { refreshToken } });
    await Session.updateMany({ userId: user._id, status: 'Rotated' }, { $set: { rotatedAt: new Date(Date.now() - 60_000) } });
    const late = await api('POST', '/auth/refresh-token', { body: { refreshToken } });
    assert.equal(late.status, 401);
  });

  it('falls back to the default community when the requested membership is gone', async () => {
    const refreshToken = await sessionService.createSession(user._id, {});
    await OrgMembership.updateOne({ userId: user._id, orgId: orgB._id }, { status: 'Rejected' });
    const res = await api('POST', '/auth/refresh-token', { body: { refreshToken, targetOrgId: String(orgB._id) } });
    await OrgMembership.updateOne({ userId: user._id, orgId: orgB._id }, { status: 'Active' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(orgOf(res.body.token), String(orgA._id));
  });

  it('logout revokes the session even without a valid access token', async () => {
    const refreshToken = await sessionService.createSession(user._id, {});
    const res = await api('POST', '/auth/logout', { body: { refreshToken } });
    assert.equal(res.status, 200);
    const again = await api('POST', '/auth/refresh-token', { body: { refreshToken } });
    assert.equal(again.status, 401);
  });
});

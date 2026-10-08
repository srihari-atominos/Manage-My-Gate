/**
 * Phase 8 — password sign-in can be switched off with AUTH_PASSWORD_ENABLED=false;
 * OTP/SSO keep working, and accounts no longer need a password.
 *
 * Run: MONGODB_URI=mongodb://127.0.0.1:27017/mmg_auth_test?replicaSet=rs0 NODE_ENV=test \
 *      node --test tests/auth.phase8.passwordFlag.test.mjs
 */
import { describe, it, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import mongoose from 'mongoose';

import app from '../index.js';
import config from '../src/config/config.js';
import User from '../src/features/user/user.model.js';
import Organization from '../src/features/organization/organization.model.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';
import { hashPassword } from '../src/utils/crypto.utils.js';

describe('Phase 8 — password sign-in flag', () => {
  let server;
  let baseUrl;
  const t = Date.now();
  let withPassword;
  let otpOnly;

  const api = async (method, path, body) => {
    const res = await fetch(`${baseUrl}/api/v1${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try { json = await res.json(); } catch (_) {}
    return { status: res.status, body: json };
  };
  const errorCode = (res) => res.body?.code || res.body?.details?.code;

  before(async () => {
    const uri = config.mongodb?.uri || process.env.MONGODB_URI;
    if (!/auth_test/.test(uri)) throw new Error(`Refusing to run Phase 8 tests against a non-test database: ${uri}`);
    if (mongoose.connection.readyState === 0) await mongoose.connect(uri);
    for (const c of await mongoose.connection.db.collections()) await c.deleteMany({});
    await Promise.all([User.init(), Organization.init(), OrgMembership.init()]);
    process.env.AUTH_IP_RATE_LIMIT = '1000';
    process.env.OTP_IP_RATE_LIMIT = '1000';
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    const org = await Organization.create({ name: `P8 ${t}`, organizationType: 'Residential', status: 'Active' });
    withPassword = await User.create({ email: `pw_${t}@p8.test`, username: `pw_${t}`, password: await hashPassword('Pw0rd!123'), status: 'Active' });
    await OrgMembership.create({ userId: withPassword._id, orgId: org._id, status: 'Active' });
    // An Active account with no password at all must be valid now
    otpOnly = await User.create({ email: `otp_${t}@p8.test`, username: `otp_${t}`, status: 'Active' });
    await OrgMembership.create({ userId: otpOnly._id, orgId: org._id, status: 'Active' });
  });

  afterEach(() => { delete process.env.AUTH_PASSWORD_ENABLED; });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  });

  it('accounts no longer need a password', async () => {
    const fresh = await User.findById(otpOnly._id);
    fresh.name = 'Renamed';
    await fresh.save(); // used to fail validation for Active users without a password
    assert.equal((await User.findById(otpOnly._id)).name, 'Renamed');
  });

  it('password sign-in still works while the flag is on (default)', async () => {
    const res = await api('POST', '/auth/login', { login: withPassword.email, password: 'Pw0rd!123' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
  });

  it('switching the flag off retires every password endpoint', async () => {
    process.env.AUTH_PASSWORD_ENABLED = 'false';
    for (const [path, body] of [
      ['/auth/login', { login: withPassword.email, password: 'Pw0rd!123' }],
      ['/auth/register', { email: `new_${t}@p8.test`, password: 'Pw0rd!123' }],
      ['/auth/forgot-password', { identifier: withPassword.email }],
      ['/auth/reset-password', { identifier: withPassword.email, code: '123456', newPassword: 'N3w!Passw' }],
      ['/auth/setup-account-password', { email: withPassword.email, password: 'N3w!Passw', setupToken: 'x' }],
      ['/auth/accept-invite', { token: 'x', password: 'N3w!Passw' }],
    ]) {
      const res = await api('POST', path, body);
      assert.equal(res.status, 410, `${path}: ${JSON.stringify(res.body)}`);
      assert.equal(errorCode(res), 'PASSWORD_AUTH_DISABLED');
    }
  });

  it('OTP sign-in keeps working with the flag off, including for accounts without a password', async () => {
    process.env.AUTH_PASSWORD_ENABLED = 'false';
    process.env.OTP_DEBUG = 'true';
    const sent = await api('POST', '/auth/login/email-otp', { email: otpOnly.email });
    delete process.env.OTP_DEBUG;
    const res = await api('POST', '/auth/login/email-otp/verify', { email: otpOnly.email, code: sent.body.data.devCode });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok(res.body.data.token);
  });
});

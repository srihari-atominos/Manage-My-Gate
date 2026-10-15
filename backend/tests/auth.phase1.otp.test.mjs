/**
 * Phase 1 — OTP security: expiry, attempt limit, resend cooldown, request limit,
 * single use, no account enumeration, no codes in responses by default.
 *
 * Run: MONGODB_URI=mongodb://127.0.0.1:27017/mmg_auth_test?replicaSet=rs0 NODE_ENV=test \
 *      node --test tests/auth.phase1.otp.test.mjs
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import mongoose from 'mongoose';

import app from '../index.js';
import config from '../src/config/config.js';
import User from '../src/features/user/user.model.js';
import Otp from '../src/features/otp/otp.model.js';
import OtpThrottle from '../src/features/otp/otpThrottle.model.js';
import { OTP_RESEND_COOLDOWN_SECONDS } from '../src/features/otp/otp.services.js';

describe('Phase 1 — OTP security', () => {
  let server;
  let baseUrl;
  const t = Date.now();
  let user;
  let seq = 0;

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

  /** Pretend the last send happened long enough ago to clear the resend cooldown. */
  const skipCooldown = (identifier) =>
    OtpThrottle.updateOne(
      { identifier: identifier.toLowerCase() },
      { $set: { lastSentAt: new Date(Date.now() - (OTP_RESEND_COOLDOWN_SECONDS + 5) * 1000) } }
    );

  const requestEmailCode = async (email) => {
    process.env.OTP_DEBUG = 'true';
    const res = await api('POST', '/auth/login/email-otp', { email });
    process.env.OTP_DEBUG = '';
    return res;
  };

  // Each test gets its own user so throttling from one test never leaks into another
  const freshUser = async (extra = {}) => {
    seq += 1;
    return User.create({
      email: `otp${seq}_${t}@p1.test`,
      username: `otp${seq}_${t}`,
      phone: `+9198${String(t).slice(-6)}${String(seq).padStart(2, '0')}`,
      // The model still requires a password for Active users until Phase 8
      password: 'unused-hash',
      status: 'Active',
      ...extra,
    });
  };

  before(async () => {
    const uri = config.mongodb?.uri || process.env.MONGODB_URI;
    if (!/auth_test/.test(uri)) {
      throw new Error(`Refusing to run Phase 1 tests against a non-test database: ${uri}`);
    }
    if (mongoose.connection.readyState === 0) await mongoose.connect(uri);
    for (const c of await mongoose.connection.db.collections()) {
      await c.deleteMany({});
    }
    await Promise.all([User.init(), Otp.init(), OtpThrottle.init()]);
    // Every request comes from 127.0.0.1; lift the per-IP backstop so the
    // per-identifier limits under test are what's exercised
    process.env.OTP_IP_RATE_LIMIT = '1000';
    process.env.AUTH_IP_RATE_LIMIT = '1000';
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach(async () => {
    user = await freshUser();
  });

  after(async () => {
    delete process.env.OTP_DEBUG;
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  });

  describe('requesting a code', () => {
    it('gives the same answer for unknown and known emails, and sends nothing for unknown', async () => {
      const unknown = await api('POST', '/auth/login/email-otp', { email: `nobody_${t}@p1.test` });
      const known = await api('POST', '/auth/login/email-otp', { email: user.email });
      assert.equal(unknown.status, 200);
      assert.equal(known.status, 200);
      assert.equal(unknown.body.message, known.body.message);
      assert.equal(await Otp.exists({ identifier: `nobody_${t}@p1.test` }), null);
      assert.ok(await Otp.exists({ identifier: user.email }));
    });

    it('gives the same answer for unknown and known phone numbers', async () => {
      const unknown = await api('POST', '/auth/login/phone', { phone: '+919000000001' });
      const known = await api('POST', '/auth/login/phone', { phone: user.phone });
      assert.equal(unknown.status, 200, JSON.stringify(unknown.body));
      assert.equal(known.status, 200, JSON.stringify(known.body));
      assert.equal(unknown.body.message, known.body.message);
    });

    it('never returns the code unless OTP_DEBUG is set', async () => {
      const res = await api('POST', '/auth/login/email-otp', { email: user.email });
      assert.equal(res.status, 200);
      assert.equal(res.body.data?.devCode, undefined);
      assert.doesNotMatch(JSON.stringify(res.body), /\b\d{6}\b/);
    });

    it('enforces the resend cooldown with a retry time', async () => {
      assert.equal((await api('POST', '/auth/login/email-otp', { email: user.email })).status, 200);
      const again = await api('POST', '/auth/login/email-otp', { email: user.email });
      assert.equal(again.status, 429);
      assert.equal(errorCode(again), 'OTP_COOLDOWN');
      assert.ok(again.body.details.retryAfterSeconds > 0 && again.body.details.retryAfterSeconds <= OTP_RESEND_COOLDOWN_SECONDS);
    });

    it('the cooldown also applies to unknown identifiers', async () => {
      const email = `ghost_${t}@p1.test`;
      assert.equal((await api('POST', '/auth/login/email-otp', { email })).status, 200);
      assert.equal(errorCode(await api('POST', '/auth/login/email-otp', { email })), 'OTP_COOLDOWN');
    });

    it('locks the identifier temporarily after too many requests in an hour', async () => {
      for (let i = 0; i < 5; i += 1) {
        const res = await api('POST', '/auth/login/email-otp', { email: user.email });
        assert.equal(res.status, 200, `request ${i + 1}: ${JSON.stringify(res.body)}`);
        await skipCooldown(user.email);
      }
      const sixth = await api('POST', '/auth/login/email-otp', { email: user.email });
      assert.equal(sixth.status, 429);
      assert.equal(errorCode(sixth), 'OTP_LOCKED');
      await skipCooldown(user.email);
      const seventh = await api('POST', '/auth/login/email-otp', { email: user.email });
      assert.equal(errorCode(seventh), 'OTP_LOCKED');
      assert.ok(seventh.body.details.retryAfterSeconds > 60);
    });
  });

  describe('verifying a code', () => {
    it('counts down attempts, then invalidates the code', async () => {
      const { body } = await requestEmailCode(user.email);
      const goodCode = body.data.devCode;
      const wrong = goodCode === '111111' ? '222222' : '111111';

      const first = await api('POST', '/auth/login/email-otp/verify', { email: user.email, code: wrong });
      assert.equal(first.status, 400);
      assert.equal(errorCode(first), 'OTP_INVALID');
      assert.equal(first.body.details.attemptsRemaining, 2);
      assert.match(first.body.message, /2 attempts remaining/);

      const second = await api('POST', '/auth/login/email-otp/verify', { email: user.email, code: wrong });
      assert.equal(second.body.details.attemptsRemaining, 1);
      assert.match(second.body.message, /1 attempt remaining/);

      const third = await api('POST', '/auth/login/email-otp/verify', { email: user.email, code: wrong });
      assert.equal(errorCode(third), 'OTP_EXHAUSTED');

      const late = await api('POST', '/auth/login/email-otp/verify', { email: user.email, code: goodCode });
      assert.equal(late.status, 400, 'the correct code must no longer work after the limit');
    });

    it('a correct code works once only', async () => {
      const { body } = await requestEmailCode(user.email);
      const ok = await api('POST', '/auth/login/email-otp/verify', { email: user.email, code: body.data.devCode });
      assert.equal(ok.status, 200, JSON.stringify(ok.body));
      const reuse = await api('POST', '/auth/login/email-otp/verify', { email: user.email, code: body.data.devCode });
      assert.equal(reuse.status, 400);
      assert.equal(errorCode(reuse), 'OTP_EXPIRED');
    });

    it('rejects an expired code even before the TTL index removes it', async () => {
      const { body } = await requestEmailCode(user.email);
      await Otp.updateOne({ identifier: user.email }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
      const res = await api('POST', '/auth/login/email-otp/verify', { email: user.email, code: body.data.devCode });
      assert.equal(res.status, 400);
      assert.equal(errorCode(res), 'OTP_EXPIRED');
    });

    it('requesting a new code invalidates the previous one', async () => {
      const first = await requestEmailCode(user.email);
      await skipCooldown(user.email);
      const second = await requestEmailCode(user.email);
      if (first.body.data.devCode !== second.body.data.devCode) {
        const old = await api('POST', '/auth/login/email-otp/verify', { email: user.email, code: first.body.data.devCode });
        assert.equal(old.status, 400);
      }
      const current = await api('POST', '/auth/login/email-otp/verify', { email: user.email, code: second.body.data.devCode });
      assert.equal(current.status, 200, JSON.stringify(current.body));
    });

    it('counts failed attempts on flows that verify inside a transaction (phone login)', async () => {
      process.env.OTP_DEBUG = 'true';
      const sent = await api('POST', '/auth/login/phone', { phone: user.phone });
      process.env.OTP_DEBUG = '';
      assert.equal(sent.status, 200, JSON.stringify(sent.body));
      const wrong = sent.body.data.devCode === '111111' ? '222222' : '111111';

      for (const expected of [2, 1]) {
        const res = await api('POST', '/auth/login/phone/verify', { phone: user.phone, code: wrong });
        assert.equal(errorCode(res), 'OTP_INVALID');
        assert.equal(res.body.details.attemptsRemaining, expected);
      }
      const third = await api('POST', '/auth/login/phone/verify', { phone: user.phone, code: wrong });
      assert.equal(errorCode(third), 'OTP_EXHAUSTED');
      const late = await api('POST', '/auth/login/phone/verify', { phone: user.phone, code: sent.body.data.devCode });
      assert.equal(late.status, 400);
    });

    it('password-reset code verification gives the same failure for unknown accounts', async () => {
      const res = await api('POST', '/auth/forgot-password/verify-otp', { identifier: `nobody2_${t}@p1.test`, code: '123456' });
      assert.equal(res.status, 400);
      assert.equal(errorCode(res), 'OTP_EXPIRED');
    });
  });

  describe('account-status lookup', () => {
    it('does not reveal whether an email has an account to anonymous callers', async () => {
      const res = await api('GET', `/auth/check-account-status?email=${encodeURIComponent(user.email)}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.exists, false);
    });
  });
});

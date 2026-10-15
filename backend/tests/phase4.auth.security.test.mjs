import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import http from 'http';

process.env.NODE_ENV = 'production';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/nahom_phase4_test';
process.env.JWT_SECRET = 'a'.repeat(40);
process.env.SESSION_SECRET = 'b'.repeat(40);
process.env.ENCRYPTION_KEY = 'c'.repeat(40);
process.env.JWT_REFRESH_SECRET = 'd'.repeat(40);
process.env.VAULT_ENCRYPTION_KEY = 'e'.repeat(40);

const { setupAccountPasswordRules } = await import('../src/features/auth/auth.validateRules.js');
const { signToken, verifyToken, signRefreshToken, verifyRefreshToken } = await import('../src/utils/jwt.utils.js');
const { isOtpDebugEnabled } = await import('../src/features/otp/otp.services.js');
const { setAuthCookie, setRefreshTokenCookie } = await import('../src/utils/cookie.utils.js');

describe('Phase 4 — Authentication, Tokens, and Password Policy Security', () => {
  it('enforces enterprise password policy on setupAccountPasswordRules', async () => {
    const passwordRule = setupAccountPasswordRules.find((r) => r.builder?.fields?.includes('password'));
    assert.ok(passwordRule, 'setupAccountPasswordRules must have a password validator');

    // Run validator against weak and strong passwords
    const reqWeak1 = { body: { password: 'short' } };
    const reqWeak2 = { body: { password: 'alllowercase1!' } };
    const reqWeak3 = { body: { password: 'ALLUPPERCASE1!' } };
    const reqWeak4 = { body: { password: 'NoSpecialChar1' } };
    const reqStrong = { body: { password: 'Valid!Password123' } };

    const errorsWeak1 = await passwordRule.run(reqWeak1);
    const errorsWeak2 = await passwordRule.run(reqWeak2);
    const errorsWeak3 = await passwordRule.run(reqWeak3);
    const errorsWeak4 = await passwordRule.run(reqWeak4);
    const errorsStrong = await passwordRule.run(reqStrong);

    assert.ok(!errorsWeak1.isEmpty(), 'Must reject short passwords');
    assert.ok(!errorsWeak2.isEmpty(), 'Must reject missing uppercase');
    assert.ok(!errorsWeak3.isEmpty(), 'Must reject missing lowercase');
    assert.ok(!errorsWeak4.isEmpty(), 'Must reject missing special char');
    assert.ok(errorsStrong.isEmpty(), 'Must accept compliant enterprise password');
  });

  it('enforces algorithm pinning (HS256) and rejects unsigned/tampered JWT tokens', () => {
    const payload = { id: '507f1f77bcf86cd799439011', role: 'Resident' };
    const validToken = signToken(payload, '1h');
    assert.ok(validToken);

    const verified = verifyToken(validToken);
    assert.equal(verified.id, payload.id);

    // None algorithm attack attempt
    const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payloadPart = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const noneToken = `${noneHeader}.${payloadPart}.`;

    assert.throws(() => verifyToken(noneToken), /invalid algorithm|jwt/i);

    // Tampered signature attempt
    const tampered = validToken.slice(0, -5) + 'xxxxx';
    assert.throws(() => verifyToken(tampered), /invalid signature/i);
  });

  it('pins HS256 on refresh token sign and verify', () => {
    const payload = { id: '507f1f77bcf86cd799439011', jti: 'random-jti' };
    const validRefreshToken = signRefreshToken(payload);
    assert.ok(validRefreshToken);

    const verified = verifyRefreshToken(validRefreshToken);
    assert.equal(verified.id, payload.id);
    assert.equal(verified.jti, payload.jti);

    // Mismatched secret or tampered token
    assert.throws(() => verifyRefreshToken(validRefreshToken + 'tamper'), /invalid signature/i);
  });

  it('sets HttpOnly on authentication cookies with proper production flags', () => {
    const cookies = {};
    const mockRes = {
      cookie: (name, val, opts) => {
        cookies[name] = { val, opts };
      },
    };

    setAuthCookie(mockRes, 'test-auth-token');
    assert.ok(cookies.token, 'token cookie must be set');
    assert.equal(cookies.token.opts.httpOnly, true, 'token cookie must be httpOnly');
    assert.equal(cookies.token.opts.secure, true, 'production token cookie must be secure');

    setRefreshTokenCookie(mockRes, 'test-refresh-token');
    assert.ok(cookies.refreshToken, 'refreshToken cookie must be set');
    assert.equal(cookies.refreshToken.opts.httpOnly, true, 'refreshToken cookie must be httpOnly');
    assert.equal(cookies.refreshToken.opts.secure, true, 'production refreshToken cookie must be secure');
  });

  it('guarantees OTP debug output is disabled in production', () => {
    const prevEnv = process.env.NODE_ENV;
    const prevDebug = process.env.OTP_DEBUG;
    try {
      process.env.NODE_ENV = 'production';
      process.env.OTP_DEBUG = 'true';
      assert.equal(isOtpDebugEnabled(), false, 'OTP debug must NEVER be enabled in production');

      process.env.NODE_ENV = 'development';
      process.env.OTP_DEBUG = 'false';
      assert.equal(isOtpDebugEnabled(), false, 'OTP debug must be false when OTP_DEBUG is false');

      process.env.OTP_DEBUG = 'true';
      assert.equal(isOtpDebugEnabled(), true, 'OTP debug only allowed in development with explicit flag');
    } finally {
      process.env.NODE_ENV = prevEnv;
      process.env.OTP_DEBUG = prevDebug;
    }
  });

  it('rejects URL query-parameter auth_token in authentication middleware', async () => {
    const { isAuthenticated } = await import('../src/middlewares/auth.middleware.js');
    const req = {
      method: 'GET',
      headers: {},
      cookies: {},
      query: { auth_token: 'leaked-in-url-token' },
    };
    let calledNext = false;
    let nextError = null;
    await isAuthenticated(req, {}, (err) => {
      calledNext = true;
      nextError = err;
    });

    assert.ok(calledNext);
    assert.ok(nextError, 'Must reject auth_token passed in URL query');
    assert.equal(nextError.statusCode, 401);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'production';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/nahom_phase6_test';
process.env.JWT_SECRET = 'a'.repeat(40);
process.env.SESSION_SECRET = 'b'.repeat(40);
process.env.ENCRYPTION_KEY = 'c'.repeat(40);
process.env.JWT_REFRESH_SECRET = 'd'.repeat(40);
process.env.VAULT_ENCRYPTION_KEY = 'e'.repeat(40);
process.env.REQUIRE_REDIS_LOCK = 'true';
process.env.REQUIRE_REDIS_RATE_LIMIT = 'true';
process.env.REQUIRE_REDIS_ADAPTER = 'true';

const { redactSensitive, redactFormat } = await import('../src/utils/logger.utils.js');
const { errorHandler } = await import('../src/middlewares/error.middleware.js');

describe('Phase 6 — Centralized Logging Redaction and Production Error Safety', () => {
  it('redacts sensitive fields in logging metadata and nested payloads', () => {
    const sensitivePayload = {
      user: 'admin',
      password: 'SuperSecretPassword123!',
      token: 'jwt-access-token-123',
      refreshToken: 'refresh-token-456',
      otp: '654321',
      apiKey: 'sk_live_123456789',
      creditCard: '4111222233334444',
      nested: {
        authorization: 'Bearer secret-token',
        secret: 'vault-secret',
        regularField: 'safeValue',
      },
      list: [
        { code: '999888', note: 'test' }
      ]
    };

    const sanitized = redactSensitive(sensitivePayload);

    assert.equal(sanitized.user, 'admin');
    assert.equal(sanitized.password, '[REDACTED]');
    assert.equal(sanitized.token, '[REDACTED]');
    assert.equal(sanitized.refreshToken, '[REDACTED]');
    assert.equal(sanitized.otp, '[REDACTED]');
    assert.equal(sanitized.apiKey, '[REDACTED]');
    assert.equal(sanitized.creditCard, '[REDACTED]');
    assert.equal(sanitized.nested.authorization, '[REDACTED]');
    assert.equal(sanitized.nested.secret, '[REDACTED]');
    assert.equal(sanitized.nested.regularField, 'safeValue');
    assert.equal(sanitized.list[0].code, '[REDACTED]');
    assert.equal(sanitized.list[0].note, 'test');
  });

  it('redacts Bearer tokens embedded in logger message strings', () => {
    const info = {
      message: 'Failed request with header Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz and details',
      level: 'info',
    };

    const formatter = redactFormat();
    const formatted = formatter.transform(info);
    assert.ok(!formatted.message.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz'));
    assert.match(formatted.message, /Bearer \[REDACTED\]/);
  });

  it('sanitizes 500 error responses and suppresses stack traces in production', () => {
    let responseStatus = null;
    let jsonResponse = null;

    const mockRes = {
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => {
            jsonResponse = data;
          },
        };
      },
    };

    const sensitiveInternalError = new Error('Database connection failed at mongodb://admin:secretPass@10.0.0.5:27017/prod');
    sensitiveInternalError.statusCode = 500;
    sensitiveInternalError.stack = 'Error: Database connection failed\n    at internal/db.js:42:15';

    errorHandler(sensitiveInternalError, { id: 'req-corr-123' }, mockRes, () => {});

    assert.equal(responseStatus, 500);
    assert.equal(jsonResponse.success, false);
    assert.equal(jsonResponse.message, 'Internal Server Error', 'Must not leak database URI or internal error string in production');
    assert.equal(jsonResponse.stack, undefined, 'Must not disclose stack trace in production');
  });
});

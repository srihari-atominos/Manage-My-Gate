import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import {
  getApiKey,
  getAuthKey,
  getOtpKey,
  getReportSubmitKey,
  getTestEmailKey,
  createRateLimitStore,
  reportSubmitLimiter,
  testEmailLimiter,
} from '../src/middlewares/rateLimiter.middleware.js';
import config from '../src/config/config.js';

describe('SEC-05.6 — Rate Limiter Identity Trust & Multi-Tenant Abuse Prevention Suite', () => {
  const secretKey = config.jwt.secret || 'default-test-secret';
  const attackerSecret = 'attacker-private-key-12345';
  const validOrgId = '6ad0bb05fd31568b4c2334a1';
  const victimOrgId = '6ad0bb05fd31568b4c2334a2';
  const validUserId = 'user_legitimate_001';
  const victimUserId = 'user_victim_002';
  const sharedClientIp = '198.51.100.42';

  // =========================================================================
  // Requirement 1: Forged JWT cannot select or manipulate tenant bucket
  // =========================================================================
  it('1. Forged JWT with victim tenant ID cannot manipulate or select tenant bucket', () => {
    const forgedToken = jwt.sign(
      { id: 'attacker', orgId: victimOrgId },
      attackerSecret,
      { algorithm: 'HS256' }
    );
    const req = {
      ip: sharedClientIp,
      headers: { authorization: `Bearer ${forgedToken}` },
      // req.user is absent because auth middleware has not verified this forged token
    };

    const key = getApiKey(req);
    assert.equal(
      key,
      `anon:${sharedClientIp}`,
      'Unverified token must strictly yield anon IP key and never select tenant bucket'
    );
    assert.doesNotMatch(
      key,
      new RegExp(victimOrgId),
      'Rate limit key must not contain victim tenant ID from unverified token'
    );
  });

  // =========================================================================
  // Requirement 2: Unverified JWT user ID cannot influence pre-auth key
  // =========================================================================
  it("2. Attacker rotating forged user IDs cannot evade IP rate-limit bucket", () => {
    const tokens = [
      jwt.sign({ id: 'uuid-attacker-1' }, attackerSecret),
      jwt.sign({ id: 'uuid-attacker-2' }, attackerSecret),
      jwt.sign({ id: 'uuid-attacker-3' }, attackerSecret),
    ];

    const keys = tokens.map((t) =>
      getApiKey({
        ip: sharedClientIp,
        headers: { authorization: `Bearer ${t}` },
      })
    );

    // All must produce the identical anonymous IP key
    assert.equal(keys[0], `anon:${sharedClientIp}`);
    assert.equal(keys[1], `anon:${sharedClientIp}`);
    assert.equal(keys[2], `anon:${sharedClientIp}`);
  });

  // =========================================================================
  // Requirement 3: Missing, malformed, expired, or invalid tokens get anon key
  // =========================================================================
  it('3. Missing, malformed, expired, or invalid-signature tokens safely receive pre-auth anon key', () => {
    const expiredToken = jwt.sign(
      { id: 'user_exp', orgId: validOrgId },
      secretKey,
      { expiresIn: '-1h' }
    );

    const testCases = [
      { name: 'Missing Authorization header', req: { ip: sharedClientIp, headers: {} } },
      { name: 'Malformed non-JWT token', req: { ip: sharedClientIp, headers: { authorization: 'Bearer not-a-valid-jwt' } } },
      { name: 'Expired token', req: { ip: sharedClientIp, headers: { authorization: `Bearer ${expiredToken}` } } },
      { name: 'Non-Bearer scheme', req: { ip: sharedClientIp, headers: { authorization: 'Basic dXNlcjpwYXNz' } } },
      { name: 'Empty Bearer token', req: { ip: sharedClientIp, headers: { authorization: 'Bearer ' } } },
    ];

    for (const tc of testCases) {
      const key = getApiKey(tc.req);
      assert.equal(
        key,
        `anon:${sharedClientIp}`,
        `Case '${tc.name}' must safely resolve to anon IP key`
      );
    }
  });

  // =========================================================================
  // Requirement 4: Authenticated requests use identity key only after verified req.user
  // =========================================================================
  it('4. Authenticated requests use identity-specific keys only after trusted req.user is attached', () => {
    // Authenticated request with tenant context
    const reqWithTenant = {
      ip: sharedClientIp,
      user: { id: validUserId, orgId: validOrgId },
      tenant: { orgId: validOrgId },
    };
    const keyTenant = getApiKey(reqWithTenant);
    assert.equal(keyTenant, `tenant:${validOrgId}:user:${validUserId}:${sharedClientIp}`);

    // Authenticated request without explicit tenant context (user-level)
    const reqUserOnly = {
      ip: sharedClientIp,
      user: { id: validUserId },
    };
    const keyUserOnly = getApiKey(reqUserOnly);
    assert.equal(keyUserOnly, `user:${validUserId}:${sharedClientIp}`);
  });

  // =========================================================================
  // Requirement 5: Correctly authenticated tenants and users are strictly partitioned
  // =========================================================================
  it('5. Correctly authenticated users and tenants are partitioned on shared IPs', () => {
    const reqTenantA = {
      ip: sharedClientIp,
      user: { id: 'user_A', orgId: validOrgId },
      tenant: { orgId: validOrgId },
    };
    const reqTenantB = {
      ip: sharedClientIp,
      user: { id: 'user_B', orgId: victimOrgId },
      tenant: { orgId: victimOrgId },
    };

    const keyA = getApiKey(reqTenantA);
    const keyB = getApiKey(reqTenantB);

    assert.equal(keyA, `tenant:${validOrgId}:user:user_A:${sharedClientIp}`);
    assert.equal(keyB, `tenant:${victimOrgId}:user:user_B:${sharedClientIp}`);
    assert.notEqual(keyA, keyB, 'Keys across different tenants must be distinct');
  });

  // =========================================================================
  // Requirement 6: Login and OTP protections against target rotation & crash prevention
  // =========================================================================
  it('6. Login and OTP key generators safely isolate targets and handle non-string inputs', () => {
    // Standard isolation
    const authKey1 = getAuthKey({ ip: sharedClientIp, body: { email: 'admin@alpha.org' } });
    const authKey2 = getAuthKey({ ip: sharedClientIp, body: { email: 'resident@beta.org' } });
    assert.equal(authKey1, `${sharedClientIp}:admin@alpha.org`);
    assert.equal(authKey2, `${sharedClientIp}:resident@beta.org`);
    assert.notEqual(authKey1, authKey2);

    // Non-string payloads must not throw TypeError
    assert.doesNotThrow(() => {
      const nonStringKey = getAuthKey({ ip: sharedClientIp, body: { email: 12345678 } });
      assert.equal(nonStringKey, `${sharedClientIp}:12345678`);
    });

    assert.doesNotThrow(() => {
      const objKey = getAuthKey({ ip: sharedClientIp, body: { email: { $gt: '' } } });
      assert.equal(objKey, `${sharedClientIp}:[object object]`);
    });

    // OTP key generator
    const otpKey1 = getOtpKey({ ip: sharedClientIp, body: { phone: '+1234567890' } });
    const otpKey2 = getOtpKey({ ip: sharedClientIp, body: { phone: 9876543210 } }); // numeric
    assert.equal(otpKey1, `${sharedClientIp}:+1234567890`);
    assert.equal(otpKey2, `${sharedClientIp}:9876543210`);
  });

  // =========================================================================
  // Requirement 7: Redis failure behavior (strict mode vs availability mode)
  // =========================================================================
  it('7. REQUIRE_REDIS_RATE_LIMIT=true strictly enforces fail-closed store when Redis is offline', async () => {
    const originalEnv = process.env.REQUIRE_REDIS_RATE_LIMIT;
    try {
      process.env.REQUIRE_REDIS_RATE_LIMIT = 'true';
      const strictStore = createRateLimitStore('strict_test');
      assert.ok(strictStore, 'Strict store must be returned when REQUIRE_REDIS_RATE_LIMIT=true');

      // Attempting to increment should throw
      await assert.rejects(
        async () => {
          await strictStore.increment('test_key');
        },
        /Redis is required for rate limiting but is not configured or available/,
        'Strict store must reject increment requests when Redis is unavailable'
      );
    } finally {
      if (originalEnv !== undefined) {
        process.env.REQUIRE_REDIS_RATE_LIMIT = originalEnv;
      } else {
        delete process.env.REQUIRE_REDIS_RATE_LIMIT;
      }
    }
  });

  it('7b. Default availability mode falls back to MemoryStore when Redis is unconfigured', () => {
    const originalEnv = process.env.REQUIRE_REDIS_RATE_LIMIT;
    try {
      delete process.env.REQUIRE_REDIS_RATE_LIMIT;
      const defaultStore = createRateLimitStore('avail_test');
      assert.equal(defaultStore, undefined, 'Default availability mode returns undefined to engage MemoryStore');
    } finally {
      if (originalEnv !== undefined) {
        process.env.REQUIRE_REDIS_RATE_LIMIT = originalEnv;
      }
    }
  });

  // =========================================================================
  // Requirement 8: End-to-End Express Integration Test
  // =========================================================================
  it('8. End-to-End: Forged JWT cannot consume authenticated user bucket or bypass anon limit', async () => {
    const app = express();
    app.use(express.json());

    // Simulated trusted authentication middleware
    const authenticate = (req, res, next) => {
      const auth = req.headers.authorization;
      if (auth && auth.startsWith('Bearer ')) {
        const token = auth.split(' ')[1];
        try {
          // Cryptographically verify using the server's trusted secret
          req.user = jwt.verify(token, secretKey, { algorithms: ['HS256'] });
          if (req.user.orgId) {
            req.tenant = { orgId: req.user.orgId };
          }
        } catch {
          // Forged or expired tokens leave req.user unset
        }
      }
      next();
    };

    const limiter = rateLimit({
      windowMs: 60 * 1000,
      max: 2, // 2 requests allowed per window
      keyGenerator: getApiKey,
      validate: { xForwardedForHeader: false, default: true, keyGeneratorIpFallback: false },
    });

    app.get('/api/protected-resource', authenticate, limiter, (req, res) => {
      res.json({
        success: true,
        user: req.user ? req.user.id : 'anon',
        tenant: req.tenant ? req.tenant.orgId : null,
      });
    });

    const server = http.createServer(app);
    await new Promise((res) => server.listen(0, '127.0.0.1', res));
    const port = server.address().port;

    try {
      // 1. Attacker sends 2 requests with a forged token claiming victim's orgId
      const forgedVictimToken = jwt.sign(
        { id: victimUserId, orgId: victimOrgId },
        attackerSecret // signed with attacker key!
      );

      const r1 = await fetch(`http://127.0.0.1:${port}/api/protected-resource`, {
        headers: { Authorization: `Bearer ${forgedVictimToken}` },
      });
      assert.equal(r1.status, 200);
      const data1 = await r1.json();
      assert.equal(data1.user, 'anon', 'Forged token must not be authenticated');

      const r2 = await fetch(`http://127.0.0.1:${port}/api/protected-resource`, {
        headers: { Authorization: `Bearer ${forgedVictimToken}` },
      });
      assert.equal(r2.status, 200);

      // 3rd unauthenticated request from this IP -> MUST get 429 (anon bucket exhausted)
      const r3 = await fetch(`http://127.0.0.1:${port}/api/protected-resource`, {
        headers: { Authorization: `Bearer ${forgedVictimToken}` },
      });
      assert.equal(r3.status, 429, 'Anonymous bucket must be exhausted at max: 2');

      // 2. Legitimate victim with real verified token connects from the SAME IP
      const legitimateVictimToken = jwt.sign(
        { id: victimUserId, orgId: victimOrgId },
        secretKey // signed with server key!
      );

      // Even though anon bucket on 127.0.0.1 is exhausted (429), legitimate victim has their own bucket!
      const legitimateRes = await fetch(`http://127.0.0.1:${port}/api/protected-resource`, {
        headers: { Authorization: `Bearer ${legitimateVictimToken}` },
      });
      assert.equal(
        legitimateRes.status,
        200,
        'Legitimate authenticated user must not be starved by forged/anon traffic on same IP'
      );
      const legitimateData = await legitimateRes.json();
      assert.equal(legitimateData.user, victimUserId);
      assert.equal(legitimateData.tenant, victimOrgId);
    } finally {
      await new Promise((res) => server.close(res));
    }
  });

  // =========================================================================
  // Requirement 9: Report & Email submit limiters defensive scoping
  // =========================================================================
  it('9. reportSubmitLimiter and testEmailLimiter safely scope unauthenticated fallback to IP', () => {
    const unauthReq = { ip: sharedClientIp };
    const authReq = {
      ip: sharedClientIp,
      user: { id: validUserId, orgId: validOrgId },
      tenant: { orgId: validOrgId },
    };

    assert.equal(getReportSubmitKey(unauthReq), `report:anon:${sharedClientIp}`);
    assert.equal(getReportSubmitKey(authReq), `report:${validOrgId}:${validUserId}`);

    assert.equal(getTestEmailKey(unauthReq), `test-email:anon:${sharedClientIp}`);
    assert.equal(getTestEmailKey(authReq), `test-email:${validOrgId}:${validUserId}`);
  });
});

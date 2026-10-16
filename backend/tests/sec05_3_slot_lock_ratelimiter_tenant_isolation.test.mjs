import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import express from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';
import config from '../src/config/config.js';
import connectToDb from '../src/config/db/mongodbConnectToDb.config.js';
import { slotLockStore } from '../src/features/amenityBooking/amenityBooking.socket.js';
import {
  apiLimiter,
  authLimiter,
  otpLimiter,
  nameCheckLimiter,
  reportSubmitLimiter,
  testEmailLimiter,
  getApiKey,
  getAuthKey,
  getOtpKey,
  createRateLimitStore,
} from '../src/middlewares/rateLimiter.middleware.js';
import { messageBroker } from '../src/utils/messageBroker.util.js';

describe('SEC-05.3 — SlotLockStore & Rate Limiter Tenant Isolation Suite', () => {
  const orgA_Id = new mongoose.Types.ObjectId().toString();
  const orgB_Id = new mongoose.Types.ObjectId().toString();
  const amenityA_Id = new mongoose.Types.ObjectId().toString();
  const amenityB_Id = new mongoose.Types.ObjectId().toString();
  const userA_Id = new mongoose.Types.ObjectId().toString();
  const userB_Id = new mongoose.Types.ObjectId().toString();

  before(async () => {
    await connectToDb();
  });

  after(async () => {
    await mongoose.connection.close();
  });

  // =========================================================================
  // PART 1: SlotLockStore Tenant Isolation (SEC-05.1-F03)
  // =========================================================================
  describe('1. SlotLockStore Tenant Isolation & Boundary Verification', () => {
    const date = '2026-11-01';
    const startTime = '10:00';
    const endTime = '11:00';

    it('same tenant and same resource: conflicting lock acquisition is prevented', async () => {
      const lockKey = `${orgA_Id}_${amenityA_Id}_${date}_${startTime}_${endTime}`;
      const dataUser1 = {
        amenityId: amenityA_Id,
        orgId: orgA_Id,
        date,
        startTime,
        endTime,
        userId: userA_Id,
      };
      const dataUser2 = {
        amenityId: amenityA_Id,
        orgId: orgA_Id,
        date,
        startTime,
        endTime,
        userId: userB_Id,
      };

      // 1. User 1 acquires lock
      const acquired1 = await slotLockStore.acquire(lockKey, dataUser1, 60000);
      assert.equal(acquired1, true, 'First user should successfully acquire the lock');

      // 2. User 2 attempts to acquire the exact same slot in Org A
      const acquired2 = await slotLockStore.acquire(lockKey, dataUser2, 60000);
      assert.equal(acquired2, false, 'Conflicting lock for another user must be rejected');

      // Cleanup
      await slotLockStore.release(lockKey, userA_Id, orgA_Id);
    });

    it('different tenants: distinct tenant-owned locks remain completely isolated', async () => {
      const lockKeyA = `${orgA_Id}_${amenityA_Id}_${date}_${startTime}_${endTime}`;
      const lockKeyB = `${orgB_Id}_${amenityB_Id}_${date}_${startTime}_${endTime}`;

      const dataA = { amenityId: amenityA_Id, orgId: orgA_Id, date, startTime, endTime, userId: userA_Id };
      const dataB = { amenityId: amenityB_Id, orgId: orgB_Id, date, startTime, endTime, userId: userB_Id };

      const acquiredA = await slotLockStore.acquire(lockKeyA, dataA, 60000);
      const acquiredB = await slotLockStore.acquire(lockKeyB, dataB, 60000);

      assert.equal(acquiredA, true, 'Org A lock should succeed');
      assert.equal(acquiredB, true, 'Org B lock should succeed independently');

      // Cleanup
      await slotLockStore.release(lockKeyA, userA_Id, orgA_Id);
      await slotLockStore.release(lockKeyB, userB_Id, orgB_Id);
    });

    it('cross-tenant release attempt: user in Org A cannot release lock in Org B', async () => {
      const lockKeyB = `${orgB_Id}_${amenityB_Id}_${date}_${startTime}_${endTime}`;
      const dataB = { amenityId: amenityB_Id, orgId: orgB_Id, date, startTime, endTime, userId: userB_Id };

      await slotLockStore.acquire(lockKeyB, dataB, 60000);

      // Caller from Org A attempts to release Org B's lock (with wrong orgId)
      const releaseAttemptWrongOrg = await slotLockStore.release(lockKeyB, userB_Id, orgA_Id);
      assert.equal(releaseAttemptWrongOrg, false, 'Cross-tenant release must be rejected');

      // Confirm lock is still active in Org B
      const existing = await slotLockStore.get(lockKeyB);
      assert.ok(existing, 'Lock must remain active after unauthorized cross-tenant release attempt');

      // Authorized release
      const releaseSuccess = await slotLockStore.release(lockKeyB, userB_Id, orgB_Id);
      assert.equal(releaseSuccess, true, 'Authorized owner and tenant release must succeed');
    });

    it('cross-tenant renewal attempt: caller cannot renew a lock belonging to another tenant', async () => {
      const lockKey = `${orgA_Id}_${amenityA_Id}_${date}_${startTime}_${endTime}`;
      const dataA = { amenityId: amenityA_Id, orgId: orgA_Id, date, startTime, endTime, userId: userA_Id };

      await slotLockStore.acquire(lockKey, dataA, 30000);

      // Attempt renew with wrong orgId
      const renewWrongOrg = await slotLockStore.renew(lockKey, 60000, userA_Id, orgB_Id);
      assert.equal(renewWrongOrg, false, 'Renewal with mismatched tenant ID must be rejected');

      // Attempt renew with wrong userId
      const renewWrongUser = await slotLockStore.renew(lockKey, 60000, userB_Id, orgA_Id);
      assert.equal(renewWrongUser, false, 'Renewal with mismatched user ID must be rejected');

      // Legitimate renewal
      const renewSuccess = await slotLockStore.renew(lockKey, 60000, userA_Id, orgA_Id);
      assert.equal(renewSuccess, true, 'Legitimate renewal must succeed');

      // Cleanup
      await slotLockStore.release(lockKey, userA_Id, orgA_Id);
    });

    it('acquire requires valid orgId in data to prevent unscoped locks', async () => {
      const lockKey = `unscoped_${amenityA_Id}_${date}`;
      const invalidData = { amenityId: amenityA_Id, date, startTime, endTime, userId: userA_Id }; // missing orgId

      const acquired = await slotLockStore.acquire(lockKey, invalidData, 60000);
      assert.equal(acquired, false, 'Acquisition without orgId must fail closed');
    });

    it('getPublicLocksForAmenity without orgId returns empty array (blocks cross-tenant scan)', async () => {
      // Seed a lock for Org A
      const lockKey = `${orgA_Id}_${amenityA_Id}_${date}_12:00_13:00`;
      await slotLockStore.acquire(lockKey, {
        amenityId: amenityA_Id,
        orgId: orgA_Id,
        date,
        startTime: '12:00',
        endTime: '13:00',
        userId: userA_Id,
      });

      // Query without orgId -> MUST fail closed and return []
      const unconstrainedLocks = await slotLockStore.getPublicLocksForAmenity(amenityA_Id, null);
      assert.deepEqual(unconstrainedLocks, [], 'Query without orgId must return empty array without scanning');

      // Query with correct orgId -> returns sanitized lock
      const orgALocks = await slotLockStore.getPublicLocksForAmenity(amenityA_Id, orgA_Id);
      assert.equal(orgALocks.length, 1);
      assert.equal(orgALocks[0].amenityId, amenityA_Id);
      assert.equal(orgALocks[0].userId, undefined, 'Public locks must never expose private userId');

      // Query with Org B -> returns 0 locks (isolation)
      const orgBLocks = await slotLockStore.getPublicLocksForAmenity(amenityA_Id, orgB_Id);
      assert.equal(orgBLocks.length, 0, 'Foreign tenant query must return 0 locks');

      // Cleanup
      await slotLockStore.release(lockKey, userA_Id, orgA_Id);
    });

    it('REQUIRE_REDIS_LOCK=true refuses local fallback when Redis is offline', async () => {
      const originalEnv = process.env.REQUIRE_REDIS_LOCK;
      process.env.REQUIRE_REDIS_LOCK = 'true';
      try {
        const testKey = `fail_closed_test_${Date.now()}`;
        const acquired = await slotLockStore.acquire(testKey, { orgId: orgA_Id, userId: userA_Id });
        assert.equal(acquired, false, 'Must fail closed when REQUIRE_REDIS_LOCK=true and Redis is unavailable');
      } finally {
        if (originalEnv !== undefined) process.env.REQUIRE_REDIS_LOCK = originalEnv;
        else delete process.env.REQUIRE_REDIS_LOCK;
      }
    });
  });

  // =========================================================================
  // PART 2: Rate Limiter Tenant Isolation (SEC-05.1-F04)
  // =========================================================================
  describe('2. Rate Limiter Tenant Isolation & Abuse Prevention', () => {
    it('getApiKey partitions authenticated users by tenant context', () => {
      const reqTenantA = {
        ip: '203.0.113.10',
        user: { id: 'user123', orgId: orgA_Id },
        tenant: { orgId: orgA_Id },
      };
      const reqTenantB = {
        ip: '203.0.113.10', // Shared public IP (corporate NAT)
        user: { id: 'user456', orgId: orgB_Id },
        tenant: { orgId: orgB_Id },
      };
      const reqAnon = {
        ip: '203.0.113.10',
      };

      const keyA = getApiKey(reqTenantA);
      const keyB = getApiKey(reqTenantB);
      const keyAnon = getApiKey(reqAnon);

      assert.equal(keyA, `tenant:${orgA_Id}:user:user123:203.0.113.10`);
      assert.equal(keyB, `tenant:${orgB_Id}:user:user456:203.0.113.10`);
      assert.equal(keyAnon, 'anon:203.0.113.10');
      assert.notEqual(keyA, keyB, 'Tenant A and Tenant B keys must be strictly isolated on shared IP');
    });

    it('getApiKey refuses unverified Bearer token when req.user is absent and safely falls back to anon IP', () => {
      const token = jwt.sign({ id: 'user789', orgId: orgA_Id }, config.jwt.secret, { algorithm: 'HS256' });
      const req = {
        ip: '198.51.100.5',
        headers: { authorization: `Bearer ${token}` },
      };
      const key = getApiKey(req);
      assert.equal(key, 'anon:198.51.100.5', 'Unverified tokens prior to auth middleware must receive anon IP rate limiting');
    });

    it('forged unauthenticated x-organization-id header does not tamper with getApiKey', () => {
      const reqSpoofed = {
        ip: '198.51.100.5',
        headers: { 'x-organization-id': orgB_Id }, // Malicious untrusted header without token or user
      };
      const key = getApiKey(reqSpoofed);
      assert.equal(key, 'anon:198.51.100.5', 'Unauthenticated request must remain in anon pool despite headers');
    });

    it('getAuthKey isolates failed authentication attempts per target account per IP', () => {
      const reqAccountA = { ip: '198.51.100.1', body: { email: 'AdminA@orgA.com ' } };
      const reqAccountB = { ip: '198.51.100.1', body: { email: 'ResidentB@orgB.com' } };

      const keyA = getAuthKey(reqAccountA);
      const keyB = getAuthKey(reqAccountB);

      assert.equal(keyA, '198.51.100.1:admina@orga.com');
      assert.equal(keyB, '198.51.100.1:residentb@orgb.com');
      assert.notEqual(keyA, keyB, 'Brute force against Account A must not lock out Account B on the same IP');
    });

    it('getOtpKey isolates OTP requests per recipient contact per IP (eliminates noisy-neighbor lockout)', () => {
      const reqPhoneA = { ip: '198.51.100.2', body: { phone: '+1234567890' } };
      const reqPhoneB = { ip: '198.51.100.2', body: { phone: '+9876543210' } };

      const keyA = getOtpKey(reqPhoneA);
      const keyB = getOtpKey(reqPhoneB);

      assert.equal(keyA, '198.51.100.2:+1234567890');
      assert.equal(keyB, '198.51.100.2:+9876543210');
      assert.notEqual(keyA, keyB, 'OTP limit exhaustion for Phone A must never lock out Phone B on shared IP');
    });

    it('express-rate-limit rejects requests exceeding configured ceiling with 429', async () => {
      const app = express();
      app.use(express.json());

      // Create a test limiter with max 2 requests
      const { rateLimit } = await import('express-rate-limit');
      const testLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 2,
        keyGenerator: getOtpKey,
        validate: { xForwardedForHeader: false, default: true, keyGeneratorIpFallback: false },
        message: { success: false, message: 'Too many OTP requests' },
      });

      app.post('/test-otp', testLimiter, (req, res) => res.json({ success: true }));

      const server = http.createServer(app);
      await new Promise((res) => server.listen(0, '127.0.0.1', res));
      const port = server.address().port;

      try {
        // Request 1 for phoneA -> 200
        const res1 = await fetch(`http://127.0.0.1:${port}/test-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: '+111111' }),
        });
        assert.equal(res1.status, 200);

        // Request 2 for phoneA -> 200
        const res2 = await fetch(`http://127.0.0.1:${port}/test-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: '+111111' }),
        });
        assert.equal(res2.status, 200);

        // Request 3 for phoneA -> 429 Too Many Requests
        const res3 = await fetch(`http://127.0.0.1:${port}/test-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: '+111111' }),
        });
        assert.equal(res3.status, 429);

        // Request 1 for phoneB (same IP, different recipient) -> MUST SUCCEED (200)
        const resPhoneB = await fetch(`http://127.0.0.1:${port}/test-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: '+222222' }),
        });
        assert.equal(resPhoneB.status, 200, 'Recipient B must not be throttled by Recipient A on the same IP');
      } finally {
        await new Promise((res) => server.close(res));
      }
    });

    it('cross-tenant API isolation: Tenant A consuming limit does not affect Tenant B on shared IP', async () => {
      const app = express();
      app.use(express.json());
      app.use((req, res, next) => {
        const auth = req.headers.authorization;
        if (auth && auth.startsWith('Bearer ')) {
          try {
            req.user = jwt.verify(auth.split(' ')[1], config.jwt.secret, { algorithms: ['HS256'] });
          } catch {
            // Invalid token remains unauthenticated
          }
        }
        next();
      });

      const { rateLimit } = await import('express-rate-limit');
      const testApiLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 2,
        keyGenerator: getApiKey,
        validate: { xForwardedForHeader: false, default: true, keyGeneratorIpFallback: false },
      });

      app.get('/test-api', testApiLimiter, (req, res) => res.json({ success: true }));

      const server = http.createServer(app);
      await new Promise((res) => server.listen(0, '127.0.0.1', res));
      const port = server.address().port;

      const tokenA = jwt.sign({ id: 'userA', orgId: orgA_Id }, config.jwt.secret, { algorithm: 'HS256' });
      const tokenB = jwt.sign({ id: 'userB', orgId: orgB_Id }, config.jwt.secret, { algorithm: 'HS256' });

      try {
        // Tenant A: 2 requests
        await fetch(`http://127.0.0.1:${port}/test-api`, { headers: { Authorization: `Bearer ${tokenA}` } });
        await fetch(`http://127.0.0.1:${port}/test-api`, { headers: { Authorization: `Bearer ${tokenA}` } });

        // Tenant A: 3rd request -> 429
        const resA3 = await fetch(`http://127.0.0.1:${port}/test-api`, { headers: { Authorization: `Bearer ${tokenA}` } });
        assert.equal(resA3.status, 429, 'Tenant A user should be rate-limited');

        // Tenant B: 1st request from same IP -> 200
        const resB1 = await fetch(`http://127.0.0.1:${port}/test-api`, { headers: { Authorization: `Bearer ${tokenB}` } });
        assert.equal(resB1.status, 200, 'Tenant B user must not be impacted by Tenant A limit on the same IP');
      } finally {
        await new Promise((res) => server.close(res));
      }
    });
  });
});

import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { messageBroker } from '../utils/messageBroker.util.js';
import logger from '../utils/logger.utils.js';

/**
 * Creates a distributed RedisStore when Redis is configured and ready, or falls back to MemoryStore.
 */
export function createRateLimitStore(prefix) {
  if (messageBroker.useRedis && messageBroker.publisher) {
    return new RedisStore({
      prefix: `rl:${prefix}:`,
      sendCommand: async (command, ...args) => {
        if (messageBroker.publisher.status === 'ready') {
          try {
            return await messageBroker.publisher.call(command, ...args);
          } catch (err) {
            logger.warn(`[RateLimiter] Redis command '${command}' failed for prefix '${prefix}': ${err.message}`);
            throw err;
          }
        }
        throw new Error('Redis publisher is not in ready status');
      },
    });
  }
  if (process.env.REQUIRE_REDIS_RATE_LIMIT === 'true') {
    // When strict Redis mode is required, returning a store that throws causes fail-closed behavior
    return {
      init: () => {},
      increment: async () => {
        throw new Error('Redis is required for rate limiting but is not configured or available (strict mode)');
      },
      decrement: async () => {},
      resetKey: async () => {},
    };
  }
  return undefined; // Uses express-rate-limit default MemoryStore
}

/**
 * Derives a tenant-partitioned rate-limit key for generic API routes.
 * Authenticated users are isolated by tenant and user identity so heavy traffic from one
 * tenant cannot starve users in another tenant sharing the same public IP.
 *
 * CRITICAL SECURITY GUARANTEE (SEC-05.6):
 * Rate-limit keys MUST ONLY use tenant and user identity once verified and attached
 * to req.user by trusted authentication middleware (auth.middleware.js).
 * We NEVER decode or trust claims from an unverified Authorization header or raw JWT payload.
 * Unauthenticated requests (or requests prior to auth middleware verification)
 * strictly receive a safe pre-authentication key: `anon:${req.ip}`.
 */
export function getApiKey(req) {
  const userId = req.user?.id || req.user?._id;
  const tenantId = req.tenant?.orgId || req.user?.orgId;
  if (userId && tenantId) {
    return `tenant:${tenantId}:user:${userId}:${req.ip}`;
  }
  if (userId) {
    return `user:${userId}:${req.ip}`;
  }

  return `anon:${req.ip}`;
}

/**
 * Derives an account-isolated key for authentication routes.
 * Isolates failed attempts per target account per IP to prevent noisy-neighbor lockout.
 * Defensively coerces non-string payloads to string to prevent TypeError crashes during key generation.
 */
export function getAuthKey(req) {
  const body = req.body || {};
  const rawTarget = body.email || body.username || body.phone || 'unknown';
  const target = (typeof rawTarget === 'string' ? rawTarget : String(rawTarget || 'unknown')).toLowerCase().trim();
  return `${req.ip}:${target}`;
}

/**
 * Derives a recipient-isolated key for OTP requests (SMS / Email).
 * Prevents NAT/proxy exhaustion attacks from locking out legitimate tenants on shared IPs.
 * Defensively coerces non-string payloads to string to prevent TypeError crashes during key generation.
 */
export function getOtpKey(req) {
  const body = req.body || {};
  const rawTarget = body.email || body.phone || body.mobileNumber || req.user?.email || req.user?.phone || req.ip;
  const target = (typeof rawTarget === 'string' ? rawTarget : String(rawTarget || req.ip)).toLowerCase().trim();
  return `${req.ip}:${target}`;
}

/**
 * Standard rate limiter for generic API routes.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1500 : 50000,
  skip: (req) => {
    if (process.env.DISABLE_RATE_LIMIT === 'true') return true;
    if (
      (process.env.NODE_ENV || 'development') === 'development' &&
      (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1')
    ) {
      return true;
    }
    return false;
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore('api'),
  passOnStoreError: process.env.REQUIRE_REDIS_RATE_LIMIT !== 'true',
  keyGenerator: getApiKey,
  validate: { xForwardedForHeader: false, default: true, keyGeneratorIpFallback: false },
  message: {
    success: false,
    message: 'Too many requests, please try again after 15 minutes',
  },
});

/**
 * Stricter rate limiter for authentication routes (login, register, forgot-password).
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore('auth'),
  passOnStoreError: process.env.REQUIRE_REDIS_RATE_LIMIT !== 'true',
  keyGenerator: getAuthKey,
  validate: { xForwardedForHeader: false, default: true, keyGeneratorIpFallback: false },
  message: {
    success: false,
    message: 'Too many authentication attempts for this account from this IP, please try again after 15 minutes',
  },
});

/**
 * Very strict rate limiter for OTP requests (SMS/Email).
 */
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore('otp'),
  passOnStoreError: process.env.REQUIRE_REDIS_RATE_LIMIT !== 'true',
  keyGenerator: getOtpKey,
  validate: { xForwardedForHeader: false, default: true, keyGeneratorIpFallback: false },
  message: {
    success: false,
    message: 'Too many OTP requests for this recipient from this IP, please try again after 15 minutes',
  },
});

/**
 * Rate limiter for public organization name availability checks.
 */
export const nameCheckLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore('name-check'),
  passOnStoreError: process.env.REQUIRE_REDIS_RATE_LIMIT !== 'true',
  keyGenerator: (req) => `${req.ip}`,
  validate: { xForwardedForHeader: false, default: true, keyGeneratorIpFallback: false },
  message: {
    success: false,
    message: 'Too many community name checks from this IP, please try again after 15 minutes',
  },
});

/**
 * Derives a tenant- and user-partitioned rate-limit key for issue report submissions.
 * Unauthenticated requests safely fall back to anon IP.
 */
export function getReportSubmitKey(req) {
  const userId = req.user?.id || req.user?._id;
  if (userId) {
    const tenantId = req.tenant?.orgId || req.user?.orgId || 'global';
    return `report:${tenantId}:${userId}`;
  }
  return `report:anon:${req.ip}`;
}

/**
 * Derives a tenant- and user-partitioned rate-limit key for admin test emails.
 * Unauthenticated requests safely fall back to anon IP.
 */
export function getTestEmailKey(req) {
  const userId = req.user?.id || req.user?._id;
  if (userId) {
    const tenantId = req.tenant?.orgId || req.user?.orgId || 'global';
    return `test-email:${tenantId}:${userId}`;
  }
  return `test-email:anon:${req.ip}`;
}

/**
 * Per-user limiter for issue report submissions.
 */
export const reportSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore('report'),
  passOnStoreError: process.env.REQUIRE_REDIS_RATE_LIMIT !== 'true',
  keyGenerator: getReportSubmitKey,
  validate: { xForwardedForHeader: false, default: true, keyGeneratorIpFallback: false },
  message: {
    success: false,
    message: 'Too many issue reports submitted. Please try again after 15 minutes.',
  },
});

/**
 * Per-user limiter for admin test emails.
 */
export const testEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore('test-email'),
  passOnStoreError: process.env.REQUIRE_REDIS_RATE_LIMIT !== 'true',
  keyGenerator: getTestEmailKey,
  validate: { xForwardedForHeader: false, default: true, keyGeneratorIpFallback: false },
  message: {
    success: false,
    message: 'Too many test emails requested. Please try again after 15 minutes.',
  },
});

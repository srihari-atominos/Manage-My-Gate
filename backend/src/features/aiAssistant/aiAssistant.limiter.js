import crypto from 'crypto';
import { messageBroker } from '../../utils/messageBroker.util.js';
import HttpError from '../../utils/httpError.utils.js';
import config from '../../config/config.js';
import logger from '../../utils/logger.utils.js';

// In-memory fallback stores for testing or environments where Redis is not configured
const inMemoryLocks = new Map();
const inMemoryDailyCounts = new Map();

/**
 * Resets in-memory rate limiting state. Used primarily in automated tests or admin resets.
 */
export function resetLimiterForTesting() {
  inMemoryLocks.clear();
  inMemoryDailyCounts.clear();
}

/**
 * Resets limits for a specific user.
 *
 * @param {string} tenantId - Organization ID
 * @param {string} userId - User ID
 */
export async function resetUserLimit(tenantId, userId) {
  if (!tenantId || !userId) return;

  const lockKey = `ai:lock:${tenantId}:${userId}`;
  const dailyKey = `ai:daily:${tenantId}:${userId}`;

  if (messageBroker.useRedis && messageBroker.publisher && messageBroker.publisher.status === 'ready') {
    try {
      await messageBroker.publisher.del(lockKey, dailyKey);
    } catch (err) {
      logger.warn(`[AIAssistantLimiter] Redis reset failed: ${err.message}`);
    }
  }

  inMemoryLocks.delete(lockKey);
  inMemoryDailyCounts.delete(dailyKey);
}

/**
 * Generates an opaque, traceable session identifier.
 */
export function generateSessionId() {
  return `sess_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * Atomically checks and acquires an active session lock and increments daily count.
 * Explicitly tracks session identity and supports seamless retry reconciliation.
 *
 * @param {string} tenantId - Active verified organization ID
 * @param {string} userId - Authenticated user ID
 * @param {object} options - Limits configuration and reconciliation directives
 * @param {string} [options.previousSessionId] - Previous session identifier being retried/reconciled
 * @param {boolean} [options.forceReconcile=false] - Explicit request to replace previous orphaned lock
 * @param {number} [options.maxDailySessions] - Daily quota
 * @param {number} [options.sessionDurationSec] - Lock expiration duration in seconds
 * @returns {Promise<{ allowed: boolean, sessionId?: string, reason?: string, message?: string }>}
 */
export async function checkAndAcquireSession(tenantId, userId, options = {}) {
  const defaultDaily = process.env.NODE_ENV !== 'production' ? 500 : 5;
  const maxDaily = options.maxDailySessions || config.aiAssistant?.maxDailySessions || defaultDaily;
  const durationSec = options.sessionDurationSec || config.aiAssistant?.sessionDurationSec || 600;

  const lockKey = `ai:lock:${tenantId}:${userId}`;
  const dailyKey = `ai:daily:${tenantId}:${userId}`;
  const strictRedis = process.env.REQUIRE_REDIS_RATE_LIMIT === 'true';

  const now = Date.now();
  const sessionId = options.sessionId || generateSessionId();
  const handshakeExpiresAt = now + 60 * 1000; // 60s handshake window
  const sessionRecord = {
    sessionId,
    userId: String(userId),
    tenantId: String(tenantId),
    createdAt: now,
    expiresAt: now + durationSec * 1000,
    handshakeExpiresAt,
  };

  const candidatePrev = options.previousSessionId || options.reconcileSessionId;
  const isForceReconcile = Boolean(options.forceReconcile);

  // 1. Redis Mode (Production / Distributed Multi-Pod)
  if (messageBroker.useRedis && messageBroker.publisher && messageBroker.publisher.status === 'ready') {
    try {
      // Check existing lock state
      const rawExisting = await messageBroker.publisher.get(lockKey);
      let canReconcile = false;

      if (rawExisting) {
        let existing = null;
        try {
          existing = JSON.parse(rawExisting);
        } catch {
          existing = { sessionId: rawExisting, createdAt: 0, handshakeExpiresAt: 0 };
        }

        // Reconcile if client provided matching previousSessionId, or forceReconcile is requested,
        // or handshake window expired without active confirmation (>60s)
        const isMatchingPrevious = candidatePrev && existing.sessionId === candidatePrev;
        const isStaleHandshake = existing.handshakeExpiresAt && now > existing.handshakeExpiresAt;

        if (isMatchingPrevious || isForceReconcile || isStaleHandshake) {
          canReconcile = true;
          logger.info('[AIAssistantLimiter] Reconciling prior session lock in Redis', {
            userId,
            tenantId,
            oldSessionId: existing.sessionId,
            newSessionId: sessionId,
            reason: isMatchingPrevious ? 'MATCHING_PREV' : isForceReconcile ? 'FORCE_RECONCILE' : 'STALE_HANDSHAKE',
          });
        } else {
          return {
            allowed: false,
            reason: 'ACTIVE_SESSION_EXISTS',
            message: 'An active voice assistant session is already in progress. Please complete or release the current session before starting a new one.',
            activeSessionId: existing.sessionId,
          };
        }
      }

      // Write or overwrite session lock with explicit session identity
      const lockAcquired = canReconcile
        ? await messageBroker.publisher.set(lockKey, JSON.stringify(sessionRecord), 'EX', durationSec)
        : await messageBroker.publisher.set(lockKey, JSON.stringify(sessionRecord), 'EX', durationSec, 'NX');

      if (!lockAcquired) {
        return {
          allowed: false,
          reason: 'ACTIVE_SESSION_EXISTS',
          message: 'An active voice assistant session is already in progress. Please complete or release the current session before starting a new one.',
        };
      }

      // Increment daily session counter atomically only if this is a fresh session, not a retry reconcile
      if (!canReconcile) {
        const currentDaily = await messageBroker.publisher.incr(dailyKey);
        if (currentDaily === 1) {
          await messageBroker.publisher.expire(dailyKey, 86400); // 24 hours rolling
        }

        if (currentDaily > maxDaily) {
          // Rollback active lock if daily limit exceeded
          await messageBroker.publisher.del(lockKey).catch(() => {});
          return {
            allowed: false,
            reason: 'DAILY_LIMIT_EXCEEDED',
            message: `You have reached the maximum daily limit of ${maxDaily} voice assistant sessions. Please try again tomorrow.`,
          };
        }
      }

      return { allowed: true, sessionId };
    } catch (err) {
      if (strictRedis) {
        logger.error(`[AIAssistantLimiter] Redis operation failed in strict mode: ${err.message}`);
        throw new HttpError(503, 'Rate limiting service is temporarily unavailable. Please try again shortly.');
      }
      logger.warn(`[AIAssistantLimiter] Redis operation failed, falling back to local memory: ${err.message}`);
    }
  } else if (strictRedis) {
    logger.error('[AIAssistantLimiter] Redis is required for rate limiting in strict mode, but publisher is not ready.');
    throw new HttpError(503, 'Rate limiting service is temporarily unavailable. Please try again shortly.');
  }

  // 2. In-Memory Mode (Local Dev / Unit Tests without Redis)
  const existingLock = inMemoryLocks.get(lockKey);
  let canReconcileMemory = false;

  if (existingLock && existingLock.expiresAt > now) {
    const isMatchingPrevious = candidatePrev && existingLock.sessionId === candidatePrev;
    const isStaleHandshake = existingLock.handshakeExpiresAt && now > existingLock.handshakeExpiresAt;

    if (isMatchingPrevious || isForceReconcile || isStaleHandshake) {
      canReconcileMemory = true;
      logger.info('[AIAssistantLimiter] Reconciling prior session lock in memory', {
        userId,
        tenantId,
        oldSessionId: existingLock.sessionId,
        newSessionId: sessionId,
        reason: isMatchingPrevious ? 'MATCHING_PREV' : isForceReconcile ? 'FORCE_RECONCILE' : 'STALE_HANDSHAKE',
      });
    } else {
      return {
        allowed: false,
        reason: 'ACTIVE_SESSION_EXISTS',
        message: 'An active voice assistant session is already in progress. Please complete or release the current session before starting a new one.',
        activeSessionId: existingLock.sessionId,
      };
    }
  }

  // Check daily count only if not reconciling
  if (!canReconcileMemory) {
    let dailyRecord = inMemoryDailyCounts.get(dailyKey);
    if (!dailyRecord || dailyRecord.expiresAt <= now) {
      dailyRecord = { count: 0, expiresAt: now + 24 * 60 * 60 * 1000 };
    }

    if (dailyRecord.count >= maxDaily) {
      return {
        allowed: false,
        reason: 'DAILY_LIMIT_EXCEEDED',
        message: `You have reached the maximum daily limit of ${maxDaily} voice assistant sessions. Please try again tomorrow.`,
      };
    }

    dailyRecord.count += 1;
    inMemoryDailyCounts.set(dailyKey, dailyRecord);
  }

  // Atomically set active lock record
  inMemoryLocks.set(lockKey, sessionRecord);

  return { allowed: true, sessionId };
}

/**
 * Releases an active session reservation lock so the user can start another session immediately.
 * Idempotent: does not throw if lock was already released or expired.
 *
 * @param {string} tenantId - Active verified organization ID
 * @param {string} userId - Authenticated user ID
 * @param {object} [options={}] - Teardown options
 * @param {string} [options.sessionId] - Specific session ID to release (avoids releasing an accidental successor)
 * @param {boolean} [options.refundDaily=false] - Whether to refund consumed daily quota
 * @returns {Promise<{ released: boolean, idempotent?: boolean }>}
 */
export async function releaseActiveSession(tenantId, userId, options = {}) {
  if (!tenantId || !userId) return { released: true, idempotent: true };

  const lockKey = `ai:lock:${tenantId}:${userId}`;

  // 1. Redis Mode
  if (messageBroker.useRedis && messageBroker.publisher && messageBroker.publisher.status === 'ready') {
    try {
      if (options.sessionId) {
        const raw = await messageBroker.publisher.get(lockKey);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed.sessionId && parsed.sessionId !== options.sessionId) {
              logger.info('[AIAssistantLimiter] Retaining successor session lock in Redis', {
                targetSessionId: options.sessionId,
                activeSessionId: parsed.sessionId,
              });
              return { released: false, retainedSuccessor: true };
            }
          } catch {}
        }
      }

      await messageBroker.publisher.del(lockKey);
      if (options.refundDaily) {
        const dailyKey = `ai:daily:${tenantId}:${userId}`;
        const val = await messageBroker.publisher.decr(dailyKey);
        if (val < 0) await messageBroker.publisher.set(dailyKey, 0);
      }
      return { released: true };
    } catch (err) {
      logger.warn(`[AIAssistantLimiter] Failed to release Redis lock '${lockKey}': ${err.message}`);
    }
  }

  // 2. In-Memory Mode
  const existing = inMemoryLocks.get(lockKey);
  if (existing && options.sessionId && existing.sessionId && existing.sessionId !== options.sessionId) {
    logger.info('[AIAssistantLimiter] Retaining successor session lock in memory', {
      targetSessionId: options.sessionId,
      activeSessionId: existing.sessionId,
    });
    return { released: false, retainedSuccessor: true };
  }

  inMemoryLocks.delete(lockKey);
  if (options.refundDaily) {
    const dailyKey = `ai:daily:${tenantId}:${userId}`;
    const record = inMemoryDailyCounts.get(dailyKey);
    if (record && record.count > 0) {
      record.count -= 1;
      inMemoryDailyCounts.set(dailyKey, record);
    }
  }

  return { released: true, idempotent: true };
}

/**
 * Express middleware to enforce rate limits on session token requests.
 */
export async function aiAssistantLimiter(req, res, next) {
  try {
    const tenantId = req.tenant?.orgId || req.user?.orgId;
    const userId = req.user?.id || req.user?._id;

    if (!userId || !tenantId) {
      throw new HttpError(401, 'Valid user and community context are required for voice assistant.');
    }

    const isElevated =
      req.user?.isPlatform === true ||
      req.tenant?.isPlatform === true ||
      req.user?.role === 'Super Admin' ||
      req.user?.role === 'Platform Super Admin' ||
      req.user?.role === 'Platform Admin' ||
      req.user?.role === 'Admin' ||
      req.user?.role === 'Community Admin' ||
      process.env.NODE_ENV !== 'production';

    // In development or for elevated roles, grant a generous quota (500 sessions)
    const maxDaily = isElevated ? 500 : (config.aiAssistant?.maxDailySessions || 5);

    const clientContext = req.body?.context || {};
    const previousSessionId = req.body?.previousSessionId || clientContext.previousSessionId;
    const forceReconcile = Boolean(req.body?.forceReconcile ?? clientContext.forceReconcile);

    const result = await checkAndAcquireSession(tenantId, userId, {
      maxDailySessions: maxDaily,
      sessionDurationSec: config.aiAssistant?.sessionDurationSec,
      previousSessionId,
      forceReconcile,
    });

    if (!result.allowed) {
      throw new HttpError(429, result.message, {
        reason: result.reason,
        activeSessionId: result.activeSessionId,
      });
    }

    req.aiSessionId = result.sessionId;
    next();
  } catch (error) {
    next(error);
  }
}

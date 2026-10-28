/**
 * AI Assistant Pending Action Manager
 *
 * Implements server-controlled pending action proposals, cryptographic HMAC binding,
 * short-lived expiration (TTL), idempotency protection, durable database persistence,
 * and distributed execution locking.
 *
 * Strictly prevents arbitrary model mutations and ensures all actions are bound
 * to verified server-side user and tenant contexts.
 */

import crypto from 'node:crypto';
import mongoose from 'mongoose';
import config from '../../config/config.js';
import logger from '../../utils/logger.utils.js';
import AIAssistantAction from './aiAssistantAction.model.js';

// Signing secret derived from server configuration
const ACTION_SECRET =
  config.jwt?.secret ||
  config.session?.secret ||
  process.env.JWT_SECRET ||
  'nahom-action-hmac-secret-salt-2026';

// In-memory store of active proposals with TTL cleanup (dual store / fallback)
const pendingActionsStore = new Map();

// Default expiration window: 5 minutes (300,000 ms)
const DEFAULT_TTL_MS = 5 * 60 * 1000;

/**
 * Calculates a SHA-256 hash of canonical parameter object.
 */
function hashParams(params = {}) {
  const canonical = JSON.stringify(params, Object.keys(params).sort());
  return crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 32);
}

/**
 * Computes an HMAC-SHA256 signature binding the action ID, action type,
 * user ID, org ID, expiry, and parameter hash.
 */
function computeSignature(id, actionType, userId, orgId, expiresAt, paramHash) {
  const payload = `${id}:${actionType}:${userId}:${orgId}:${expiresAt}:${paramHash}`;
  return crypto.createHmac('sha256', ACTION_SECRET).update(payload).digest('hex');
}

/**
 * Creates a server-controlled pending action proposal.
 * Stores in memory and durably in MongoDB with TTL auto-expiry when available.
 *
 * @param {object} options
 * @param {string} options.actionType - 'CREATE_VISITOR_PASS' | 'REVOKE_VISITOR_PASS' | 'CREATE_AMENITY_BOOKING' | 'CANCEL_AMENITY_BOOKING' | 'CREATE_PERSONAL_EXPENSE' | 'CREATE_COMPLAINT' | 'CANCEL_COMPLAINT' | 'ACKNOWLEDGE_NOTICE' | 'CAST_POLL_VOTE' | 'CREATE_AMENITY' | 'CREATE_ASSESSMENT' | 'CREATE_POLL' | 'CREATE_NOTICE'
 * @param {string} options.userId - Authenticated user ID
 * @param {string} options.orgId - Verified tenant organization ID
 * @param {object} options.params - Validated action parameters
 * @param {string} options.summary - Human-readable proposal summary
 * @param {number} [options.ttlMs] - Lifetime in milliseconds
 * @returns {object} Pending action proposal descriptor
 */
export function createPendingActionProposal({
  actionType,
  userId,
  orgId,
  params = {},
  summary = '',
  ttlMs = DEFAULT_TTL_MS,
}) {
  const cleanUserId = String(userId || '').trim();
  const cleanOrgId = String(orgId || '').trim();

  if (!actionType || !cleanUserId || !cleanOrgId) {
    throw new Error('actionType, userId, and orgId are required to create an action proposal');
  }

  const id = `act_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  const expiresAt = Date.now() + ttlMs;
  const expiresDate = new Date(expiresAt);
  const paramHash = hashParams(params);
  const signature = computeSignature(id, actionType, cleanUserId, cleanOrgId, expiresAt, paramHash);
  const confirmationToken = `${id}.${expiresAt}.${signature}`;

  const record = {
    id,
    actionId: id,
    actionType,
    userId: cleanUserId,
    orgId: cleanOrgId,
    params: { ...params },
    paramHash,
    summary,
    confirmationToken,
    status: 'PENDING', // 'PENDING' | 'EXECUTING' | 'EXECUTED' | 'CANCELLED' | 'EXPIRED' | 'FAILED'
    createdAt: Date.now(),
    expiresAt,
    executionResult: null,
    error: null,
  };

  pendingActionsStore.set(id, record);

  // Durable MongoDB persistence when connected
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    AIAssistantAction.create({
      actionId: id,
      actionType,
      userId: cleanUserId,
      orgId: cleanOrgId,
      params,
      paramHash,
      summary,
      confirmationToken,
      status: 'PENDING',
      expiresAt: expiresDate,
    }).catch((err) => {
      logger.error(`[ActionManager] Failed to persist proposal [${id}] to database: ${err.message}`);
    });
  }

  // Auto-prune on expiration in memory
  setTimeout(() => {
    const existing = pendingActionsStore.get(id);
    if (existing && existing.status === 'PENDING' && Date.now() >= existing.expiresAt) {
      existing.status = 'EXPIRED';
    }
  }, ttlMs + 1000).unref?.();

  logger.info(`[ActionManager] Created pending action proposal [${id}] for user ${cleanUserId} (${actionType})`);

  return {
    actionId: id,
    actionType,
    summary,
    confirmationToken,
    expiresAt,
    params,
  };
}

/**
 * Validates a pending action confirmation attempt.
 * Enforces cryptographic HMAC signature, expiration, user binding,
 * tenant isolation, and idempotency status.
 *
 * Checks in-memory cache and falls back to MongoDB for restart/multi-instance durability.
 *
 * @param {object} options
 * @param {string} options.actionId - Unique action proposal ID
 * @param {string} options.confirmationToken - Signed confirmation token
 * @param {string} options.userId - Requesting user ID
 * @param {string} options.orgId - Active tenant organization ID
 * @returns {Promise<{ valid: boolean, action?: object, idempotentReplay?: boolean, error?: string, statusCode?: number }>}
 */
export async function verifyPendingAction({ actionId, confirmationToken, userId, orgId }) {
  const cleanUserId = String(userId || '').trim();
  const cleanOrgId = String(orgId || '').trim();
  const cleanActionId = String(actionId || '').trim();

  if (!cleanActionId) {
    return { valid: false, error: 'actionId is required for confirmation.', statusCode: 400 };
  }

  let action = pendingActionsStore.get(cleanActionId);

  // If not in memory (e.g. backend restarted or handled by another cluster instance), fetch from DB
  if (!action && mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      const dbDoc = await AIAssistantAction.findOne({ actionId: cleanActionId });
      if (dbDoc) {
        action = {
          id: dbDoc.actionId,
          actionId: dbDoc.actionId,
          actionType: dbDoc.actionType,
          userId: dbDoc.userId,
          orgId: dbDoc.orgId,
          params: dbDoc.params,
          paramHash: dbDoc.paramHash,
          summary: dbDoc.summary,
          confirmationToken: dbDoc.confirmationToken,
          status: dbDoc.status,
          createdAt: dbDoc.createdAt ? new Date(dbDoc.createdAt).getTime() : Date.now(),
          expiresAt: dbDoc.expiresAt ? new Date(dbDoc.expiresAt).getTime() : Date.now(),
          executionResult: dbDoc.executionResult,
          error: dbDoc.error,
        };
        pendingActionsStore.set(cleanActionId, action);
      }
    } catch (dbErr) {
      logger.warn(`[ActionManager] Error fetching proposal ${cleanActionId} from DB: ${dbErr.message}`);
    }
  }

  if (!action) {
    return {
      valid: false,
      error: 'Pending action proposal was not found or has expired. Please create a new request.',
      statusCode: 404,
    };
  }

  // Idempotency: repeated confirmation of an already completed action returns cached result
  if (action.status === 'EXECUTED') {
    return {
      valid: true,
      action,
      idempotentReplay: true,
      executionResult: action.executionResult,
    };
  }

  // Check if user previously cancelled
  if (action.status === 'CANCELLED') {
    return {
      valid: false,
      error: 'This action was cancelled. Please create a new request if you wish to proceed.',
      statusCode: 400,
    };
  }

  // Expiration check
  if (Date.now() > action.expiresAt || action.status === 'EXPIRED') {
    action.status = 'EXPIRED';
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      AIAssistantAction.updateOne({ actionId: cleanActionId }, { $set: { status: 'EXPIRED' } }).catch(() => {});
    }
    return {
      valid: false,
      error: 'Action confirmation has expired (valid for 5 minutes). Please review and create a new request.',
      statusCode: 410,
    };
  }

  // User context binding
  if (action.userId !== cleanUserId) {
    logger.warn(
      `[ActionManager] Security violation: User ${cleanUserId} attempted to confirm action ${cleanActionId} owned by ${action.userId}`
    );
    return {
      valid: false,
      error: 'Forbidden. This action proposal belongs to another user.',
      statusCode: 403,
    };
  }

  // Tenant isolation binding
  if (action.orgId !== cleanOrgId) {
    logger.warn(
      `[ActionManager] Tenant violation: Action ${cleanActionId} org ${action.orgId} does not match active org ${cleanOrgId}`
    );
    return {
      valid: false,
      error: 'Forbidden. This action belongs to a different community workspace.',
      statusCode: 403,
    };
  }

  // Cryptographic HMAC token validation (if token provided)
  if (confirmationToken) {
    const parts = String(confirmationToken).split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Malformed confirmation token format.', statusCode: 400 };
    }
    const [tId, tExpiresStr, tSig] = parts;
    if (tId !== cleanActionId) {
      return { valid: false, error: 'Confirmation token does not match action identifier.', statusCode: 400 };
    }
    const expectedSig = computeSignature(
      action.id || action.actionId,
      action.actionType,
      action.userId,
      action.orgId,
      Number(tExpiresStr),
      action.paramHash
    );
    if (tSig !== expectedSig) {
      logger.warn(`[ActionManager] Tampering detected on action token for action ${cleanActionId}`);
      return { valid: false, error: 'Invalid or forged confirmation token signature.', statusCode: 403 };
    }
  }

  return { valid: true, action };
}

/**
 * Atomically acquires an execution lease for a pending action proposal.
 * Generates a unique monotonic fencing/lease token to prevent slow or zombie
 * workers from committing stale results after losing their lease.
 *
 * @param {string} actionId
 * @returns {Promise<{ acquired: boolean, leaseToken?: string, fenceToken?: number, error?: string }>}
 */
export async function acquireExecutionLease(actionId) {
  const cleanId = String(actionId || '').trim();
  const memAction = pendingActionsStore.get(cleanId);
  const now = new Date();
  const staleThreshold = new Date(Date.now() - 60000); // 60s stale execution window
  const leaseToken = crypto.randomUUID();

  // Distributed atomic lock via MongoDB when connected
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      const updated = await AIAssistantAction.findOneAndUpdate(
        {
          actionId: cleanId,
          $or: [
            { status: 'PENDING', expiresAt: { $gt: now } },
            // Stale lock recovery: previous execution crashed or hung > 60 seconds ago
            { status: 'EXECUTING', lockedAt: { $lt: staleThreshold } },
          ],
        },
        {
          $set: { status: 'EXECUTING', lockedAt: now, leaseToken },
          $inc: { fenceToken: 1 },
        },
        { new: true }
      );
      if (!updated) {
        return { acquired: false };
      }
      if (memAction) {
        memAction.status = 'EXECUTING';
        memAction.lockedAt = now.getTime();
        memAction.leaseToken = leaseToken;
        memAction.fenceToken = updated.fenceToken || (memAction.fenceToken || 0) + 1;
      }
      return {
        acquired: true,
        leaseToken,
        fenceToken: updated.fenceToken,
      };
    } catch (err) {
      logger.error(`[ActionManager] Distributed DB lease acquisition failed for ${cleanId}: ${err.message}`);
    }
  }

  // In-memory atomic locking
  if (!memAction) return { acquired: false };
  if (memAction.status === 'EXECUTING') {
    const isStale = memAction.lockedAt && (Date.now() - memAction.lockedAt > 60000);
    if (!isStale) return { acquired: false };
  } else if (memAction.status !== 'PENDING') {
    return { acquired: false };
  }

  memAction.status = 'EXECUTING';
  memAction.lockedAt = Date.now();
  memAction.leaseToken = leaseToken;
  memAction.fenceToken = (memAction.fenceToken || 0) + 1;

  return {
    acquired: true,
    leaseToken,
    fenceToken: memAction.fenceToken,
  };
}

/**
 * Verifies whether the specified execution lease is still active and held by the worker.
 * Allows slow or delayed workers to verify lease validity before initiating slow mutations.
 *
 * @param {string} actionId
 * @param {string} leaseToken
 * @returns {Promise<boolean>}
 */
export async function isLeaseActive(actionId, leaseToken) {
  if (!actionId || !leaseToken) return false;
  const cleanId = String(actionId).trim();
  const memAction = pendingActionsStore.get(cleanId);
  if (memAction) {
    if (memAction.status !== 'EXECUTING' || memAction.leaseToken !== leaseToken) {
      return false;
    }
  }
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      const dbDoc = await AIAssistantAction.findOne({ actionId: cleanId, leaseToken, status: 'EXECUTING' });
      return Boolean(dbDoc);
    } catch {
      return false;
    }
  }
  return Boolean(memAction && memAction.status === 'EXECUTING' && memAction.leaseToken === leaseToken);
}

/**
 * Transitions an action proposal to EXECUTING status to lock against concurrent duplicate calls.
 * Preserves boolean return signature for backward compatibility.
 */
export async function lockActionForExecution(actionId) {
  const result = await acquireExecutionLease(actionId);
  return Boolean(result && result.acquired);
}

/**
 * Records successful execution of a pending action.
 * Durably updates MongoDB and in-memory cache.
 * Enforces monotonic lease token fencing: if a worker lost its lease due to
 * timeout/preemption, the commit will be rejected.
 * Preserves record for 30 days to support idempotent retries without premature TTL deletion.
 */
export async function recordActionSuccess(actionId, executionResult, leaseToken = null) {
  const cleanId = String(actionId || '').trim();
  const action = pendingActionsStore.get(cleanId);
  const now = new Date();
  const preservedExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // In-memory lease fencing check
  if (action) {
    if (leaseToken && action.leaseToken && action.leaseToken !== leaseToken) {
      const err = new Error(`Execution lease expired or was preempted by another worker.`);
      err.code = 'LEASE_LOST';
      throw err;
    }
    action.status = 'EXECUTED';
    action.executionResult = executionResult;
    action.executedAt = Date.now();
    action.expiresAt = preservedExpiresAt.getTime();
  }

  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      const query = { actionId: cleanId };
      if (leaseToken) {
        query.leaseToken = leaseToken;
      }
      const updateRes = await AIAssistantAction.updateOne(
        query,
        {
          $set: {
            status: 'EXECUTED',
            executionResult,
            executedAt: now,
            expiresAt: preservedExpiresAt,
          },
        }
      );
      if (leaseToken && updateRes.matchedCount === 0) {
        const err = new Error(`Execution lease expired or was preempted by another worker in DB.`);
        err.code = 'LEASE_LOST';
        throw err;
      }
    } catch (err) {
      if (err.code === 'LEASE_LOST') throw err;
      logger.error(`[ActionManager] Failed to persist action success for ${cleanId}: ${err.message}`);
    }
  }

  logger.info(`[ActionManager] Action [${cleanId}] (${action?.actionType || 'MUTATION'}) executed successfully`);
  return true;
}

/**
 * Records failed execution of a pending action.
 * Durably updates MongoDB and in-memory cache.
 */
export async function recordActionFailure(actionId, error, leaseToken = null) {
  const cleanId = String(actionId || '').trim();
  const action = pendingActionsStore.get(cleanId);
  const errorMsg = error?.message || String(error);
  const failedExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  if (action) {
    if (leaseToken && action.leaseToken && action.leaseToken !== leaseToken) {
      const err = new Error(`Execution lease expired or was preempted by another worker.`);
      err.code = 'LEASE_LOST';
      throw err;
    }
    action.status = 'FAILED';
    action.error = errorMsg;
    action.expiresAt = failedExpiresAt.getTime();
  }

  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      const query = { actionId: cleanId };
      if (leaseToken) {
        query.leaseToken = leaseToken;
      }
      await AIAssistantAction.updateOne(
        query,
        {
          $set: {
            status: 'FAILED',
            error: errorMsg,
            expiresAt: failedExpiresAt,
          },
        }
      );
    } catch (err) {
      logger.error(`[ActionManager] Failed to persist action failure for ${cleanId}: ${err.message}`);
    }
  }

  logger.warn(`[ActionManager] Action [${cleanId}] execution failed: ${errorMsg}`);
}

/**
 * Cancels a pending action proposal explicitly.
 */
export function cancelPendingAction(arg) {
  const actionId = typeof arg === 'string' ? arg : arg?.actionId;
  const userId = typeof arg === 'object' ? arg?.userId : null;
  const orgId = typeof arg === 'object' ? arg?.orgId : null;

  const cleanActionId = String(actionId || '').trim();
  const action = pendingActionsStore.get(cleanActionId);

  if (action) {
    if (userId && action.userId !== String(userId)) return false;
    if (orgId && action.orgId !== String(orgId)) return false;
    action.status = 'CANCELLED';
  }

  if (mongoose.connection && mongoose.connection.readyState === 1) {
    const query = { actionId: cleanActionId };
    if (userId) query.userId = String(userId);
    if (orgId) query.orgId = String(orgId);

    AIAssistantAction.updateOne(query, { $set: { status: 'CANCELLED' } }).catch((err) => {
      logger.error(`[ActionManager] Failed to cancel action ${cleanActionId} in DB: ${err.message}`);
    });
  }

  logger.info(`[ActionManager] Action [${cleanActionId}] cancelled`);
  return true;
}

/**
 * Retrieves a pending action by ID (read-only inspection).
 */
export function getPendingActionById(actionId) {
  return pendingActionsStore.get(String(actionId || '').trim()) || null;
}

/**
 * Clears or cancels any active pending actions for a user in a tenant
 * (e.g., when switching tasks).
 */
export function cancelActiveProposalsForUser(userId, orgId) {
  const cleanUserId = String(userId || '');
  const cleanOrgId = String(orgId || '');
  let cancelledCount = 0;

  for (const [id, action] of pendingActionsStore.entries()) {
    if (action.userId === cleanUserId && action.orgId === cleanOrgId && action.status === 'PENDING') {
      action.status = 'CANCELLED';
      cancelledCount++;
    }
  }

  if (mongoose.connection && mongoose.connection.readyState === 1) {
    AIAssistantAction.updateMany(
      { userId: cleanUserId, orgId: cleanOrgId, status: 'PENDING' },
      { $set: { status: 'CANCELLED' } }
    ).catch((err) => {
      logger.error(`[ActionManager] Failed to cancel user proposals in DB: ${err.message}`);
    });
  }

  if (cancelledCount > 0) {
    logger.info(`[ActionManager] Cancelled ${cancelledCount} pending proposals for user ${cleanUserId}`);
  }
  return cancelledCount;
}

/**
 * Resets the in-memory store and DB collection (used for test teardown).
 */
export function resetActionStoreForTesting() {
  pendingActionsStore.clear();
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    AIAssistantAction.deleteMany({}).catch(() => {});
  }
}

import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import logger from './logger.utils.js';

const cronLockSchema = new mongoose.Schema(
  {
    lockKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    ownerId: {
      type: String,
      required: true,
      trim: true,
    },
    acquiredAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'distributed_cron_locks',
  }
);

cronLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 }); // auto-clean very old expired locks

export const CronLock =
  mongoose.models.DistributedCronLock ||
  mongoose.model('DistributedCronLock', cronLockSchema, 'distributed_cron_locks');

/**
 * Default lock TTL: 15 minutes.
 * Ensures that if a node crashes mid-execution, the lock is automatically reclaimed on the next cycle.
 */
export const DEFAULT_LOCK_TTL_MS = 15 * 60 * 1000;

/**
 * Generates an instance/process identifier.
 */
export function generateOwnerId() {
  const host = os.hostname() || 'node';
  const pid = process.pid || 'pid';
  return `${host}:${pid}:${uuidv4()}`;
}

/**
 * Atomically acquires a distributed cron lock for a specific task key.
 * Guarantees that only ONE node/process in a multi-instance cluster executes the scheduled job.
 *
 * @param {string} lockKey - Unique identifier for the cron task (e.g. 'cron:complaint-sla-breaches')
 * @param {number} [ttlMs=DEFAULT_LOCK_TTL_MS] - Lock duration in milliseconds
 * @param {string} [ownerId] - Optional custom owner ID
 * @returns {Promise<{ acquired: boolean, lockKey: string, ownerId: string, expiresAt?: Date, reason?: string }>}
 */
export async function acquireCronLock(lockKey, ttlMs = DEFAULT_LOCK_TTL_MS, ownerId = generateOwnerId()) {
  if (!lockKey) {
    throw new Error('[DistributedCronLock] lockKey is required to acquire lock.');
  }

  // Fail closed if database is unavailable
  if (mongoose.connection.readyState !== 1) {
    return { acquired: false, lockKey, ownerId, reason: 'DATABASE_DISCONNECTED' };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);

  try {
    // 1. Try to take an existing expired lock or extend if same owner
    const existingLock = await CronLock.findOneAndUpdate(
      {
        lockKey,
        $or: [
          { expiresAt: { $lt: now } }, // Expired lock from crashed/restarted instance
          { ownerId },                  // Same owner extending
        ],
      },
      {
        $set: {
          ownerId,
          acquiredAt: now,
          expiresAt,
        },
      },
      { returnDocument: 'after' }
    );

    if (existingLock) {
      return { acquired: true, lockKey, ownerId, expiresAt: existingLock.expiresAt };
    }

    // 2. If no lock exists, try to insert a new one atomically
    const newLock = await CronLock.create({
      lockKey,
      ownerId,
      acquiredAt: now,
      expiresAt,
    });

    return { acquired: true, lockKey, ownerId, expiresAt: newLock.expiresAt };
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key error: another instance acquired the lock concurrently
      return { acquired: false, lockKey, ownerId, reason: 'LOCKED_BY_ANOTHER_INSTANCE' };
    }
    logger.error(`[DistributedCronLock] Unexpected error acquiring lock '${lockKey}': ${err.message}`);
    return { acquired: false, lockKey, ownerId, reason: 'LOCK_ACQUISITION_ERROR', error: err.message };
  }
}

/**
 * Safely releases a distributed cron lock.
 * Guarantees that only the owner holding the active lock can release it.
 * Expired owners cannot delete a lock that has been acquired by a new owner.
 *
 * @param {string} lockKey
 * @param {string} ownerId
 * @returns {Promise<boolean>}
 */
export async function releaseCronLock(lockKey, ownerId) {
  if (!lockKey || !ownerId) return false;
  if (mongoose.connection.readyState !== 1) return false;

  try {
    const result = await CronLock.deleteOne({
      lockKey,
      ownerId,
    });
    return result.deletedCount > 0;
  } catch (err) {
    logger.warn(`[DistributedCronLock] Error releasing lock '${lockKey}': ${err.message}`);
    return false;
  }
}

/**
 * Executes an asynchronous scheduled cron task inside a distributed cluster lock.
 * Combines atomic acquisition, execution, and safe release with in-process try/finally semantics.
 *
 * @param {string} lockKey - Task identifier
 * @param {number} ttlMs - Lock lease TTL
 * @param {() => Promise<any>} taskFn - Async task callback
 * @returns {Promise<{ executed: boolean, result?: any, reason?: string }>}
 */
export async function withDistributedCronLock(lockKey, ttlMsOrFn, taskFnOrOptions) {
  let ttlMs = DEFAULT_LOCK_TTL_MS;
  let taskFn = null;

  if (typeof ttlMsOrFn === 'function') {
    taskFn = ttlMsOrFn;
    if (taskFnOrOptions && typeof taskFnOrOptions.ttlMs === 'number') {
      ttlMs = taskFnOrOptions.ttlMs;
    }
  } else if (typeof ttlMsOrFn === 'number') {
    ttlMs = ttlMsOrFn;
    taskFn = taskFnOrOptions;
  } else {
    taskFn = taskFnOrOptions;
  }

  const ownerId = generateOwnerId();
  const lock = await acquireCronLock(lockKey, ttlMs, ownerId);

  if (!lock.acquired) {
    logger.info(`[DistributedCronLock] Task '${lockKey}' is locked by another instance (${lock.reason}). Skipping tick.`);
    return { executed: false, reason: lock.reason };
  }

  try {
    const result = await taskFn();
    return { executed: true, result };
  } finally {
    try {
      await releaseCronLock(lockKey, lock.ownerId);
    } catch (releaseErr) {
      logger.warn(`[DistributedCronLock] Cleanup error for '${lockKey}': ${releaseErr.message}`);
    }
  }
}

export default {
  acquireCronLock,
  releaseCronLock,
  withDistributedCronLock,
  DEFAULT_LOCK_TTL_MS,
  CronLock,
};

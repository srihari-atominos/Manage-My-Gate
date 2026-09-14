import mongoose from 'mongoose';
import logger from '../../../../utils/logger.utils.js';

/**
 * Validates whether a provided session is a genuine MongoDB ClientSession capable
 * of running transactions (i.e. not mock, not ended, has inTransaction function).
 * Returns the session if valid, or null.
 *
 * @param {any} session
 * @returns {mongoose.ClientSession|null}
 */
export function getValidSession(session) {
  if (
    session &&
    typeof session === 'object' &&
    typeof session.inTransaction === 'function' &&
    !session._isMockSession &&
    !session.hasEnded
  ) {
    return session;
  }
  return null;
}

/**
 * Executes a callback within a MongoDB multi-document transaction session.
 * Gracefully handles standalone fallback sessions in development environments.
 *
 * @template T
 * @param {(session: mongoose.ClientSession|undefined) => Promise<T>} fn - Transaction callback
 * @returns {Promise<T>}
 */
export async function withTransaction(fn) {
  const clientTopology = mongoose.connection.client?.topology?.description?.type || mongoose.connection.topology?.description?.type;
  const isReplicaSet = clientTopology && clientTopology !== 'Single' && clientTopology !== 'Unknown';

  if (!isReplicaSet) {
    return await fn(undefined);
  }

  let session;
  try {
    session = await mongoose.startSession();
  } catch (err) {
    logger.warn('Mongoose startSession failed; executing fallback without transaction session:', {
      error: err.message,
    });
    return await fn(undefined);
  }

  let isTransactionActive = false;

  try {
    session.startTransaction();
    isTransactionActive = true;
  } catch (err) {
    logger.warn('Mongoose transaction not supported in environment; continuing with fallback session:', {
      error: err.message,
    });
    try { await session.endSession(); } catch {}
    return await fn(undefined);
  }

  try {
    const result = await fn(session);
    if (isTransactionActive) {
      await session.commitTransaction();
    }
    return result;
  } catch (error) {
    if (isTransactionActive) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        logger.error('Failed to abort transaction:', { error: abortErr.message });
      }
    }
    if (error.message && error.message.includes('Transaction numbers are only allowed on a replica set member')) {
      logger.warn('Transactions not supported on standalone MongoDB; executing without transaction session.');
      return await fn(undefined);
    }
    throw error;
  } finally {
    if (session && typeof session.endSession === 'function') {
      try {
        await session.endSession();
      } catch (_) {}
    }
  }
}

/**
 * Wraps withTransaction in an exponential backoff retry loop with random jitter
 * for transient MongoDB write conflicts and transaction errors.
 *
 * @template T
 * @param {(session: mongoose.ClientSession) => Promise<T>} fn
 * @param {number} [maxRetries=3]
 * @returns {Promise<T>}
 */
export async function withTransactionRetry(fn, maxRetries = 3) {
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      return await withTransaction(fn);
    } catch (error) {
      const isTransient =
        error.errorLabels?.includes('TransientTransactionError') ||
        error.code === 112 || // WriteConflict
        error.name === 'WriteConflict' ||
        error.message?.includes('WriteConflict') ||
        error.message?.includes('snapshot');

      if (isTransient && attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 50 + Math.floor(Math.random() * 50);
        logger.warn(`Transient transaction error encountered (attempt ${attempt}/${maxRetries}). Retrying in ${backoffMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }
      throw error;
    }
  }
}

export default {
  getValidSession,
  withTransaction,
  withTransactionRetry,
};

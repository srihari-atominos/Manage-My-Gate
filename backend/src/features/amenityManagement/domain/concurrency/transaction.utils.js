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
  if (mongoose.connection.readyState === 0) {
    return fn(undefined);
  }

  let session = null;
  try {
    session = await mongoose.startSession();
  } catch (err) {
    logger.warn('Failed to start mongoose session; continuing without session:', {
      error: err.message,
    });
    return fn(undefined);
  }

  const isMock = Boolean(!session || session._isMockSession || typeof session.inTransaction !== 'function');
  let isTransactionActive = false;

  if (!isMock) {
    try {
      session.startTransaction();
      isTransactionActive = true;
    } catch (err) {
      logger.warn('Mongoose transaction not supported in environment; continuing with fallback session:', {
        error: err.message,
      });
    }
  }

  const activeSession = isTransactionActive ? session : undefined;

  try {
    const result = await fn(activeSession);
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

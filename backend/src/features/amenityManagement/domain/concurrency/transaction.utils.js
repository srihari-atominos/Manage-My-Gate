import mongoose from 'mongoose';
import logger from '../../../../utils/logger.utils.js';

/**
 * Executes a callback within a MongoDB multi-document transaction session.
 * Gracefully handles standalone fallback sessions in development environments.
 *
 * @template T
 * @param {(session: mongoose.ClientSession) => Promise<T>} fn - Transaction callback
 * @returns {Promise<T>}
 */
export async function withTransaction(fn) {
  const session = await mongoose.startSession();
  let isTransactionActive = false;

  try {
    session.startTransaction();
    isTransactionActive = true;
  } catch (err) {
    logger.warn('Mongoose transaction not supported in environment; continuing with fallback session:', {
      error: err.message,
    });
  }

  const activeSession = isTransactionActive ? session : (session._isMockSession ? session : undefined);

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
    session.endSession();
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
  withTransaction,
  withTransactionRetry,
};

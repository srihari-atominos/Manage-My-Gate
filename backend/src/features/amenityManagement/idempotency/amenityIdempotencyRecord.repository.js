import mongoose from 'mongoose';
import AmenityIdempotencyRecord from './amenityIdempotencyRecord.model.js';
import { getValidSession } from '../domain/concurrency/transaction.utils.js';

export class AmenityIdempotencyRecordRepository {
  /**
   * Finds an existing idempotency record by deterministic ID.
   * @param {string} recordId - IDEMP:<orgId>:<idempotencyKey>
   * @param {mongoose.ClientSession} [session]
   */
  async findById(recordId, session) {
    return AmenityIdempotencyRecord.findById(recordId).session(getValidSession(session));
  }

  /**
   * Attempts to insert a new PROCESSING record.
   * If record already exists, returns null.
   * @param {Object} data
   * @param {mongoose.ClientSession} [session]
   */
  async createProcessingRecord(data, session) {
    try {
      const validSession = getValidSession(session);
      const options = validSession ? { session: validSession } : {};
      const [doc] = await AmenityIdempotencyRecord.create([data], options);
      return doc;
    } catch (err) {
      if (err.code === 11000) {
        return null; // Key already registered
      }
      throw err;
    }
  }

  /**
   * Adopts a stale PROCESSING record older than staleThresholdMs (default 30 seconds).
   * Atomically resets startedAt and updates requestHash.
   * @param {Object} params
   * @param {string} params.recordId
   * @param {string} params.requestHash
   * @param {number} [params.staleThresholdMs=30000]
   * @param {mongoose.ClientSession} [session]
   */
  async adoptStaleRecord({ recordId, requestHash, staleThresholdMs = 30000 }, session) {
    const cutoff = new Date(Date.now() - staleThresholdMs);
    return AmenityIdempotencyRecord.findOneAndUpdate(
      {
        _id: recordId,
        status: 'PROCESSING',
        startedAt: { $lte: cutoff },
      },
      {
        $set: {
          startedAt: new Date(),
          requestHash,
        },
      },
      { session: getValidSession(session), returnDocument: 'after' }
    );
  }

  /**
   * Marks idempotency record as COMPLETED and records the final response.
   * @param {Object} params
   * @param {string} params.recordId
   * @param {number} params.responseStatusCode
   * @param {any} params.responseBody
   * @param {mongoose.ClientSession} [session]
   */
  async markCompleted({ recordId, responseStatusCode, responseBody }, session) {
    return AmenityIdempotencyRecord.findOneAndUpdate(
      { _id: recordId },
      {
        $set: {
          status: 'COMPLETED',
          responseStatusCode,
          responseBody,
        },
      },
      { session: getValidSession(session), returnDocument: 'after' }
    );
  }

  /**
   * Marks idempotency record as FAILED.
   * @param {Object} params
   * @param {string} params.recordId
   * @param {number} params.responseStatusCode
   * @param {any} params.responseBody
   * @param {mongoose.ClientSession} [session]
   */
  async markFailed({ recordId, responseStatusCode, responseBody }, session) {
    return AmenityIdempotencyRecord.findOneAndUpdate(
      { _id: recordId },
      {
        $set: {
          status: 'FAILED',
          responseStatusCode,
          responseBody,
        },
      },
      { session: getValidSession(session), returnDocument: 'after' }
    );
  }
}

export const amenityIdempotencyRecordRepository = new AmenityIdempotencyRecordRepository();
export default amenityIdempotencyRecordRepository;

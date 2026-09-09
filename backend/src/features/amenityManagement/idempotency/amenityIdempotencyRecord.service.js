import crypto from 'crypto';
import HttpError from '../../../utils/httpError.utils.js';
import amenityIdempotencyRecordRepository from './amenityIdempotencyRecord.repository.js';

export class AmenityIdempotencyService {
  /**
   * Computes SHA-256 hash of a JSON payload.
   * @param {any} payload
   * @returns {string}
   */
  computeRequestHash(payload) {
    const str = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  /**
   * Executes a business handler with idempotency protection.
   *
   * @template T
   * @param {Object} params
   * @param {string|import('mongoose').Types.ObjectId} params.orgId
   * @param {string} params.idempotencyKey
   * @param {any} params.requestPayload
   * @param {number} [params.ttlHours=24]
   * @param {() => Promise<{ statusCode?: number, body: T }>} handler
   * @returns {Promise<{ isReplay: boolean, statusCode: number, body: T }>}
   */
  async executeWithIdempotency({ orgId, idempotencyKey, requestPayload, ttlHours = 24 }, handler) {
    if (!idempotencyKey) {
      // If no idempotency key is passed, execute handler directly
      const result = await handler();
      return {
        isReplay: false,
        statusCode: result.statusCode || 200,
        body: result.body !== undefined ? result.body : result,
      };
    }

    const recordId = `IDEMP:${orgId}:${idempotencyKey}`;
    const requestHash = this.computeRequestHash(requestPayload);
    const expireAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    // 1. Check if record already exists
    let existing = await amenityIdempotencyRecordRepository.findById(recordId);

    if (existing) {
      // Conflict check: Same key but different request payload
      if (existing.requestHash !== requestHash) {
        throw new HttpError(
          409,
          'Idempotency key payload mismatch: key cannot be reused for a different request body'
        );
      }

      // If already COMPLETED, replay cached response
      if (existing.status === 'COMPLETED') {
        return {
          isReplay: true,
          statusCode: existing.responseStatusCode || 200,
          body: existing.responseBody,
        };
      }

      // If currently PROCESSING, check if stale (> 30s)
      if (existing.status === 'PROCESSING') {
        const staleThresholdMs = 30000;
        const adopted = await amenityIdempotencyRecordRepository.adoptStaleRecord({
          recordId,
          requestHash,
          staleThresholdMs,
        });

        if (!adopted) {
          throw new HttpError(
            409,
            'Transaction currently in flight: a request with this idempotency key is already processing'
          );
        }
        existing = adopted; // Adopted stale record, proceed with execution
      }
    } else {
      // 2. Insert new PROCESSING record
      const created = await amenityIdempotencyRecordRepository.createProcessingRecord({
        _id: recordId,
        orgId,
        idempotencyKey,
        requestHash,
        status: 'PROCESSING',
        startedAt: new Date(),
        expireAt,
      });

      if (!created) {
        // Concurrent insert race: fetch existing
        existing = await amenityIdempotencyRecordRepository.findById(recordId);
        if (existing?.status === 'COMPLETED' && existing.requestHash === requestHash) {
          return {
            isReplay: true,
            statusCode: existing.responseStatusCode || 200,
            body: existing.responseBody,
          };
        }
        throw new HttpError(409, 'Concurrent request detected with identical idempotency key');
      }
    }

    // 3. Execute business logic
    try {
      const result = await handler();
      const statusCode = result.statusCode || 200;
      const responseBody = result.body !== undefined ? result.body : result;

      // Mark COMPLETED
      await amenityIdempotencyRecordRepository.markCompleted({
        recordId,
        responseStatusCode: statusCode,
        responseBody,
      });

      return {
        isReplay: false,
        statusCode,
        body: responseBody,
      };
    } catch (error) {
      // Mark FAILED
      await amenityIdempotencyRecordRepository.markFailed({
        recordId,
        responseStatusCode: error.statusCode || 500,
        responseBody: { message: error.message },
      });
      throw error;
    }
  }
}

export const amenityIdempotencyService = new AmenityIdempotencyService();
export default amenityIdempotencyService;

import mongoose from 'mongoose';
import AmenityOutboxEvent from './amenityOutboxEvent.model.js';
import { getValidSession } from '../domain/concurrency/transaction.utils.js';

export class AmenityOutboxEventRepository {
  /**
   * Persists an outbox event document within the calling MongoDB session.
   * Ensures atomic commit alongside the domain entity write.
   * @param {Object} eventData
   * @param {mongoose.ClientSession} [session]
   */
  async createEvent(eventData, session) {
    const validSession = getValidSession(session);
    const options = validSession ? { session: validSession } : {};
    const [doc] = await AmenityOutboxEvent.create([eventData], options);
    return doc;
  }

  /**
   * Finds pending events ready for dispatch.
   * @param {number} [limit=50]
   */
  async findPendingEvents(limit = 50) {
    return AmenityOutboxEvent.find({
      status: 'PENDING',
      nextRetryAt: { $lte: new Date() },
    })
      .sort({ createdAt: 1 })
      .limit(limit);
  }

  /**
   * Updates outbox event status after dispatch or failure.
   * @param {string|mongoose.Types.ObjectId} eventId
   * @param {Object} updateData
   * @param {mongoose.ClientSession} [session]
   */
  async updateStatus(eventId, updateData, session) {
    return AmenityOutboxEvent.findByIdAndUpdate(
      eventId,
      { $set: updateData },
      { session: getValidSession(session), returnDocument: 'after' }
    );
  }

  /**
   * Finds an existing refund event by payment reference or hold ID for idempotency checks.
   * @param {Object} params
   * @param {string|mongoose.Types.ObjectId} params.orgId
   * @param {string} [params.paymentReference]
   * @param {string} [params.holdId]
   * @param {mongoose.ClientSession} [session]
   */
  async findExistingRefundEvent({ orgId, paymentReference, holdId }, session) {
    const conditions = [];
    if (paymentReference) {
      conditions.push({ 'payload.paymentReference': paymentReference });
    }
    if (holdId) {
      conditions.push({ 'payload.holdId': holdId.toString() });
    }
    if (conditions.length === 0) return null;

    return AmenityOutboxEvent.findOne({
      orgId,
      eventType: 'REFUND_DISPATCH_REQUIRED',
      $or: conditions,
    }).session(getValidSession(session));
  }

  /**
   * Atomically claims the next eligible PENDING outbox event.
   * Changes status to PROCESSING and timestamps lease start.
   * Multi-instance safe: exactly one worker wins the atomic update.
   * @param {Date} [now=new Date()]
   * @returns {Promise<any>}
   */
  async claimNextPendingEvent(now = new Date()) {
    return AmenityOutboxEvent.findOneAndUpdate(
      {
        status: 'PENDING',
        nextRetryAt: { $lte: now },
      },
      {
        $set: {
          status: 'PROCESSING',
          processingStartedAt: now,
        },
      },
      {
        sort: { nextRetryAt: 1, createdAt: 1 },
        returnDocument: 'after',
      }
    );
  }

  /**
   * State-guarded transition from PROCESSING to PUBLISHED.
   * Prevents accidental publishing of dead-letter or cancelled events.
   * @param {string|mongoose.Types.ObjectId} eventId
   * @param {mongoose.ClientSession} [session]
   */
  async markPublished(eventId, session) {
    return AmenityOutboxEvent.findOneAndUpdate(
      {
        _id: eventId,
        status: 'PROCESSING',
      },
      {
        $set: {
          status: 'PUBLISHED',
          errorMessage: null,
          processingStartedAt: null,
        },
      },
      {
        session: getValidSession(session),
        returnDocument: 'after',
      }
    );
  }

  /**
   * State-guarded transition on failed dispatch.
   * Transitions either to PENDING (with backoff delay) or DEAD_LETTER.
   * @param {Object} params
   * @param {string|mongoose.Types.ObjectId} params.eventId
   * @param {string} params.errorMessage
   * @param {number} params.retryCount
   * @param {Date} params.nextRetryAt
   * @param {boolean} params.isDeadLetter
   * @param {mongoose.ClientSession} [session]
   */
  async markFailed({ eventId, errorMessage, retryCount, nextRetryAt, isDeadLetter }, session) {
    const nextStatus = isDeadLetter ? 'DEAD_LETTER' : 'PENDING';
    return AmenityOutboxEvent.findOneAndUpdate(
      {
        _id: eventId,
        status: 'PROCESSING',
      },
      {
        $set: {
          status: nextStatus,
          retryCount,
          nextRetryAt,
          errorMessage,
          processingStartedAt: null,
        },
      },
      {
        session: getValidSession(session),
        returnDocument: 'after',
      }
    );
  }

  /**
   * Atomically recovers events stuck in PROCESSING past the lease timeout threshold.
   * Increments retry count to avoid infinite crash loops.
   * @param {number} [timeoutMs=300000] 5 minutes default
   * @param {Date} [now=new Date()]
   * @returns {Promise<Array<any>>}
   */
  async recoverStaleProcessingEvents(timeoutMs = 300000, now = new Date()) {
    const cutoff = new Date(now.getTime() - timeoutMs);
    const staleEvents = await AmenityOutboxEvent.find({
      status: 'PROCESSING',
      processingStartedAt: { $lt: cutoff },
    }).limit(50);

    const recovered = [];
    for (const event of staleEvents) {
      const newRetryCount = (event.retryCount || 0) + 1;
      const isDeadLetter = newRetryCount >= (event.maxRetries || 5);
      const nextStatus = isDeadLetter ? 'DEAD_LETTER' : 'PENDING';

      const doc = await AmenityOutboxEvent.findOneAndUpdate(
        {
          _id: event._id,
          status: 'PROCESSING',
          processingStartedAt: { $lt: cutoff },
        },
        {
          $set: {
            status: nextStatus,
            retryCount: newRetryCount,
            errorMessage: 'Processing lease expired; recovered from stale processing state',
            processingStartedAt: null,
          },
        },
        { returnDocument: 'after' }
      );
      if (doc) recovered.push(doc);
    }
    return recovered;
  }
}

export const amenityOutboxEventRepository = new AmenityOutboxEventRepository();
export default amenityOutboxEventRepository;

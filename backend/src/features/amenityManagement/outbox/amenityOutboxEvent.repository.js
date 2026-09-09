import mongoose from 'mongoose';
import AmenityOutboxEvent from './amenityOutboxEvent.model.js';

export class AmenityOutboxEventRepository {
  /**
   * Persists an outbox event document within the calling MongoDB session.
   * Ensures atomic commit alongside the domain entity write.
   * @param {Object} eventData
   * @param {mongoose.ClientSession} [session]
   */
  async createEvent(eventData, session) {
    const [doc] = await AmenityOutboxEvent.create([eventData], { session });
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
      { session: session || null, returnDocument: 'after' }
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
    }).session(session || null);
  }
}

export const amenityOutboxEventRepository = new AmenityOutboxEventRepository();
export default amenityOutboxEventRepository;

import mongoose from 'mongoose';
import AmenityAllocationLedger from './amenityAllocationLedger.model.js';
import { getValidSession } from '../domain/concurrency/transaction.utils.js';

export class AmenityAllocationLedgerRepository {
  /**
   * Creates a new allocation ledger line item.
   * @param {Object} entryData
   * @param {mongoose.ClientSession} [session]
   */
  async createEntry(entryData, session) {
    const validSession = getValidSession(session);
    const options = validSession ? { session: validSession } : {};
    const [doc] = await AmenityAllocationLedger.create([entryData], options);
    return doc;
  }

  /**
   * Atomically transitions ledger entry status with state-guard.
   * E.g. HELD -> CONFIRMED, or HELD -> RELEASED.
   * If already released or promoted, returns null (preventing double-release).
   * @param {Object} params
   * @param {mongoose.Types.ObjectId} [params.holdId]
   * @param {mongoose.Types.ObjectId} [params.reservationId]
   * @param {string} params.fromStatus
   * @param {string} params.toStatus
   * @param {mongoose.Types.ObjectId} [params.assignReservationId]
   * @param {mongoose.ClientSession} [session]
   */
  async transitionStatus(
    { holdId, reservationId, fromStatus, toStatus, assignReservationId },
    session
  ) {
    const filter = { status: fromStatus };
    if (holdId) filter.holdId = holdId;
    if (reservationId) filter.reservationId = reservationId;

    const update = { $set: { status: toStatus } };
    if (toStatus === 'RELEASED') {
      update.$set.releasedAt = new Date();
    }
    if (assignReservationId) {
      update.$set.reservationId = assignReservationId;
      update.$unset = { holdId: 1 };
    }

    return AmenityAllocationLedger.findOneAndUpdate(filter, update, {
      session: getValidSession(session),
      returnDocument: 'after',
    });
  }

  /**
   * Finds all ledger entries for a hold.
   * @param {mongoose.Types.ObjectId|string} holdId
   * @param {mongoose.ClientSession} [session]
   */
  async findByHoldId(holdId, session) {
    return AmenityAllocationLedger.find({ holdId }).session(getValidSession(session));
  }

  /**
   * Finds all ledger entries for a reservation.
   * @param {mongoose.Types.ObjectId|string} reservationId
   * @param {mongoose.ClientSession} [session]
   */
  async findByReservationId(reservationId, session) {
    return AmenityAllocationLedger.find({ reservationId }).session(getValidSession(session));
  }

  /**
   * Finds active ledger entries for a bucket.
   * @param {string} bucketId
   * @param {mongoose.ClientSession} [session]
   */
  async findActiveByBucketId(bucketId, session) {
    return AmenityAllocationLedger.find({
      bucketId,
      status: { $in: ['HELD', 'CONFIRMED'] },
    }).session(getValidSession(session));
  }
}

export const amenityAllocationLedgerRepository = new AmenityAllocationLedgerRepository();
export default amenityAllocationLedgerRepository;

import mongoose from 'mongoose';
import AmenitySlotAllocation from './amenitySlotAllocation.model.js';
import { getValidSession } from '../domain/concurrency/transaction.utils.js';

export class AmenitySlotAllocationRepository {
  /**
   * Inserts an exclusive discrete slot allocation document.
   * Deterministic ID: SLOT:<orgId>:<resourceId>:<slotStartUTC>
   * @param {Object} slotData
   * @param {mongoose.ClientSession} [session]
   */
  async createDiscreteSlot(slotData, session) {
    const validSession = getValidSession(session);
    const options = validSession ? { session: validSession } : {};
    const [doc] = await AmenitySlotAllocation.create([slotData], options);
    return doc;
  }

  /**
   * Finds any slot allocation by deterministic string _id.
   * @param {string} slotId
   * @param {mongoose.ClientSession} [session]
   */
  async findById(slotId, session) {
    return AmenitySlotAllocation.findById(slotId).session(getValidSession(session));
  }

  /**
   * Finds active (HELD or CONFIRMED) exclusive slots overlapping a range.
   * @param {Object} params
   */
  async findOverlappingExclusiveSlots({ orgId, facilityId, resourceId, startDateTime, endDateTime }, session) {
    const filter = {
      orgId,
      allocationType: 'EXCLUSIVE_DISCRETE',
      status: { $in: ['HELD', 'CONFIRMED'] },
      slotStartDateTime: { $lt: endDateTime },
      slotEndDateTime: { $gt: startDateTime },
    };
    if (facilityId) filter.facilityId = facilityId;
    if (resourceId !== undefined) filter.resourceId = resourceId;
    return AmenitySlotAllocation.find(filter).session(getValidSession(session));
  }

  /**
   * Atomically allocates headcount in a shared capacity bucket.
   * Enforces: allocatedHeadcount + requestedHeadcount <= maxCapacity.
   * Returns updated bucket or null if capacity exceeded.
   * @param {Object} params
   * @param {mongoose.ClientSession} [session]
   */
  async allocateCapacityBucket(
    { bucketId, orgId, facilityId, slotStartDateTime, slotEndDateTime, requestedHeadcount, maxCapacity },
    session
  ) {
    const validSession = getValidSession(session);

    // 1. Try atomic update if bucket already exists
    let bucket = await AmenitySlotAllocation.findOneAndUpdate(
      {
        _id: bucketId,
        $expr: {
          $lte: [{ $add: ['$allocatedHeadcount', requestedHeadcount] }, '$maxCapacity'],
        },
      },
      {
        $inc: { allocatedHeadcount: requestedHeadcount, version: 1 },
      },
      { session: validSession, returnDocument: 'after' }
    );

    if (bucket) return bucket;

    // 2. If not matched, check if bucket exists (capacity exceeded) or needs initial creation
    const existing = await AmenitySlotAllocation.findById(bucketId).session(validSession);
    if (existing) {
      // Bucket exists but condition failed -> capacity full!
      return null;
    }

    // 3. Bucket does not exist yet; check requested against max capacity
    if (requestedHeadcount > maxCapacity) {
      return null;
    }

    try {
      const options = validSession ? { session: validSession } : {};
      const [created] = await AmenitySlotAllocation.create(
        [
          {
            _id: bucketId,
            orgId,
            facilityId,
            allocationType: 'CAPACITY_HEADCOUNT',
            slotStartDateTime,
            slotEndDateTime,
            allocatedHeadcount: requestedHeadcount,
            maxCapacity,
            version: 1,
          },
        ],
        options
      );
      return created;
    } catch (err) {
      if (err.code === 11000) {
        // Concurrent insert race resolved: retry atomic update
        return AmenitySlotAllocation.findOneAndUpdate(
          {
            _id: bucketId,
            $expr: {
              $lte: [{ $add: ['$allocatedHeadcount', requestedHeadcount] }, '$maxCapacity'],
            },
          },
          {
            $inc: { allocatedHeadcount: requestedHeadcount, version: 1 },
          },
          { session: validSession, returnDocument: 'after' }
        );
      }
      throw err;
    }
  }

  /**
   * Atomically decrements headcount in a shared capacity bucket.
   * @param {string} bucketId
   * @param {number} headcount
   * @param {mongoose.ClientSession} [session]
   */
  async decrementCapacityBucket(bucketId, headcount, session) {
    return AmenitySlotAllocation.findOneAndUpdate(
      { _id: bucketId },
      { $inc: { allocatedHeadcount: -headcount, version: 1 } },
      { session: getValidSession(session), returnDocument: 'after' }
    );
  }

  /**
   * Atomically allocates bulk inventory for a calendar day bucket.
   * Enforces: allocatedQuantity + requestedQty <= totalStock.
   * @param {Object} params
   * @param {mongoose.ClientSession} [session]
   */
  async allocateBulkDayBucket(
    { bucketId, orgId, facilityId, resourceId, dateToken, requestedQty, totalStock },
    session
  ) {
    const validSession = getValidSession(session);

    let bucket = await AmenitySlotAllocation.findOneAndUpdate(
      {
        _id: bucketId,
        $expr: {
          $lte: [{ $add: ['$allocatedQuantity', requestedQty] }, '$totalStock'],
        },
      },
      {
        $inc: { allocatedQuantity: requestedQty, version: 1 },
      },
      { session: validSession, returnDocument: 'after' }
    );

    if (bucket) return bucket;

    const existing = await AmenitySlotAllocation.findById(bucketId).session(validSession);
    if (existing) {
      return null; // Stock exceeded
    }

    if (requestedQty > totalStock) {
      return null;
    }

    try {
      const options = validSession ? { session: validSession } : {};
      const [created] = await AmenitySlotAllocation.create(
        [
          {
            _id: bucketId,
            orgId,
            facilityId,
            resourceId,
            dateToken,
            allocationType: 'BULK_INVENTORY_DAY',
            allocatedQuantity: requestedQty,
            totalStock,
            version: 1,
          },
        ],
        options
      );
      return created;
    } catch (err) {
      if (err.code === 11000) {
        return AmenitySlotAllocation.findOneAndUpdate(
          {
            _id: bucketId,
            $expr: {
              $lte: [{ $add: ['$allocatedQuantity', requestedQty] }, '$totalStock'],
            },
          },
          {
            $inc: { allocatedQuantity: requestedQty, version: 1 },
          },
          { session: validSession, returnDocument: 'after' }
        );
      }
      throw err;
    }
  }

  /**
   * Atomically decrements allocated quantity in a bulk day bucket.
   * @param {string} bucketId
   * @param {number} quantity
   * @param {mongoose.ClientSession} [session]
   */
  async decrementBulkDayBucket(bucketId, quantity, session) {
    return AmenitySlotAllocation.findOneAndUpdate(
      { _id: bucketId },
      { $inc: { allocatedQuantity: -quantity, version: 1 } },
      { session: getValidSession(session), returnDocument: 'after' }
    );
  }

  /**
   * Atomically promotes a discrete slot from HELD to CONFIRMED.
   * Removes expiresAt to unregister from partial TTL.
   * @param {string} slotId
   * @param {mongoose.Types.ObjectId} reservationId
   * @param {mongoose.ClientSession} [session]
   */
  async promoteDiscreteSlot(slotId, reservationId, session) {
    return AmenitySlotAllocation.findOneAndUpdate(
      { _id: slotId, status: 'HELD' },
      {
        $set: { status: 'CONFIRMED', reservationId },
        $unset: { expiresAt: 1, holdId: 1 },
        $inc: { version: 1 },
      },
      { session: getValidSession(session), returnDocument: 'after' }
    );
  }

  /**
   * Transitions discrete slot status to RELEASED.
   * @param {string} slotId
   * @param {mongoose.ClientSession} [session]
   */
  async releaseDiscreteSlot(slotId, session) {
    return AmenitySlotAllocation.findOneAndUpdate(
      { _id: slotId, status: { $in: ['HELD', 'CONFIRMED'] } },
      {
        $set: { status: 'RELEASED' },
        $unset: { expiresAt: 1 },
        $inc: { version: 1 },
      },
      { session: getValidSession(session), returnDocument: 'after' }
    );
  }
}

export const amenitySlotAllocationRepository = new AmenitySlotAllocationRepository();
export default amenitySlotAllocationRepository;

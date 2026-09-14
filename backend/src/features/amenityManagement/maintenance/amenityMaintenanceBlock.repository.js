import mongoose from 'mongoose';
import AmenityMaintenanceBlock from './amenityMaintenanceBlock.model.js';
import { getValidSession } from '../domain/concurrency/transaction.utils.js';

export class AmenityMaintenanceBlockRepository {
  /**
   * Creates a new maintenance block document.
   * @param {Object} blockData
   * @param {mongoose.ClientSession} [session]
   */
  async create(blockData, session) {
    const validSession = getValidSession(session);
    const options = validSession ? { session: validSession } : {};
    const [doc] = await AmenityMaintenanceBlock.create([blockData], options);
    return doc;
  }

  /**
   * Finds block by ID.
   * @param {string|mongoose.Types.ObjectId} blockId
   * @param {mongoose.ClientSession} [session]
   */
  async findById(blockId, orgId, session) {
    const filter = { _id: blockId };
    if (orgId) filter.orgId = orgId;
    return AmenityMaintenanceBlock.findOne(filter).session(getValidSession(session));
  }

  /**
   * Finds active maintenance blocks overlapping a given time interval.
   * Matches blocks where:
   * - facilityId matches (or resourceId if provided)
   * - status is SCHEDULED or IN_PROGRESS
   * - startDateTime < queryEnd AND endDateTime > queryStart
   * @param {Object} params
   */
  async findOverlappingBlocks({ orgId, facilityId, resourceId, startDateTime, endDateTime }, session) {
    const filter = {
      orgId,
      status: { $in: ['SCHEDULED', 'IN_PROGRESS'] },
      startDateTime: { $lt: endDateTime },
      endDateTime: { $gt: startDateTime },
    };

    if (resourceId) {
      filter.$or = [
        { resourceId },
        { facilityId, resourceId: null }, // Entire facility closure also affects the resource
      ];
    } else if (facilityId) {
      filter.facilityId = facilityId;
    }

    return AmenityMaintenanceBlock.find(filter).session(getValidSession(session));
  }

  /**
   * Updates maintenance block status.
   * @param {string|mongoose.Types.ObjectId} blockId
   * @param {string|mongoose.Types.ObjectId} [orgId]
   * @param {string} status
   * @param {mongoose.ClientSession} [session]
   */
  async updateStatus(blockId, orgId, status, session) {
    const filter = { _id: blockId };
    if (orgId) filter.orgId = orgId;
    const update = { status };
    if (status === 'COMPLETED') {
      update.completedAt = new Date();
    }
    return AmenityMaintenanceBlock.findOneAndUpdate(
      filter,
      { $set: update },
      { session: getValidSession(session), returnDocument: 'after', runValidators: true }
    );
  }

  /**
   * Extends maintenance block end datetime.
   * @param {string|mongoose.Types.ObjectId} blockId
   * @param {string|mongoose.Types.ObjectId} [orgId]
   * @param {Date} newEndDateTime
   * @param {mongoose.ClientSession} [session]
   */
  async extend(blockId, orgId, newEndDateTime, session) {
    const filter = { _id: blockId };
    if (orgId) filter.orgId = orgId;
    return AmenityMaintenanceBlock.findOneAndUpdate(
      filter,
      { $set: { endDateTime: newEndDateTime } },
      { session: getValidSession(session), returnDocument: 'after', runValidators: true }
    );
  }

  /**
   * Lists maintenance blocks for an organization with optional filtering.
   * @param {Object} params
   * @param {mongoose.ClientSession} [session]
   */
  async list({ orgId, facilityId, status, page = 1, limit = 50 }, session) {
    const filter = { orgId };
    if (facilityId) filter.facilityId = facilityId;
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const validSession = getValidSession(session);
    const [records, total] = await Promise.all([
      AmenityMaintenanceBlock.find(filter)
        .sort({ startDateTime: -1 })
        .skip(skip)
        .limit(limit)
        .session(validSession),
      AmenityMaintenanceBlock.countDocuments(filter).session(validSession),
    ]);
    return { records, total, page, limit, pages: Math.ceil(total / limit) };
  }
}

export const amenityMaintenanceBlockRepository = new AmenityMaintenanceBlockRepository();
export default amenityMaintenanceBlockRepository;

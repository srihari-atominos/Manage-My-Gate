import mongoose from 'mongoose';
import AmenityMaintenanceBlock from './amenityMaintenanceBlock.model.js';

export class AmenityMaintenanceBlockRepository {
  /**
   * Creates a new maintenance block document.
   * @param {Object} blockData
   * @param {mongoose.ClientSession} [session]
   */
  async create(blockData, session) {
    const [doc] = await AmenityMaintenanceBlock.create([blockData], { session });
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
    return AmenityMaintenanceBlock.findOne(filter).session(session || null);
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

    return AmenityMaintenanceBlock.find(filter).session(session || null);
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
    return AmenityMaintenanceBlock.findOneAndUpdate(
      filter,
      { $set: { status } },
      { session: session || null, returnDocument: 'after', runValidators: true }
    );
  }
}

export const amenityMaintenanceBlockRepository = new AmenityMaintenanceBlockRepository();
export default amenityMaintenanceBlockRepository;

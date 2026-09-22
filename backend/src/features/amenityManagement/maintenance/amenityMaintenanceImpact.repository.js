import mongoose from 'mongoose';
import AmenityMaintenanceImpact from './amenityMaintenanceImpact.model.js';
import { getValidSession } from '../domain/concurrency/transaction.utils.js';

export class AmenityMaintenanceImpactRepository {
  /**
   * Creates a new maintenance impact record document.
   * @param {Object} impactData
   * @param {mongoose.ClientSession} [session]
   */
  async create(impactData, session) {
    const validSession = getValidSession(session);
    const options = validSession ? { session: validSession } : {};
    const [doc] = await AmenityMaintenanceImpact.create([impactData], options);
    return doc;
  }

  /**
   * Finds impact record by ID within organization.
   * @param {string|mongoose.Types.ObjectId} impactId
   * @param {string|mongoose.Types.ObjectId} [orgId]
   * @param {mongoose.ClientSession} [session]
   */
  async findById(impactId, orgId, session) {
    const filter = { _id: impactId };
    if (orgId) filter.orgId = orgId;
    return AmenityMaintenanceImpact.findOne(filter).session(getValidSession(session));
  }

  /**
   * Finds all impact records for a specific maintenance block within organization.
   * @param {string|mongoose.Types.ObjectId} blockId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {mongoose.ClientSession} [session]
   */
  async findByBlockId(blockId, orgId, session) {
    const filter = { maintenanceBlockId: blockId };
    if (orgId) filter.orgId = orgId;
    return AmenityMaintenanceImpact.find(filter)
      .sort({ createdAt: -1 })
      .session(getValidSession(session));
  }

  /**
   * Finds impact record by maintenanceBlockId, targetType, and targetId for idempotency lookups.
   * @param {Object} params
   * @param {string|mongoose.Types.ObjectId} params.blockId
   * @param {string} params.targetType
   * @param {string|mongoose.Types.ObjectId} params.targetId
   * @param {string|mongoose.Types.ObjectId} params.orgId
   * @param {mongoose.ClientSession} [session]
   */
  async findByBlockAndTarget({ blockId, targetType, targetId, orgId }, session) {
    const filter = {
      maintenanceBlockId: blockId,
      targetType,
      targetId,
    };
    if (orgId) filter.orgId = orgId;
    return AmenityMaintenanceImpact.findOne(filter).session(getValidSession(session));
  }

  /**
   * Finds impact records by targetId within organization.
   * @param {string|mongoose.Types.ObjectId} targetId
   * @param {string|mongoose.Types.ObjectId} [orgId]
   * @param {mongoose.ClientSession} [session]
   */
  async findByTargetId(targetId, orgId, session) {
    const filter = { targetId };
    if (orgId) filter.orgId = orgId;
    return AmenityMaintenanceImpact.find(filter)
      .sort({ createdAt: -1 })
      .session(getValidSession(session));
  }

  /**
   * Updates status and resolution details of an impact record.
   * @param {string|mongoose.Types.ObjectId} impactId
   * @param {string|mongoose.Types.ObjectId} [orgId]
   * @param {Object} updateData
   * @param {mongoose.ClientSession} [session]
   */
  async updateResolution(impactId, orgId, updateData, session) {
    const filter = { _id: impactId };
    if (orgId) filter.orgId = orgId;

    const $set = { ...updateData, resolvedAt: new Date() };
    return AmenityMaintenanceImpact.findOneAndUpdate(
      filter,
      { $set },
      { session: getValidSession(session), returnDocument: 'after', runValidators: true }
    );
  }

  /**
   * Lists impact records with pagination and filtering.
   * @param {Object} params
   * @param {string|mongoose.Types.ObjectId} params.orgId
   * @param {string|mongoose.Types.ObjectId} [params.blockId]
   * @param {string} [params.status]
   * @param {number} [params.page=1]
   * @param {number} [params.limit=50]
   * @param {mongoose.ClientSession} [session]
   */
  async list({ orgId, blockId, status, page = 1, limit = 50 }, session) {
    const filter = { orgId };
    if (blockId) filter.maintenanceBlockId = blockId;
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const validSession = getValidSession(session);
    const [records, total] = await Promise.all([
      AmenityMaintenanceImpact.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .session(validSession),
      AmenityMaintenanceImpact.countDocuments(filter).session(validSession),
    ]);
    return { records, total, page, limit, pages: Math.ceil(total / limit) };
  }

  /**
   * Deletes all impact records associated with a maintenance block.
   * @param {string|mongoose.Types.ObjectId} blockId
   * @param {string|mongoose.Types.ObjectId} [orgId]
   * @param {mongoose.ClientSession} [session]
   */
  async deleteByBlockId(blockId, orgId, session) {
    const filter = { maintenanceBlockId: blockId };
    if (orgId) filter.orgId = orgId;
    return AmenityMaintenanceImpact.deleteMany(filter).session(getValidSession(session));
  }
}

export const amenityMaintenanceImpactRepository = new AmenityMaintenanceImpactRepository();
export default amenityMaintenanceImpactRepository;

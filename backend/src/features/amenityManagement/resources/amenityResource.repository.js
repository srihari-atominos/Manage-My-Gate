import mongoose from 'mongoose';
import AmenityResource from './amenityResource.model.js';
import { getValidSession } from '../domain/concurrency/transaction.utils.js';

export class AmenityResourceRepository {
  /**
   * Creates a new resource document.
   * @param {Object} resourceData
   * @param {mongoose.ClientSession} [session]
   */
  async create(resourceData, session) {
    const validSession = getValidSession(session);
    const options = validSession ? { session: validSession } : {};
    const [doc] = await AmenityResource.create([resourceData], options);
    return doc;
  }

  /**
   * Finds resource by ID within organization.
   * @param {string|mongoose.Types.ObjectId} resourceId
   * @param {string|mongoose.Types.ObjectId} [orgId]
   * @param {mongoose.ClientSession} [session]
   */
  async findById(resourceId, orgId, session) {
    const filter = { _id: resourceId, isDeleted: false };
    if (orgId) filter.orgId = orgId;
    return AmenityResource.findOne(filter).session(getValidSession(session));
  }

  /**
   * Finds all active resources for a facility.
   * @param {string|mongoose.Types.ObjectId} facilityId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {mongoose.ClientSession} [session]
   */
  async findActiveByFacilityId(facilityId, orgId, session) {
    return AmenityResource.find({
      facilityId,
      orgId,
      isActive: true,
      isDeleted: false,
    }).session(getValidSession(session));
  }

  /**
   * Finds all non-deleted resources for a facility (including inactive ones).
   * @param {string|mongoose.Types.ObjectId} facilityId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {mongoose.ClientSession} [session]
   */
  async findByFacilityId(facilityId, orgId, session) {
    return AmenityResource.find({
      facilityId,
      orgId,
      isDeleted: false,
    }).session(getValidSession(session));
  }

  /**
   * Atomically increments concurrencyVersion for Resource Mutex locking.
   * @param {string|mongoose.Types.ObjectId} resourceId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {mongoose.ClientSession} [session]
   */
  async incrementConcurrencyVersion(resourceId, orgId, session) {
    return AmenityResource.findOneAndUpdate(
      { _id: resourceId, orgId, isDeleted: false, isActive: true },
      { $inc: { concurrencyVersion: 1 } },
      { session: getValidSession(session), returnDocument: 'after' }
    );
  }

  /**
   * Updates resource fields.
   * @param {string|mongoose.Types.ObjectId} resourceId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {Object} updateData
   * @param {mongoose.ClientSession} [session]
   */
  async update(resourceId, orgId, updateData, session) {
    return AmenityResource.findOneAndUpdate(
      { _id: resourceId, orgId, isDeleted: false },
      { $set: updateData },
      { session: getValidSession(session), returnDocument: 'after', runValidators: true }
    );
  }

  /**
   * Soft deletes a resource.
   * @param {string|mongoose.Types.ObjectId} resourceId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {mongoose.ClientSession} [session]
   */
  async softDelete(resourceId, orgId, session) {
    return AmenityResource.findOneAndUpdate(
      { _id: resourceId, orgId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), isActive: false } },
      { session: getValidSession(session), returnDocument: 'after' }
    );
  }

  /**
   * Paginated list query with total count via $facet aggregation pipeline.
   * @param {Object} params
   */
  async findWithPagination({ orgId, facilityId, isActive, isSerializedAsset, page = 1, limit = 10 }) {
    const match = {
      orgId: new mongoose.Types.ObjectId(orgId),
      isDeleted: false,
    };

    if (facilityId) match.facilityId = new mongoose.Types.ObjectId(facilityId);
    if (typeof isActive === 'boolean') match.isActive = isActive;
    if (typeof isSerializedAsset === 'boolean') match.isSerializedAsset = isSerializedAsset;

    const skip = (page - 1) * limit;

    const [result] = await AmenityResource.aggregate([
      { $match: match },
      { $sort: { name: 1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: 'count' }],
        },
      },
    ]);

    const data = result?.data || [];
    const total = result?.totalCount?.[0]?.count || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    return { data, items: data, total, page, limit, totalPages };
  }
}

export const amenityResourceRepository = new AmenityResourceRepository();
export default amenityResourceRepository;

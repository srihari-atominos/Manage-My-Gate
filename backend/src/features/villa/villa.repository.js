import mongoose from 'mongoose';
import Villa from './villa.model.js';

export class VillaRepository {
  /**
   * Create a new Villa.
   * @param {string|ObjectId} orgId
   * @param {object} villaData
   * @param {ClientSession} [session]
   */
  async create(orgId, villaData, session) {
    if (!orgId) throw new Error('orgId is required');
    const villa = new Villa({ ...villaData, orgId });
    return await villa.save({ session });
  }

  /**
   * Find villas.
   * @param {string|ObjectId} orgId
   * @param {object} [filter={}]
   * @param {ClientSession} [session]
   */
  async find(orgId, filter = {}, session) {
    if (!orgId) throw new Error('orgId is required');
    const query = Villa.find({ ...filter, orgId });
    if (session) query.session(session);
    return await query;
  }

  /**
   * Find a villa by ID within the tenant scope.
   * @param {string} id
   * @param {string|ObjectId} orgId
   * @param {ClientSession} [session]
   */
  async findById(id, orgId, session) {
    if (!orgId) throw new Error('orgId is required');
    const query = Villa.findOne({ _id: id, orgId });
    if (session) query.session(session);
    return await query;
  }

  /**
   * Update a villa by ID within the tenant scope.
   * @param {string} id
   * @param {string|ObjectId} orgId
   * @param {object} updateData
   * @param {ClientSession} [session]
   */
  async update(id, orgId, updateData, session) {
    if (!orgId) throw new Error('orgId is required');
    const query = Villa.findOneAndUpdate(
      { _id: id, orgId },
      updateData,
      { new: true, runValidators: true }
    );
    if (session) query.session(session);
    return await query;
  }

  /**
   * Delete a villa by ID within the tenant scope.
   * @param {string} id
   * @param {string|ObjectId} orgId
   * @param {ClientSession} [session]
   */
  async delete(id, orgId, session) {
    if (!orgId) throw new Error('orgId is required');
    const query = Villa.findOneAndDelete({ _id: id, orgId });
    if (session) query.session(session);
    return await query;
  }

  /**
   * Retrieves paginated list of villas along with total count in a single database round-trip using $facet.
   * @param {object} params
   * @param {string|ObjectId} params.orgId
   * @param {number} [params.page=1]
   * @param {number} [params.limit=10]
   * @param {string} [params.search]
   * @param {ClientSession} [session]
   */
  async findPaginated({ orgId, page = 1, limit = 10, search, ...filters }, session) {
    if (!orgId) throw new Error('orgId is required');

    // Build match query
    const matchQuery = { 
      orgId: typeof orgId === 'string' ? new mongoose.Types.ObjectId(orgId) : orgId,
      ...filters 
    };

    if (search) {
      matchQuery.unitNumber = { $regex: search.trim(), $options: 'i' };
    }

    const skip = (page - 1) * limit;

    // Build Mongoose aggregation pipeline using $facet
    const pipeline = [
      { $match: matchQuery },
      { $sort: { unitNumber: 1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit }
          ],
          totalRecords: [
            { $count: 'count' }
          ]
        }
      }
    ];

    const query = session ? Villa.aggregate(pipeline).session(session) : Villa.aggregate(pipeline);
    const [result] = await query;
    
    const data = result?.data || [];
    const total = result?.totalRecords?.[0]?.count || 0;

    return { data, total };
  }

  /**
   * Find a villa by unit number within the tenant scope.
   * @param {string} unitNumber
   * @param {string|ObjectId} orgId
   * @param {ClientSession} [session]
   */
  async findByUnitNumber(unitNumber, orgId, session) {
    if (!orgId) throw new Error('orgId is required');
    const query = Villa.findOne({ unitNumber, orgId });
    if (session) query.session(session);
    return await query;
  }

  /**
   * Retrieves occupancy stats within tenant scope.
   * @param {string|ObjectId} orgId
   * @param {ClientSession} [session]
   */
  async getOccupancyStats(orgId, session) {
    if (!orgId) throw new Error('orgId is required');
    const pipeline = [
      { 
        $match: { 
          orgId: typeof orgId === 'string' ? new mongoose.Types.ObjectId(orgId) : orgId 
        } 
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          vacant: { $sum: { $cond: [{ $eq: ['$status', 'Vacant'] }, 1, 0] } },
          occupied: { $sum: { $cond: [{ $eq: ['$status', 'Occupied'] }, 1, 0] } },
          maintenance: { $sum: { $cond: [{ $eq: ['$status', 'Under Maintenance'] }, 1, 0] } }
        }
      }
    ];
    
    const query = session ? Villa.aggregate(pipeline).session(session) : Villa.aggregate(pipeline);
    const [result] = await query;
    return result || { total: 0, vacant: 0, occupied: 0, maintenance: 0 };
  }
}

export default new VillaRepository();

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
    await villa.save({ session });
    return await villa.populate('residents.userId', 'name email phone login');
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
    const filter = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id, orgId }
      : { $or: [{ unitNumber: id }, { unitNumber: `Villa ${id.replace(/^v-/, '')}` }], orgId };
    const query = Villa.findOne(filter).populate('residents.userId', 'name email phone login');
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
    const filter = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id, orgId }
      : { $or: [{ unitNumber: id }, { unitNumber: `Villa ${id.replace(/^v-/, '')}` }], orgId };
    const query = Villa.findOneAndUpdate(
      filter,
      updateData,
      { returnDocument: 'after', runValidators: true }
    ).populate('residents.userId', 'name email phone login');
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
    const filter = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id, orgId }
      : { $or: [{ unitNumber: id }, { unitNumber: `Villa ${id.replace(/^v-/, '')}` }], orgId };
    const query = Villa.findOneAndDelete(filter);
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
  async findPaginated({ orgId, page = 1, limit = 10, search, sortBy = 'unitNumber', sortOrder = 'asc', ...filters }, session) {
    if (!orgId) throw new Error('orgId is required');

    const matchQuery = { 
      orgId: typeof orgId === 'string' ? new mongoose.Types.ObjectId(orgId) : orgId,
    };

    if (filters.blockOrBuilding) matchQuery.blockOrBuilding = filters.blockOrBuilding;
    if (filters.status) matchQuery.status = filters.status;
    if (filters.type) matchQuery.type = filters.type;
    if (filters.floor) matchQuery.floor = filters.floor;

    const skip = (page - 1) * limit;

    const sortObj = {};
    const order = sortOrder === 'desc' ? -1 : 1;
    sortObj[sortBy || 'unitNumber'] = order;

    const pipeline = [
      { $match: matchQuery },
      {
        $lookup: {
          from: 'users',
          localField: 'residents.userId',
          foreignField: '_id',
          as: 'residentUsers',
        },
      },
    ];

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      pipeline.push({
        $match: {
          $or: [
            { unitNumber: searchRegex },
            { blockOrBuilding: searchRegex },
            { floor: searchRegex },
            { 'residentUsers.name': searchRegex },
            { 'residentUsers.username': searchRegex },
            { 'residentUsers.email': searchRegex },
            { 'residentUsers.phone': searchRegex },
          ],
        },
      });
    }

    pipeline.push(
      { $project: { residentUsers: 0 } },
      { $sort: sortObj },
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
    );

    const query = session ? Villa.aggregate(pipeline).session(session) : Villa.aggregate(pipeline);
    const [result] = await query;
    
    let data = result?.data || [];
    const total = result?.totalRecords?.[0]?.count || 0;

    if (data.length > 0) {
      data = await Villa.populate(data, {
        path: 'residents.userId',
        select: 'name email phone login',
      });
    }

    return { data, total };
  }

  /**
   * Find a villa by unit number (and optional blockOrBuilding) within the tenant scope.
   * @param {string} unitNumber
   * @param {string|ObjectId} orgId
   * @param {string} [blockOrBuilding]
   * @param {ClientSession} [session]
   */
  async findByUnitNumber(unitNumber, orgId, blockOrBuilding, session) {
    if (!orgId) throw new Error('orgId is required');
    const queryObj = { unitNumber, orgId };
    if (blockOrBuilding !== undefined && blockOrBuilding !== null) {
      queryObj.blockOrBuilding = blockOrBuilding;
    }
    const query = Villa.findOne(queryObj);
    if (session) query.session(session);
    return await query;
  }

  /**
   * Retrieves occupancy stats within tenant scope.
   * @param {string|ObjectId} orgId
   * @param {ClientSession} [session]
   */
  /**
   * Returns all distinct, non-empty blockOrBuilding values for an org.
   * Uses a single aggregation round-trip: $match → $group → $sort.
   * @param {string|ObjectId} orgId
   * @param {ClientSession} [session]
   */
  async getDistinctBlocks(orgId, session) {
    if (!orgId) throw new Error('orgId is required');
    const pipeline = [
      {
        $match: {
          orgId: typeof orgId === 'string' ? new mongoose.Types.ObjectId(orgId) : orgId,
          blockOrBuilding: { $exists: true, $ne: '' },
        },
      },
      {
        $group: { _id: '$blockOrBuilding' },
      },
      {
        $sort: { _id: 1 },
      },
    ];
    const query = session ? Villa.aggregate(pipeline).session(session) : Villa.aggregate(pipeline);
    const results = await query;
    return results.map((r) => r._id);
  }

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

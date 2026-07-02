import Villa from './villa.model.js';

export class VillaRepository {
  async create(villaData, session) {
    const villa = new Villa(villaData);
    return await villa.save({ session });
  }

  async findById(id, session) {
    return await Villa.findById(id).session(session);
  }

  async findByVillaNumber(villaNumber, orgId, session) {
    return await Villa.findOne({ villaNumber, orgId }).session(session);
  }

  /**
   * Retrieves paginated list of villas along with total count in a single database round-trip.
   */
  async findAllPaginated(orgId, skip, limit, filters = {}, session) {
    const matchQuery = { orgId, ...filters };

    // Build Mongoose aggregation pipeline using $facet
    const pipeline = [
      { $match: matchQuery },
      { $sort: { villaNumber: 1 } },
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
    
    const data = result.data || [];
    const totalRecords = result.totalRecords[0]?.count || 0;

    return { data, totalRecords };
  }

  async update(id, updateData, session) {
    return await Villa.findByIdAndUpdate(id, updateData, { 
      new: true, 
      runValidators: true, 
      session 
    });
  }

  async delete(id, session) {
    return await Villa.findByIdAndDelete(id).session(session);
  }

  async getOccupancyStats(orgId, session) {
    const pipeline = [
      { $match: { orgId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          vacant: { $sum: { $cond: [{ $eq: ['$occupancyStatus', 'Vacant'] }, 1, 0] } },
          ownerOccupied: { $sum: { $cond: [{ $eq: ['$occupancyStatus', 'Owner Occupied'] }, 1, 0] } },
          tenantOccupied: { $sum: { $cond: [{ $eq: ['$occupancyStatus', 'Tenant Occupied'] }, 1, 0] } }
        }
      }
    ];
    
    const query = session ? Villa.aggregate(pipeline).session(session) : Villa.aggregate(pipeline);
    const [result] = await query;
    return result || { total: 0, vacant: 0, ownerOccupied: 0, tenantOccupied: 0 };
  }
}

export default new VillaRepository();

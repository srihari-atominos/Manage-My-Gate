import MasterPricing from './masterPricing.model.js';

class MasterPricingRepository {
  /**
   * Create a new Master Pricing record.
   * @param {Object} pricingData
   * @param {ClientSession} [session=null]
   */
  async create(pricingData, session = null) {
    const options = session ? { session } : {};
    const [created] = await MasterPricing.create([pricingData], options);
    return created;
  }

  /**
   * Find Master Pricing by ID.
   * @param {string} id
   * @param {ClientSession} [session=null]
   */
  async findById(id, session = null) {
    const query = MasterPricing.findById(id);
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find Master Pricing by plan code (case insensitive exact match).
   * @param {string} planCode
   * @param {ClientSession} [session=null]
   */
  async findByPlanCode(planCode, session = null) {
    const query = MasterPricing.findOne({ planCode: { $regex: new RegExp(`^${planCode}$`, 'i') } });
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find all Master Pricing records using Mongoose Aggregation Pipeline ($facet)
   * for single round-trip data retrieval and pagination counts.
   * @param {Object} queryOptions
   */
  async findAllPaginated({ page = 1, limit = 10, search = '', type, status }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const matchStage = {};

    if (type) {
      matchStage.type = type;
    }

    if (status) {
      matchStage.status = status;
    }

    if (search && search.trim() !== '') {
      matchStage.name = { $regex: search.trim(), $options: 'i' };
    }

    const pipeline = [
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limitNum }],
          totalCount: [{ $count: 'count' }],
        },
      },
    ];

    const [result] = await MasterPricing.aggregate(pipeline).exec();

    const data = result?.data || [];
    const totalRecords = result?.totalCount?.[0]?.count || 0;
    const totalPages = Math.ceil(totalRecords / limitNum) || 0;

    return {
      data,
      pagination: {
        currentPage: pageNum,
        limit: limitNum,
        totalRecords,
        totalPages,
      },
    };
  }

  /**
   * Update Master Pricing by ID.
   * @param {string} id
   * @param {Object} updateData
   * @param {ClientSession} [session=null]
   */
  async updateById(id, updateData, session = null) {
    const options = { new: true, runValidators: true };
    if (session) options.session = session;
    return await MasterPricing.findByIdAndUpdate(id, updateData, options).exec();
  }

  /**
   * Delete Master Pricing by ID.
   * @param {string} id
   * @param {ClientSession} [session=null]
   */
  async deleteById(id, session = null) {
    const options = {};
    if (session) options.session = session;
    return await MasterPricing.findByIdAndDelete(id, options).exec();
  }
}

export default new MasterPricingRepository();

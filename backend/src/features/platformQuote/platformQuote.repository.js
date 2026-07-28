import PlatformQuote from './platformQuote.model.js';

class PlatformQuoteRepository {
  /**
   * Create a new Platform Quote.
   * @param {Object} quoteData
   * @param {ClientSession} [session=null]
   */
  async create(quoteData, session = null) {
    const options = session ? { session } : {};
    const [created] = await PlatformQuote.create([quoteData], options);
    return created;
  }

  /**
   * Find Platform Quote by ID.
   * @param {string} id
   * @param {ClientSession} [session=null]
   */
  async findById(id, session = null) {
    const query = PlatformQuote.findById(id)
      .populate('organisationId', 'name email code')
      .populate('masterPricingId')
      .populate('createdBy', 'name email')
      .populate('approvalDetails.approvedBy', 'name email');
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find Platform Quote by quote number.
   * @param {string} quoteNumber
   * @param {ClientSession} [session=null]
   */
  async findByQuoteNumber(quoteNumber, session = null) {
    const query = PlatformQuote.findOne({ quoteNumber })
      .populate('organisationId', 'name email code')
      .populate('masterPricingId')
      .populate('createdBy', 'name email')
      .populate('approvalDetails.approvedBy', 'name email');
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find all Platform Quotes using Mongoose Aggregation Pipeline ($facet)
   * for single round-trip pagination and count querying.
   * @param {Object} queryOptions
   */
  async findAllPaginated({ page = 1, limit = 10, search = '', status, organisationId }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const matchStage = {};

    if (status) {
      matchStage.status = status;
    }

    if (organisationId) {
      matchStage.organisationId = new PlatformQuote.base.Types.ObjectId(organisationId);
    }

    if (search && search.trim() !== '') {
      const term = search.trim();
      matchStage.$or = [
        { quoteNumber: { $regex: term, $options: 'i' } },
        { 'pricingSnapshot.planName': { $regex: term, $options: 'i' } },
      ];
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

    const [result] = await PlatformQuote.aggregate(pipeline).exec();

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
   * Update Platform Quote by ID.
   * @param {string} id
   * @param {Object} updateData
   * @param {ClientSession} [session=null]
   */
  async updateById(id, updateData, session = null) {
    const options = { new: true, runValidators: true };
    if (session) options.session = session;
    return await PlatformQuote.findByIdAndUpdate(id, updateData, options).exec();
  }

  /**
   * Update Platform Quote status by ID.
   * @param {string} id
   * @param {string} status
   * @param {ClientSession} [session=null]
   */
  async updateStatus(id, status, session = null) {
    const options = { new: true, runValidators: true };
    if (session) options.session = session;
    return await PlatformQuote.findByIdAndUpdate(id, { status }, options).exec();
  }

  /**
   * Delete Platform Quote by ID.
   * @param {string} id
   * @param {ClientSession} [session=null]
   */
  async deleteById(id, session = null) {
    const options = {};
    if (session) options.session = session;
    return await PlatformQuote.findByIdAndDelete(id, options).exec();
  }
}

export default new PlatformQuoteRepository();

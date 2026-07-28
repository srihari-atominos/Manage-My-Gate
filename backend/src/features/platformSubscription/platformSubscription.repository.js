import PlatformSubscription from './platformSubscription.model.js';

class PlatformSubscriptionRepository {
  /**
   * Create a new platform subscription.
   * @param {Object} subscriptionData
   * @param {ClientSession} [session=null]
   */
  async create(subscriptionData, session = null) {
    const options = session ? { session } : {};
    const [created] = await PlatformSubscription.create([subscriptionData], options);
    return created;
  }

  /**
   * Find subscription by ObjectId.
   * @param {string} id
   * @param {ClientSession} [session=null]
   */
  async findById(id, session = null) {
    const query = PlatformSubscription.findById(id)
      .populate('organisationId', 'name email code')
      .populate('orderId');
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find subscription by Organisation ID.
   * @param {string} organisationId
   * @param {ClientSession} [session=null]
   */
  async findByOrganisationId(organisationId, session = null) {
    const query = PlatformSubscription.findOne({ organisationId })
      .populate('organisationId', 'name email code')
      .populate('orderId');
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find all platform subscriptions using Mongoose Aggregation Pipeline ($facet)
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
      matchStage.organisationId = new PlatformSubscription.base.Types.ObjectId(organisationId);
    }

    if (search && search.trim() !== '') {
      const term = search.trim();
      matchStage.$or = [
        { planName: { $regex: term, $options: 'i' } },
        { status: { $regex: term, $options: 'i' } },
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

    const [result] = await PlatformSubscription.aggregate(pipeline).exec();

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
   * Update subscription by ID.
   * @param {string} id
   * @param {Object} updateData
   * @param {ClientSession} [session=null]
   */
  async updateById(id, updateData, session = null) {
    const options = { new: true, runValidators: true };
    if (session) options.session = session;
    return await PlatformSubscription.findByIdAndUpdate(id, updateData, options).exec();
  }

  /**
   * Update subscription by Organisation ID (upsert support).
   * @param {string} organisationId
   * @param {Object} updateData
   * @param {ClientSession} [session=null]
   */
  async upsertByOrganisationId(organisationId, updateData, session = null) {
    const options = { new: true, upsert: true, runValidators: true };
    if (session) options.session = session;
    return await PlatformSubscription.findOneAndUpdate(
      { organisationId },
      { $set: updateData },
      options
    ).exec();
  }

  /**
   * Delete subscription by ID.
   * @param {string} id
   * @param {ClientSession} [session=null]
   */
  async deleteById(id, session = null) {
    const options = {};
    if (session) options.session = session;
    return await PlatformSubscription.findByIdAndDelete(id, options).exec();
  }
}

export default new PlatformSubscriptionRepository();

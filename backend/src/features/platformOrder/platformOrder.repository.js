import PlatformOrder from './platformOrder.model.js';

class PlatformOrderRepository {
  /**
   * Create a new Platform Order.
   * @param {Object} orderData
   * @param {ClientSession} [session=null]
   */
  async create(orderData, session = null) {
    const options = session ? { session } : {};
    const [created] = await PlatformOrder.create([orderData], options);
    return created;
  }

  /**
   * Find Platform Order by ID.
   * @param {string} id
   * @param {ClientSession} [session=null]
   */
  async findById(id, session = null) {
    const query = PlatformOrder.findById(id)
      .populate('quoteId')
      .populate('organisationId', 'name email code')
      .populate('acceptedBy', 'name email');
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find Platform Order by order number.
   * @param {string} orderNumber
   * @param {ClientSession} [session=null]
   */
  async findByOrderNumber(orderNumber, session = null) {
    const query = PlatformOrder.findOne({ orderNumber })
      .populate('quoteId')
      .populate('organisationId', 'name email code')
      .populate('acceptedBy', 'name email');
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find Platform Order by quote ID.
   * @param {string} quoteId
   * @param {ClientSession} [session=null]
   */
  async findByQuoteId(quoteId, session = null) {
    const query = PlatformOrder.findOne({ quoteId });
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find all Platform Orders using Mongoose Aggregation Pipeline ($facet)
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
      matchStage.organisationId = new PlatformOrder.base.Types.ObjectId(organisationId);
    }

    if (search && search.trim() !== '') {
      const term = search.trim();
      matchStage.$or = [
        { orderNumber: { $regex: term, $options: 'i' } },
        { 'orderSnapshot.planName': { $regex: term, $options: 'i' } },
        { 'orderSnapshot.quoteNumber': { $regex: term, $options: 'i' } },
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

    const [result] = await PlatformOrder.aggregate(pipeline).exec();

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
   * Update Platform Order by ID.
   * @param {string} id
   * @param {Object} updateData
   * @param {ClientSession} [session=null]
   */
  async updateById(id, updateData, session = null) {
    const options = { new: true, runValidators: true };
    if (session) options.session = session;
    return await PlatformOrder.findByIdAndUpdate(id, updateData, options).exec();
  }

  /**
   * Update Platform Order status by ID.
   * @param {string} id
   * @param {string} status
   * @param {ClientSession} [session=null]
   */
  async updateStatus(id, status, session = null) {
    const options = { new: true, runValidators: true };
    if (session) options.session = session;
    return await PlatformOrder.findByIdAndUpdate(id, { status }, options).exec();
  }

  /**
   * Optimistic Concurrency Control update for payment settled.
   * Updates only if order status is strictly 'PAYMENT_PENDING'.
   * @param {string} orderId 
   * @param {Object} updateData
   */
  async findAndUpdatePaymentPending(orderId, updateData) {
    return await PlatformOrder.findOneAndUpdate(
      { _id: orderId, status: 'PAYMENT_PENDING' },
      updateData,
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Delete Platform Order by ID.
   * @param {string} id
   * @param {ClientSession} [session=null]
   */
  async deleteById(id, session = null) {
    const options = {};
    if (session) options.session = session;
    return await PlatformOrder.findByIdAndDelete(id, options).exec();
  }
}

export default new PlatformOrderRepository();

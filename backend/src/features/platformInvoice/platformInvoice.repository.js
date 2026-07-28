import PlatformInvoice from './platformInvoice.model.js';

class PlatformInvoiceRepository {
  /**
   * Create a new Platform Invoice.
   * @param {Object} invoiceData
   * @param {ClientSession} [session=null]
   */
  async create(invoiceData, session = null) {
    const options = session ? { session } : {};
    const [created] = await PlatformInvoice.create([invoiceData], options);
    return created;
  }

  /**
   * Find Platform Invoice by ID.
   * @param {string} id
   * @param {ClientSession} [session=null]
   */
  async findById(id, session = null) {
    const query = PlatformInvoice.findById(id)
      .populate('orderId')
      .populate('organisationId', 'name email code gstin');
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find Platform Invoice by invoice number.
   * @param {string} invoiceNumber
   * @param {ClientSession} [session=null]
   */
  async findByInvoiceNumber(invoiceNumber, session = null) {
    const query = PlatformInvoice.findOne({ invoiceNumber })
      .populate('orderId')
      .populate('organisationId', 'name email code gstin');
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find Platform Invoice by order ID.
   * @param {string} orderId
   * @param {ClientSession} [session=null]
   */
  async findByOrderId(orderId, session = null) {
    const query = PlatformInvoice.findOne({ orderId });
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find all Platform Invoices using Mongoose Aggregation Pipeline ($facet)
   * for single round-trip pagination and count querying.
   * @param {Object} queryOptions
   */
  async findAllPaginated({ page = 1, limit = 10, search = '', status, organisationId, orderId }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const matchStage = {};

    if (status) {
      matchStage.status = status;
    }

    if (organisationId) {
      matchStage.organisationId = new PlatformInvoice.base.Types.ObjectId(organisationId);
    }

    if (orderId) {
      matchStage.orderId = new PlatformInvoice.base.Types.ObjectId(orderId);
    }

    if (search && search.trim() !== '') {
      const term = search.trim();
      matchStage.$or = [
        { invoiceNumber: { $regex: term, $options: 'i' } },
        { gstin: { $regex: term, $options: 'i' } },
        { hsnSacCode: { $regex: term, $options: 'i' } },
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

    const [result] = await PlatformInvoice.aggregate(pipeline).exec();

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
   * Update Platform Invoice by ID.
   * @param {string} id
   * @param {Object} updateData
   * @param {ClientSession} [session=null]
   */
  async updateById(id, updateData, session = null) {
    const options = { new: true, runValidators: true };
    if (session) options.session = session;
    return await PlatformInvoice.findByIdAndUpdate(id, updateData, options).exec();
  }

  /**
   * Update Platform Invoice status by ID.
   * @param {string} id
   * @param {string} status
   * @param {ClientSession} [session=null]
   */
  async updateStatus(id, status, session = null) {
    const options = { new: true, runValidators: true };
    if (session) options.session = session;
    return await PlatformInvoice.findByIdAndUpdate(id, { status }, options).exec();
  }

  /**
   * Delete Platform Invoice by ID.
   * @param {string} id
   * @param {ClientSession} [session=null]
   */
  async deleteById(id, session = null) {
    const options = {};
    if (session) options.session = session;
    return await PlatformInvoice.findByIdAndDelete(id, options).exec();
  }
}

export default new PlatformInvoiceRepository();

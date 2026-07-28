import PlatformPayment from './platformPayment.model.js';
import IdempotencyError from './utils/idempotencyError.js';

class PlatformPaymentRepository {
  /**
   * Create a new Platform Payment.
   * Catches MongoDB Duplicate Key Error (Code 11000) and throws IdempotencyError.
   * 
   * @param {Object} paymentData
   * @param {ClientSession} [session=null]
   */
  async createPayment(paymentData, session = null) {
    try {
      const options = session ? { session } : {};
      const [created] = await PlatformPayment.create([paymentData], options);
      return created;
    } catch (error) {
      // Catch MongoDB Duplicate Key Error (Code 11000)
      if (error.code === 11000 || error.name === 'MongoServerError' && error.code === 11000) {
        throw new IdempotencyError(
          `Payment webhook event '${paymentData.gatewayEventId}' for transaction '${paymentData.gatewayTransactionId}' has already been processed.`,
          {
            gatewayEventId: paymentData.gatewayEventId,
            gatewayTransactionId: paymentData.gatewayTransactionId,
          }
        );
      }
      throw error;
    }
  }

  /**
   * Find Platform Payment by ID.
   * @param {string} id
   * @param {ClientSession} [session=null]
   */
  async findById(id, session = null) {
    const query = PlatformPayment.findById(id)
      .populate('orderId')
      .populate('invoiceId');
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find Platform Payment by gateway event ID & transaction ID.
   * @param {string} gatewayEventId
   * @param {string} gatewayTransactionId
   * @param {ClientSession} [session=null]
   */
  async findByGatewayEventAndTransaction(gatewayEventId, gatewayTransactionId, session = null) {
    const query = PlatformPayment.findOne({ gatewayEventId, gatewayTransactionId })
      .populate('orderId')
      .populate('invoiceId');
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find Platform Payment by order ID.
   * @param {string} orderId
   * @param {ClientSession} [session=null]
   */
  async findByOrderId(orderId, session = null) {
    const query = PlatformPayment.find({ orderId })
      .populate('invoiceId');
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find Platform Payment by invoice ID.
   * @param {string} invoiceId
   * @param {ClientSession} [session=null]
   */
  async findByInvoiceId(invoiceId, session = null) {
    const query = PlatformPayment.find({ invoiceId })
      .populate('orderId');
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find all Platform Payments using Mongoose Aggregation Pipeline ($facet)
   * for single round-trip pagination and count querying.
   * @param {Object} queryOptions
   */
  async findAllPaginated({ page = 1, limit = 10, search = '', status, orderId, invoiceId }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const matchStage = {};

    if (status) {
      matchStage.status = status;
    }

    if (orderId) {
      matchStage.orderId = new PlatformPayment.base.Types.ObjectId(orderId);
    }

    if (invoiceId) {
      matchStage.invoiceId = new PlatformPayment.base.Types.ObjectId(invoiceId);
    }

    if (search && search.trim() !== '') {
      const term = search.trim();
      matchStage.$or = [
        { gatewayTransactionId: { $regex: term, $options: 'i' } },
        { gatewayEventId: { $regex: term, $options: 'i' } },
        { paymentMethod: { $regex: term, $options: 'i' } },
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

    const [result] = await PlatformPayment.aggregate(pipeline).exec();

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
   * Update Platform Payment status by ID.
   * @param {string} id
   * @param {string} status
   * @param {ClientSession} [session=null]
   */
  async updateStatus(id, status, session = null) {
    const options = { new: true, runValidators: true };
    if (session) options.session = session;
    return await PlatformPayment.findByIdAndUpdate(id, { status }, options).exec();
  }
}

export default new PlatformPaymentRepository();

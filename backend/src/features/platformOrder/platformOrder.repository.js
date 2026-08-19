import PlatformOrder from './platformOrder.model.js';
import OrderTimeline from './orderTimeline.model.js';
import OrderAmendment from './orderAmendment.model.js';
import BillingSchedule from './billingSchedule.model.js';

export class PlatformOrderRepository {
  /**
   * Create a new order.
   * @param {Object} orderData
   * @param {mongoose.ClientSession} [session]
   */
  async create(orderData, session = null) {
    const options = session ? { session } : {};
    const [order] = await PlatformOrder.create([orderData], options);
    return order;
  }

  /**
   * Find order by _id or orderNumber.
   * @param {string} id
   * @param {mongoose.ClientSession} [session]
   */
  async findById(id, session = null) {
    const query = PlatformOrder.findById(id)
      .populate('quoteId')
      .populate('accountManagerId', 'name email role')
      .populate('implementationManagerId', 'name email role');
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find order by quoteId.
   * @param {string|ObjectId} quoteId
   */
  async findByQuoteId(quoteId) {
    if (!quoteId) return null;
    const isObjId = mongoose.Types.ObjectId.isValid(quoteId);
    return await PlatformOrder.findOne({
      $or: [
        { quoteId: quoteId },
        ...(isObjId ? [{ quoteId: new mongoose.Types.ObjectId(String(quoteId)) }] : [])
      ]
    })
      .populate('quoteId')
      .exec();
  }

  /**
   * Find order by conversionId idempotency key.
   * @param {string} conversionId
   */
  async findByConversionId(conversionId) {
    return await PlatformOrder.findOne({ conversionId }).exec();
  }

  /**
   * Update order by ID.
   * @param {string} id
   * @param {Object} updateData
   * @param {mongoose.ClientSession} [session]
   */
  async updateById(id, updateData, session = null) {
    const options = { returnDocument: 'after', runValidators: true };
    if (session) options.session = session;
    return await PlatformOrder.findByIdAndUpdate(id, updateData, options);
  }

  /**
   * Create Timeline event.
   * @param {Object} eventData
   * @param {mongoose.ClientSession} [session]
   */
  async createTimelineEvent(eventData, session = null) {
    const options = session ? { session } : {};
    const [event] = await OrderTimeline.create([eventData], options);
    return event;
  }

  /**
   * Find Order Timeline events.
   * @param {string} orderId
   */
  async findTimelineByOrderId(orderId) {
    return await OrderTimeline.find({ orderId })
      .sort({ timestamp: -1 })
      .exec();
  }

  /**
   * Create Order Amendment record (Mandatory Correction 1).
   * @param {Object} amendmentData
   * @param {mongoose.ClientSession} [session]
   */
  async createAmendment(amendmentData, session = null) {
    const options = session ? { session } : {};
    const [amendment] = await OrderAmendment.create([amendmentData], options);
    return amendment;
  }

  /**
   * Find Amendments for an order.
   * @param {string} orderId
   */
  async findAmendmentsByOrderId(orderId) {
    return await OrderAmendment.find({ orderId })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Bulk create Billing Schedule items (Mandatory Correction 3).
   * @param {Array<Object>} schedules
   * @param {mongoose.ClientSession} [session]
   */
  async createBillingSchedules(schedules, session = null) {
    const options = session ? { session } : {};
    return await BillingSchedule.insertMany(schedules, options);
  }

  /**
   * Get Billing Schedules for an order.
   * @param {string} orderId
   */
  async findBillingSchedulesByOrderId(orderId) {
    return await BillingSchedule.find({ orderId })
      .sort({ installmentNumber: 1 })
      .exec();
  }

  /**
   * Find paginated list of orders.
   * @param {Object} params
   */
  async getOrdersPaginated({ page = 1, limit = 10, organizationId, status, search }) {
    const numericPage = Math.max(1, parseInt(page, 10) || 1);
    const numericLimit = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (numericPage - 1) * numericLimit;

    const matchStage = {};
    if (organizationId) matchStage.organizationId = typeof organizationId === 'string' && organizationId.length === 24 ? new mongoose.Types.ObjectId(organizationId) : organizationId;
    if (status) matchStage.status = status;
    if (search) {
      matchStage.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customerSnapshot.customerName': { $regex: search, $options: 'i' } },
        { 'communitySnapshot.organizationName': { $regex: search, $options: 'i' } },
      ];
    }

    const result = await PlatformOrder.aggregate([
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'organizations',
          localField: 'organizationId',
          foreignField: '_id',
          as: 'organizationId'
        }
      },
      {
        $unwind: {
          path: '$organizationId',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'platformquotes',
          localField: 'quoteId',
          foreignField: '_id',
          as: 'quoteId'
        }
      },
      {
        $unwind: {
          path: '$quoteId',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: numericLimit }],
          totalCount: [{ $count: 'count' }],
        },
      },
    ]);

    const data = result[0]?.data || [];
    const totalRecords = result[0]?.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalRecords / numericLimit) || 1;

    return {
      data,
      totalRecords,
      currentPage: numericPage,
      totalPages,
    };
  }
}

export default new PlatformOrderRepository();

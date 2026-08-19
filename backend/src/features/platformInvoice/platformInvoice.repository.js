import PlatformInvoice from './platformInvoice.model.js';
import InvoiceSequence from './invoiceSequence.model.js';

export class PlatformInvoiceRepository {
  /**
   * Sequence-Safe Invoice Number Generator inside Transaction (Mandatory Correction 2).
   * @param {string} organizationId
   * @param {mongoose.ClientSession} [session]
   */
  async getNextInvoiceNumber(organizationId, session = null) {
    const year = new Date().getFullYear();
    const options = { new: true, upsert: true };
    if (session) options.session = session;

    // Default system org fallback if organizationId is null
    const targetOrgId = organizationId || '000000000000000000000000';

    const sequence = await InvoiceSequence.findOneAndUpdate(
      { organizationId: targetOrgId, year },
      { $inc: { currentNumber: 1 } },
      options
    );

    const formattedNum = String(sequence.currentNumber).padStart(6, '0');
    return `INV-${year}-${formattedNum}`;
  }

  /**
   * Create new invoice.
   * @param {Object} invoiceData
   * @param {mongoose.ClientSession} [session]
   */
  async create(invoiceData, session = null) {
    const options = session ? { session } : {};
    const [invoice] = await PlatformInvoice.create([invoiceData], options);
    return invoice;
  }

  /**
   * Find invoice by ID.
   * @param {string} id
   */
  async findById(id) {
    return await PlatformInvoice.findById(id)
      .populate('orderId')
      .exec();
  }

  /**
   * Find invoices by order ID.
   * @param {string} orderId
   */
  async findByOrderId(orderId) {
    return await PlatformInvoice.find({ orderId })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Update invoice by ID.
   * @param {string} id
   * @param {Object} updateData
   * @param {mongoose.ClientSession} [session]
   */
  async updateById(id, updateData, session = null) {
    const options = { returnDocument: 'after', runValidators: true };
    if (session) options.session = session;
    return await PlatformInvoice.findByIdAndUpdate(id, updateData, options);
  }

  /**
   * Paginated Invoices List.
   * @param {Object} params
   */
  async getInvoicesPaginated({ page = 1, limit = 10, orderId, organizationId, status, search }) {
    const numericPage = Math.max(1, parseInt(page, 10) || 1);
    const numericLimit = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (numericPage - 1) * numericLimit;

    const matchStage = {};
    if (orderId) matchStage.orderId = typeof orderId === 'string' && orderId.length === 24 ? new mongoose.Types.ObjectId(orderId) : orderId;
    if (organizationId) matchStage.organizationId = typeof organizationId === 'string' && organizationId.length === 24 ? new mongoose.Types.ObjectId(organizationId) : organizationId;
    if (status) matchStage.status = status;
    if (search) {
      matchStage.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'customerSnapshot.customerName': { $regex: search, $options: 'i' } },
      ];
    }

    const result = await PlatformInvoice.aggregate([
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
          from: 'platformorders',
          localField: 'orderId',
          foreignField: '_id',
          as: 'orderId'
        }
      },
      {
        $unwind: {
          path: '$orderId',
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

export default new PlatformInvoiceRepository();

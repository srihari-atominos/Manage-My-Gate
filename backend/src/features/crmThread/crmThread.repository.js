import CrmThread from './crmThread.model.js';
import mongoose from 'mongoose';

export class CrmThreadRepository {
  /**
   * Create a new CRM Thread for an inquiry.
   * @param {Object} threadData
   * @param {mongoose.ClientSession} [session]
   */
  async create(threadData, session = null) {
    const options = session ? { session } : {};
    const [thread] = await CrmThread.create([threadData], options);
    return thread;
  }

  /**
   * Find thread by ID.
   * @param {string} id
   * @param {mongoose.ClientSession} [session]
   */
  async findById(id, session = null) {
    const query = CrmThread.findById(id)
      .populate('inquiryId', 'inquiryId customerName contactEmail status')
      .populate('messages.senderId', 'name email role');
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find thread by related inquiryId.
   * @param {string} inquiryId
   * @param {mongoose.ClientSession} [session]
   */
  async findByInquiryId(inquiryId, session = null) {
    const query = CrmThread.findOne({ inquiryId })
      .populate('inquiryId', 'inquiryId customerName contactEmail status')
      .populate('messages.senderId', 'name email role');
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Push a new message into the thread's messages array.
   * @param {string} threadId
   * @param {Object} messageData
   * @param {mongoose.ClientSession} [session]
   */
  async addMessage(threadId, messageData, session = null) {
    const options = { new: true, runValidators: true };
    if (session) options.session = session;
    return await CrmThread.findByIdAndUpdate(
      threadId,
      { $push: { messages: messageData } },
      options
    )
      .populate('inquiryId', 'inquiryId customerName contactEmail status')
      .populate('messages.senderId', 'name email role');
  }

  /**
   * Get threads with aggregation $facet pagination.
   * @param {Object} params
   * @param {number} [params.page=1]
   * @param {number} [params.limit=10]
   * @param {string} [params.inquiryId]
   */
  async getThreadsPaginated({ page = 1, limit = 10, inquiryId }) {
    const numericPage = Math.max(1, parseInt(page, 10) || 1);
    const numericLimit = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (numericPage - 1) * numericLimit;

    const matchStage = {};
    if (inquiryId && mongoose.Types.ObjectId.isValid(inquiryId)) {
      matchStage.inquiryId = new mongoose.Types.ObjectId(inquiryId);
    }

    const pipeline = [
      { $match: matchStage },
      { $sort: { updatedAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: numericLimit },
            {
              $lookup: {
                from: 'crminquiries',
                localField: 'inquiryId',
                foreignField: '_id',
                as: 'inquiry',
              },
            },
            {
              $unwind: {
                path: '$inquiry',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                inquiryId: 1,
                messages: 1,
                createdAt: 1,
                updatedAt: 1,
                inquiry: {
                  _id: '$inquiry._id',
                  inquiryId: '$inquiry.inquiryId',
                  customerName: '$inquiry.customerName',
                  contactEmail: '$inquiry.contactEmail',
                  status: '$inquiry.status',
                },
              },
            },
          ],
          totalCount: [{ $count: 'count' }],
        },
      },
    ];

    const result = await CrmThread.aggregate(pipeline);
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

  /**
   * Delete thread by ID.
   * @param {string} id
   * @param {mongoose.ClientSession} [session]
   */
  async deleteById(id, session = null) {
    const options = session ? { session } : {};
    return await CrmThread.findByIdAndDelete(id, options);
  }
}

export default new CrmThreadRepository();

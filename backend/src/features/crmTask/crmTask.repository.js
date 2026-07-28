import CrmTask from './crmTask.model.js';
import mongoose from 'mongoose';

export class CrmTaskRepository {
  /**
   * Create a new CRM Task.
   * @param {Object} taskData
   * @param {mongoose.ClientSession} [session]
   */
  async create(taskData, session = null) {
    const options = session ? { session } : {};
    const [task] = await CrmTask.create([taskData], options);
    return task;
  }

  /**
   * Find task by MongoDB _id.
   * @param {string} id
   * @param {mongoose.ClientSession} [session]
   */
  async findById(id, session = null) {
    const query = CrmTask.findById(id)
      .populate('relatedInquiryId', 'inquiryId customerName contactEmail status')
      .populate('assignedTo', 'name email role status');
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Get tasks using Mongoose $facet aggregation pipeline in a single DB round-trip.
   * @param {Object} params
   * @param {number} [params.page=1]
   * @param {number} [params.limit=10]
   * @param {string} [params.status]
   * @param {string} [params.assignedTo]
   * @param {string} [params.relatedInquiryId]
   * @param {string} [params.search]
   */
  async getTasksPaginated({ page = 1, limit = 10, status, assignedTo, relatedInquiryId, search }) {
    const numericPage = Math.max(1, parseInt(page, 10) || 1);
    const numericLimit = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (numericPage - 1) * numericLimit;

    const matchStage = {};

    if (status) {
      matchStage.status = status;
    }

    if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) {
      matchStage.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    }

    if (relatedInquiryId && mongoose.Types.ObjectId.isValid(relatedInquiryId)) {
      matchStage.relatedInquiryId = new mongoose.Types.ObjectId(relatedInquiryId);
    }

    if (search) {
      matchStage.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const pipeline = [
      { $match: matchStage },
      { $sort: { dueDate: 1, createdAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: numericLimit },
            {
              $lookup: {
                from: 'crminquiries',
                localField: 'relatedInquiryId',
                foreignField: '_id',
                as: 'relatedInquiry',
              },
            },
            {
              $unwind: {
                path: '$relatedInquiry',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: 'users',
                localField: 'assignedTo',
                foreignField: '_id',
                as: 'assignedUser',
              },
            },
            {
              $unwind: {
                path: '$assignedUser',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                title: 1,
                description: 1,
                status: 1,
                dueDate: 1,
                createdAt: 1,
                updatedAt: 1,
                relatedInquiry: {
                  _id: '$relatedInquiry._id',
                  inquiryId: '$relatedInquiry.inquiryId',
                  customerName: '$relatedInquiry.customerName',
                  contactEmail: '$relatedInquiry.contactEmail',
                  status: '$relatedInquiry.status',
                },
                assignedTo: {
                  _id: '$assignedUser._id',
                  name: '$assignedUser.name',
                  email: '$assignedUser.email',
                  role: '$assignedUser.role',
                },
              },
            },
          ],
          totalCount: [{ $count: 'count' }],
        },
      },
    ];

    const result = await CrmTask.aggregate(pipeline);
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
   * Update task by ID.
   * @param {string} id
   * @param {Object} updateData
   * @param {mongoose.ClientSession} [session]
   */
  async updateById(id, updateData, session = null) {
    const options = { new: true, runValidators: true };
    if (session) options.session = session;
    return await CrmTask.findByIdAndUpdate(id, updateData, options)
      .populate('relatedInquiryId', 'inquiryId customerName contactEmail status')
      .populate('assignedTo', 'name email role status');
  }

  /**
   * Delete task by ID.
   * @param {string} id
   * @param {mongoose.ClientSession} [session]
   */
  async deleteById(id, session = null) {
    const options = session ? { session } : {};
    return await CrmTask.findByIdAndDelete(id, options);
  }
}

export default new CrmTaskRepository();

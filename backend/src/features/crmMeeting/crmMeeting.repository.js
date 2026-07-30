import CrmMeeting from './crmMeeting.model.js';
import mongoose from 'mongoose';

export class CrmMeetingRepository {
  /**
   * Create a new CRM Meeting.
   * @param {Object} meetingData
   * @param {mongoose.ClientSession} [session]
   */
  async create(meetingData, session = null) {
    const options = session ? { session } : {};
    const [meeting] = await CrmMeeting.create([meetingData], options);
    return meeting;
  }

  /**
   * Find meeting by MongoDB _id.
   * @param {string} id
   * @param {mongoose.ClientSession} [session]
   */
  async findById(id, session = null) {
    const query = CrmMeeting.findById(id)
      .populate('inquiryId', 'inquiryId customerName contactEmail status')
      .populate('platformParticipants', 'name email username avatar');
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find overlapping active meetings for platform users.
   * @param {Array<string|mongoose.Types.ObjectId>} userIds
   * @param {Date} startTime
   * @param {Date} endTime
   * @param {string} [excludeId]
   */
  async findOverlappingMeetings(userIds, startTime, endTime, excludeId = null) {
    const objectIds = userIds.map((id) => (typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id));
    const query = {
      status: { $ne: 'CANCELLED' },
      platformParticipants: { $in: objectIds },
      startTime: { $lt: new Date(endTime) },
      endTime: { $gt: new Date(startTime) },
    };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    return await CrmMeeting.find(query).exec();
  }

  /**
   * Get meetings with aggregation $facet pagination.
   * @param {Object} params
   * @param {number} [params.page=1]
   * @param {number} [params.limit=10]
   * @param {string} [params.status]
   * @param {string} [params.inquiryId]
   * @param {string} [params.search]
   */
  async getMeetingsPaginated({ page = 1, limit = 10, status, inquiryId, search }) {
    const numericPage = Math.max(1, parseInt(page, 10) || 1);
    const numericLimit = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (numericPage - 1) * numericLimit;

    const matchStage = {};

    if (status) {
      matchStage.status = status;
    }

    if (inquiryId && mongoose.Types.ObjectId.isValid(inquiryId)) {
      matchStage.inquiryId = new mongoose.Types.ObjectId(inquiryId);
    }

    if (search) {
      matchStage.title = { $regex: search, $options: 'i' };
    }

    const pipeline = [
      { $match: matchStage },
      { $sort: { startTime: 1, createdAt: -1 } },
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
                title: 1,
                startTime: 1,
                endTime: 1,
                platformParticipants: 1,
                customerParticipants: 1,
                googleMeetLink: 1,
                status: 1,
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

    const result = await CrmMeeting.aggregate(pipeline);
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
   * Update meeting by ID.
   * @param {string} id
   * @param {Object} updateData
   * @param {mongoose.ClientSession} [session]
   */
  async updateById(id, updateData, session = null) {
    const options = { new: true, runValidators: true };
    if (session) options.session = session;
    return await CrmMeeting.findByIdAndUpdate(id, updateData, options).populate('inquiryId', 'inquiryId customerName contactEmail status');
  }

  /**
   * Delete meeting by ID.
   * @param {string} id
   * @param {mongoose.ClientSession} [session]
   */
  async deleteById(id, session = null) {
    const options = session ? { session } : {};
    return await CrmMeeting.findByIdAndDelete(id, options);
  }
}

export default new CrmMeetingRepository();

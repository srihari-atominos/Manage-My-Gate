import CrmInquiry from './crmInquiry.model.js';
import mongoose from 'mongoose';

export class CrmInquiryRepository {
  /**
   * Create a new CRM Inquiry.
   * @param {Object} inquiryData
   * @param {mongoose.ClientSession} [session]
   */
  async create(inquiryData, session = null) {
    const options = session ? { session } : {};
    const [inquiry] = await CrmInquiry.create([inquiryData], options);
    return inquiry;
  }

  /**
   * Find inquiry by MongoDB _id.
   * @param {string} id
   * @param {mongoose.ClientSession} [session]
   */
  async findById(id, session = null) {
    const query = CrmInquiry.findById(id).populate('assignedAgentId', 'name email role status');
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find inquiry by unique inquiryId.
   * @param {string} inquiryId
   * @param {mongoose.ClientSession} [session]
   */
  async findByInquiryId(inquiryId, session = null) {
    const query = CrmInquiry.findOne({ inquiryId }).populate('assignedAgentId', 'name email role status');
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Get inquiries with aggregation $facet pagination.
   * @param {Object} params
   * @param {number} [params.page=1]
   * @param {number} [params.limit=10]
   * @param {string} [params.status]
   * @param {string} [params.assignedAgentId]
   * @param {string} [params.search]
   */
  async getInquiriesPaginated({ page = 1, limit = 10, status, assignedAgentId, search }) {
    const numericPage = Math.max(1, parseInt(page, 10) || 1);
    const numericLimit = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (numericPage - 1) * numericLimit;

    const matchStage = {};

    if (status) {
      matchStage.status = status;
    }

    if (assignedAgentId && mongoose.Types.ObjectId.isValid(assignedAgentId)) {
      matchStage.assignedAgentId = new mongoose.Types.ObjectId(assignedAgentId);
    }

    if (search) {
      matchStage.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { contactEmail: { $regex: search, $options: 'i' } },
        { contactPhone: { $regex: search, $options: 'i' } },
        { inquiryId: { $regex: search, $options: 'i' } },
      ];
    }

    const pipeline = [
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: numericLimit },
            {
              $lookup: {
                from: 'users',
                localField: 'assignedAgentId',
                foreignField: '_id',
                as: 'assignedAgent',
              },
            },
            {
              $unwind: {
                path: '$assignedAgent',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                inquiryId: 1,
                customerName: 1,
                contactName: '$customerName', // alias for frontend
                organizationName: 1,
                unitCount: 1,
                contactEmail: 1,
                email: '$contactEmail', // alias for frontend
                contactPhone: 1,
                phone: '$contactPhone', // alias for frontend
                status: 1,
                features: {
                  $cond: {
                    if: { $isArray: '$selectedFeatures' },
                    then: { $size: '$selectedFeatures' },
                    else: 0
                  }
                },
                selectedFeatures: 1,
                createdAt: 1,
                updatedAt: 1,
                assignedAgent: {
                  _id: '$assignedAgent._id',
                  name: '$assignedAgent.name',
                  email: '$assignedAgent.email',
                  role: '$assignedAgent.role',
                },
              },
            },
          ],
          totalCount: [{ $count: 'count' }],
        },
      },
    ];

    const result = await CrmInquiry.aggregate(pipeline);
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
   * Create an append-only InquiryTimeline event.
   * @param {Object} eventData
   * @param {mongoose.ClientSession} [session]
   */
  async createTimelineEvent(eventData, session = null) {
    const InquiryTimeline = (await import('./inquiryTimeline.model.js')).default;
    const options = session ? { session } : {};
    const [event] = await InquiryTimeline.create([eventData], options);
    return event;
  }

  /**
   * Find timeline events for a given inquiryId (sorted newest first).
   * @param {string} inquiryId - Database ID (_id)
   */
  async findTimelineByInquiryId(inquiryId) {
    const InquiryTimeline = (await import('./inquiryTimeline.model.js')).default;
    return await InquiryTimeline.find({ inquiryId })
      .sort({ timestamp: -1 })
      .populate('actorId', 'name email role')
      .exec();
  }

  /**
   * Update inquiry with atomic optimistic concurrency version lock.
   * @param {string} id
   * @param {string} currentStatus
   * @param {number} currentVersion
   * @param {Object} updateData
   * @param {mongoose.ClientSession} [session]
   */
  async updateWithVersionLock(id, currentStatus, currentVersion, updateData, session = null) {
    const options = { returnDocument: 'after', runValidators: true };
    if (session) options.session = session;

    const filter = {
      _id: id,
      status: currentStatus,
      version: currentVersion,
    };

    const update = {
      $set: updateData,
      $inc: { version: 1 },
    };

    return await CrmInquiry.findOneAndUpdate(filter, update, options)
      .populate('assignedAgentId', 'name email role status')
      .populate('primaryOwnerId', 'name email role status');
  }

  /**
   * Search for possible duplicate inquiry matching email and community/org name.
   * @param {string} contactEmail
   * @param {string} organizationName
   */
  async findPossibleDuplicate(contactEmail, organizationName) {
    if (!contactEmail || !organizationName) return null;
    return await CrmInquiry.findOne({
      contactEmail: contactEmail.toLowerCase().trim(),
      organizationName: { $regex: new RegExp(`^${organizationName.trim()}$`, 'i') },
      isArchived: false,
    }).exec();
  }

  /**
   * Update inquiry by ID.
   * @param {string} id
   * @param {Object} updateData
   * @param {mongoose.ClientSession} [session]
   */
  async updateById(id, updateData, session = null) {
    const options = { returnDocument: 'after', runValidators: true };
    if (session) options.session = session;
    return await CrmInquiry.findByIdAndUpdate(id, updateData, options).populate('assignedAgentId', 'name email role status');
  }

  /**
   * Delete inquiry by ID.
   * @param {string} id
   * @param {mongoose.ClientSession} [session]
   */
  async deleteById(id, session = null) {
    const options = session ? { session } : {};
    return await CrmInquiry.findByIdAndDelete(id, options);
  }
}

export default new CrmInquiryRepository();

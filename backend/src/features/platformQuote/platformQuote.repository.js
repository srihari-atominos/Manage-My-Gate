import PlatformQuote from './platformQuote.model.js';
import QuoteTimeline from './quoteTimeline.model.js';
import QuoteApproval from './quoteApproval.model.js';

export class PlatformQuoteRepository {
  /**
   * Create a new Platform Quote.
   * @param {Object} quoteData
   * @param {mongoose.ClientSession} [session]
   */
  async create(quoteData, session = null) {
    const options = session ? { session } : {};
    const [quote] = await PlatformQuote.create([quoteData], options);
    return quote;
  }

  /**
   * Find quote by MongoDB _id.
   * @param {string} id
   * @param {mongoose.ClientSession} [session]
   */
  async findById(id, session = null) {
    const query = PlatformQuote.findById(id)
      .populate('inquiryId')
      .populate('createdBy', 'name email role')
      .populate('approvedBy', 'name email role');
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find quote by quoteNumber.
   * @param {string} quoteNumber
   * @param {mongoose.ClientSession} [session]
   */
  async findByQuoteNumber(quoteNumber, session = null) {
    const query = PlatformQuote.findOne({ quoteNumber })
      .populate('inquiryId')
      .populate('createdBy', 'name email role')
      .populate('approvedBy', 'name email role');
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find quote by SHA-256 acceptance token hash.
   * @param {string} acceptanceTokenHash
   */
  async findByAcceptanceTokenHash(acceptanceTokenHash) {
    return await PlatformQuote.findOne({ acceptanceTokenHash })
      .populate('inquiryId')
      .exec();
  }

  /**
   * Find all versions in a version group code.
   * @param {string} versionGroupCode
   */
  async findByVersionGroupCode(versionGroupCode) {
    return await PlatformQuote.find({ versionGroupCode })
      .sort({ versionNumber: -1 })
      .exec();
  }

  /**
   * Find latest quote by inquiryId.
   * @param {string|ObjectId} inquiryId
   */
  async findLatestByInquiryId(inquiryId) {
    if (!inquiryId) return null;
    const isObjId = mongoose.Types.ObjectId.isValid(inquiryId);
    return await PlatformQuote.findOne({
      $or: [
        { inquiryId: inquiryId },
        ...(isObjId ? [{ inquiryId: new mongoose.Types.ObjectId(String(inquiryId)) }] : [])
      ]
    })
      .sort({ versionNumber: -1, createdAt: -1 })
      .exec();
  }

  /**
   * Transactionally mark all existing versions in a group as isLatestVersion = false (Mandatory Correction 3).
   * @param {string} versionGroupCode
   * @param {mongoose.ClientSession} [session]
   */
  async archivePreviousVersionsInGroup(versionGroupCode, session = null) {
    const options = session ? { session } : {};
    return await PlatformQuote.updateMany(
      { versionGroupCode, isLatestVersion: true },
      { $set: { isLatestVersion: false } },
      options
    );
  }

  /**
   * Update quote with atomic optimistic concurrency version lock.
   * @param {string} id
   * @param {number} currentVersion
   * @param {Object} updateData
   * @param {mongoose.ClientSession} [session]
   */
  async updateWithVersionLock(id, currentVersion, updateData, session = null) {
    const options = { returnDocument: 'after', runValidators: true };
    if (session) options.session = session;

    const filter = {
      _id: id,
      version: currentVersion,
    };

    const update = {
      $set: updateData,
      $inc: { version: 1 },
    };

    return await PlatformQuote.findOneAndUpdate(filter, update, options)
      .populate('inquiryId')
      .populate('createdBy', 'name email role')
      .populate('approvedBy', 'name email role');
  }

  /**
   * Update quote by ID without version lock.
   * @param {string} id
   * @param {Object} updateData
   * @param {mongoose.ClientSession} [session]
   */
  async updateById(id, updateData, session = null) {
    const options = { returnDocument: 'after', runValidators: true };
    if (session) options.session = session;
    return await PlatformQuote.findByIdAndUpdate(id, updateData, options);
  }

  /**
   * Create an append-only QuoteTimeline event.
   * @param {Object} eventData
   * @param {mongoose.ClientSession} [session]
   */
  async createTimelineEvent(eventData, session = null) {
    const options = session ? { session } : {};
    const [event] = await QuoteTimeline.create([eventData], options);
    return event;
  }

  /**
   * Find timeline events for a quote.
   * @param {string} quoteId
   */
  async findTimelineByQuoteId(quoteId) {
    return await QuoteTimeline.find({ quoteId })
      .sort({ timestamp: -1 })
      .populate('actorId', 'name email role')
      .exec();
  }

  /**
   * Create a QuoteApproval history record (Mandatory Correction 4).
   * @param {Object} approvalData
   * @param {mongoose.ClientSession} [session]
   */
  async createApprovalRecord(approvalData, session = null) {
    const options = session ? { session } : {};
    const [record] = await QuoteApproval.create([approvalData], options);
    return record;
  }

  /**
   * Find approval records for a quote.
   * @param {string} quoteId
   */
  async findApprovalsByQuoteId(quoteId) {
    return await QuoteApproval.find({ quoteId })
      .sort({ requestedAt: -1 })
      .populate('requestedBy', 'name email role')
      .populate('approvedBy', 'name email role')
      .exec();
  }

  /**
   * Find paginated list of quotes.
   * @param {Object} params
   */
  async getQuotesPaginated({ page = 1, limit = 10, inquiryId, organizationId, status, search }) {
    const numericPage = Math.max(1, parseInt(page, 10) || 1);
    const numericLimit = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (numericPage - 1) * numericLimit;

    const matchStage = { isLatestVersion: true };
    if (inquiryId) matchStage.inquiryId = typeof inquiryId === 'string' && inquiryId.length === 24 ? new mongoose.Types.ObjectId(inquiryId) : inquiryId;
    if (organizationId) matchStage.organizationId = typeof organizationId === 'string' && organizationId.length === 24 ? new mongoose.Types.ObjectId(organizationId) : organizationId;
    if (status) matchStage.status = status;

    if (search) {
      matchStage.$or = [
        { quoteNumber: { $regex: search, $options: 'i' } },
        { 'customerSnapshot.customerName': { $regex: search, $options: 'i' } },
        { 'communitySnapshot.organizationName': { $regex: search, $options: 'i' } },
      ];
    }

    const result = await PlatformQuote.aggregate([
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
          from: 'crminquiries',
          localField: 'inquiryId',
          foreignField: '_id',
          as: 'inquiryId'
        }
      },
      {
        $unwind: {
          path: '$inquiryId',
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

export default new PlatformQuoteRepository();

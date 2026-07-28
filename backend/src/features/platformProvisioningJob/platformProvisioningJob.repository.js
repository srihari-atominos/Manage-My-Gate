import PlatformProvisioningJob from './platformProvisioningJob.model.js';

class PlatformProvisioningJobRepository {
  /**
   * Create a new provisioning job.
   * @param {Object} jobData
   * @param {ClientSession} [session=null]
   */
  async create(jobData, session = null) {
    const options = session ? { session } : {};
    const [created] = await PlatformProvisioningJob.create([jobData], options);
    return created;
  }

  /**
   * Find job by Mongoose ObjectId.
   * @param {string} id
   * @param {ClientSession} [session=null]
   */
  async findById(id, session = null) {
    const query = PlatformProvisioningJob.findById(id)
      .populate('orderId')
      .populate('paymentId')
      .populate('organisationId');
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find job by custom string jobId.
   * @param {string} jobId
   * @param {ClientSession} [session=null]
   */
  async findByJobId(jobId, session = null) {
    const query = PlatformProvisioningJob.findOne({ jobId })
      .populate('orderId')
      .populate('paymentId')
      .populate('organisationId');
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find job by order ID.
   * @param {string} orderId
   * @param {ClientSession} [session=null]
   */
  async findByOrderId(orderId, session = null) {
    const query = PlatformProvisioningJob.findOne({ orderId });
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find jobs ready for processing (PENDING or RETRY_PENDING with nextRetryAt <= now).
   * @param {number} [limit=10]
   * @param {ClientSession} [session=null]
   */
  async findPendingOrRetryJobs(limit = 10, session = null) {
    const now = new Date();
    const query = PlatformProvisioningJob.find({
      $or: [
        { status: 'PENDING' },
        {
          status: 'RETRY_PENDING',
          $or: [{ nextRetryAt: { $lte: now } }, { nextRetryAt: null }],
        },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(limit);

    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find all Platform Provisioning Jobs using Mongoose Aggregation Pipeline ($facet)
   * for single round-trip pagination and count querying.
   * @param {Object} queryOptions
   */
  async findAllPaginated({ page = 1, limit = 10, search = '', status, orderId, organisationId }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const matchStage = {};

    if (status) {
      matchStage.status = status;
    }

    if (organisationId) {
      matchStage.organisationId = new PlatformProvisioningJob.base.Types.ObjectId(organisationId);
    }

    if (orderId) {
      matchStage.orderId = new PlatformProvisioningJob.base.Types.ObjectId(orderId);
    }

    if (search && search.trim() !== '') {
      const term = search.trim();
      matchStage.$or = [
        { jobId: { $regex: term, $options: 'i' } },
        { currentStep: { $regex: term, $options: 'i' } },
        { lastError: { $regex: term, $options: 'i' } },
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

    const [result] = await PlatformProvisioningJob.aggregate(pipeline).exec();

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
   * Update job by ID.
   * @param {string} id
   * @param {Object} updateData
   * @param {ClientSession} [session=null]
   */
  async updateById(id, updateData, session = null) {
    const options = { new: true, runValidators: true };
    if (session) options.session = session;
    return await PlatformProvisioningJob.findByIdAndUpdate(id, updateData, options).exec();
  }

  /**
   * Delete job by ID.
   * @param {string} id
   * @param {ClientSession} [session=null]
   */
  async deleteById(id, session = null) {
    const options = {};
    if (session) options.session = session;
    return await PlatformProvisioningJob.findByIdAndDelete(id, options).exec();
  }
}

export default new PlatformProvisioningJobRepository();

import PlatformEntitlement from './platformEntitlement.model.js';

class PlatformEntitlementRepository {
  /**
   * Create a new entitlement record.
   * @param {Object} entitlementData
   * @param {ClientSession} [session=null]
   */
  async create(entitlementData, session = null) {
    const options = session ? { session } : {};
    const [created] = await PlatformEntitlement.create([entitlementData], options);
    return created;
  }

  /**
   * Find entitlement by ObjectId.
   * @param {string} id
   * @param {ClientSession} [session=null]
   */
  async findById(id, session = null) {
    const query = PlatformEntitlement.findById(id)
      .populate('organisationId', 'name email code')
      .populate('subscriptionId');
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find entitlement by Organisation ID and Feature Key.
   * @param {string} organisationId
   * @param {string} featureKey
   * @param {ClientSession} [session=null]
   */
  async findByOrgAndFeature(organisationId, featureKey, session = null) {
    const query = PlatformEntitlement.findOne({ organisationId, featureKey });
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find all entitlements for an Organization.
   * @param {string} organisationId
   * @param {ClientSession} [session=null]
   */
  async findByOrganisationId(organisationId, session = null) {
    const query = PlatformEntitlement.find({ organisationId }).populate('subscriptionId');
    if (session) query.session(session);
    return await query.exec();
  }

  /**
   * Find all platform entitlements using Mongoose Aggregation Pipeline ($facet)
   * for single round-trip pagination and count querying.
   * @param {Object} queryOptions
   */
  async findAllPaginated({ page = 1, limit = 10, search = '', status, organisationId, featureKey }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const matchStage = {};

    if (status) {
      matchStage.status = status;
    }

    if (featureKey) {
      matchStage.featureKey = featureKey;
    }

    if (organisationId) {
      matchStage.organisationId = new PlatformEntitlement.base.Types.ObjectId(organisationId);
    }

    if (search && search.trim() !== '') {
      const term = search.trim();
      matchStage.$or = [
        { featureKey: { $regex: term, $options: 'i' } },
        { status: { $regex: term, $options: 'i' } },
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

    const [result] = await PlatformEntitlement.aggregate(pipeline).exec();

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
   * Upsert entitlement record by organisationId and featureKey.
   * @param {string} organisationId
   * @param {string} featureKey
   * @param {Object} updateData
   * @param {ClientSession} [session=null]
   */
  async upsertEntitlement(organisationId, featureKey, updateData, session = null) {
    const options = { new: true, upsert: true, runValidators: true };
    if (session) options.session = session;
    return await PlatformEntitlement.findOneAndUpdate(
      { organisationId, featureKey },
      { $set: updateData },
      options
    ).exec();
  }

  /**
   * Update entitlement by ID.
   * @param {string} id
   * @param {Object} updateData
   * @param {ClientSession} [session=null]
   */
  async updateById(id, updateData, session = null) {
    const options = { new: true, runValidators: true };
    if (session) options.session = session;
    return await PlatformEntitlement.findByIdAndUpdate(id, updateData, options).exec();
  }

  /**
   * Delete entitlement by ID.
   * @param {string} id
   * @param {ClientSession} [session=null]
   */
  async deleteById(id, session = null) {
    const options = {};
    if (session) options.session = session;
    return await PlatformEntitlement.findByIdAndDelete(id, options).exec();
  }
}

export default new PlatformEntitlementRepository();

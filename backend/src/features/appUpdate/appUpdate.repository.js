import AppUpdate, { RELEASE_STATUSES } from './appUpdate.model.js';

class AppUpdateRepository {
  /**
   * Find a release by platform, applicationId and versionCode
   */
  async findByPlatformAndVersionCode(platform, applicationId, versionCode, session = null) {
    return AppUpdate.findOne({ platform, applicationId, versionCode }).session(session);
  }

  /**
   * Find release by ID
   */
  async findById(id, session = null) {
    return AppUpdate.findById(id).session(session);
  }

  /**
   * Create a new release
   */
  async create(releaseData, session = null) {
    const [created] = await AppUpdate.create([releaseData], { session });
    return created;
  }

  /**
   * Update an existing release by ID
   */
  async updateById(id, updateData, session = null) {
    const hasOperators = Object.keys(updateData).some((k) => k.startsWith('$'));
    const atomicUpdate = hasOperators ? updateData : { $set: updateData };
    return AppUpdate.findByIdAndUpdate(id, atomicUpdate, { new: true, runValidators: true, session });
  }

  /**
   * Get the latest available release for an application and platform
   */
  async getLatestAvailableRelease(platform, applicationId) {
    return AppUpdate.findOne({
      platform,
      applicationId,
      status: RELEASE_STATUSES.AVAILABLE,
    })
      .sort({ versionCode: -1 })
      .lean();
  }

  /**
   * Get all available releases sorted descending by build versionCode
   */
  async getAvailableReleases(platform, applicationId) {
    return AppUpdate.find({
      platform,
      applicationId,
      status: RELEASE_STATUSES.AVAILABLE,
    })
      .sort({ versionCode: -1 })
      .lean();
  }

  /**
   * Query releases with pagination using aggregation pipeline ($facet)
   */
  async listReleases({ platform, applicationId, status, page = 1, limit = 10 }) {
    const match = {};
    if (platform) match.platform = platform;
    if (applicationId) match.applicationId = applicationId;
    if (status) match.status = status;

    const skip = (Math.max(1, page) - 1) * limit;

    const pipeline = [
      { $match: match },
      { $sort: { versionCode: -1, createdAt: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: 'count' }],
        },
      },
    ];

    const result = await AppUpdate.aggregate(pipeline);
    const releases = result[0]?.data || [];
    const totalRecords = result[0]?.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalRecords / limit) || 1;

    return {
      releases,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords,
        limit,
      },
    };
  }
}

export default new AppUpdateRepository();

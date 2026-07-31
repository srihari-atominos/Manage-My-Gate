import Organization from './organization.model.js';

export class OrganizationRepository {
  async create(orgData, session) {
    const organization = new Organization(orgData);
    return await organization.save(session ? { session } : undefined);
  }

  async findByName(name, session = null) {
    return await Organization.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    }).session(session);
  }

  async findById(id, session) {
    return await Organization.findById(id).session(session || null);
  }

  async updateAllowedFeatures(orgId, featuresArray, session = null) {
    return await Organization.findByIdAndUpdate(
      orgId,
      { $set: { allowedFeatures: featuresArray } },
      { returnDocument: 'after', runValidators: true, ...(session ? { session } : {}) }
    );
  }

  async findAllPaginated(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const matchQuery = { isPlatform: { $ne: true } };
    const result = await Organization.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: 'villas',
          localField: '_id',
          foreignField: 'orgId',
          as: 'villasList',
        },
      },
      {
        $lookup: {
          from: 'orgmemberships',
          localField: '_id',
          foreignField: 'orgId',
          as: 'membershipsList',
        },
      },
      {
        $addFields: {
          villaCount: { $size: '$villasList' },
          userCount: { $size: '$membershipsList' },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          status: 1,
          allowedFeatures: 1,
          isPlatform: 1,
          createdAt: 1,
          updatedAt: 1,
          villaCount: 1,
          userCount: 1,
        },
      },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },
    ]);
    const total = result[0]?.metadata[0]?.total || 0;
    const data = result[0]?.data || [];
    return {
      organizations: data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateStatus(orgId, status, session = null) {
    return await Organization.findByIdAndUpdate(
      orgId,
      { $set: { status } },
      { returnDocument: 'after', runValidators: true, ...(session ? { session } : {}) }
    );
  }

  async updateName(orgId, name, session = null) {
    return await Organization.findByIdAndUpdate(
      orgId,
      { $set: { name } },
      { returnDocument: 'after', runValidators: true, ...(session ? { session } : {}) }
    );
  }
}

export default new OrganizationRepository();

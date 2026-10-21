import mongoose from 'mongoose';
import EmergencySos from './emergencySos.model.js';

class EmergencySosRepository {
  /**
   * Create an emergency SOS record inside a session if provided.
   */
  async create(data, session = null) {
    const options = session ? { session } : {};
    const [created] = await EmergencySos.create([data], options);
    return created;
  }

  /**
   * Find an SOS record by ID.
   */
  async findById(id) {
    return await EmergencySos.findById(id)
      .populate('userId', 'name username email phone avatar')
      .populate('acknowledgedBy', 'name username role')
      .populate('resolvedBy', 'name username role')
      .lean();
  }

  /**
   * Find currently active SOS alert for a specific resident.
   */
  async findActiveByUser(userId, orgId) {
    return await EmergencySos.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      orgId: new mongoose.Types.ObjectId(orgId),
      status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] },
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Update an SOS record by ID with optional session.
   */
  async updateById(id, updateData, session = null) {
    const options = { new: true, ...(session ? { session } : {}) };
    return await EmergencySos.findByIdAndUpdate(id, updateData, options)
      .populate('userId', 'name username email phone avatar')
      .populate('acknowledgedBy', 'name username role')
      .populate('resolvedBy', 'name username role')
      .lean();
  }

  /**
   * Aggregation pipeline with $facet for paginated queries (admin / guard portal).
   */
  async listPaginated(orgId, filters = {}, skip = 0, limit = 20) {
    const match = { orgId: new mongoose.Types.ObjectId(orgId) };

    if (filters.status) {
      match.status = filters.status;
    }
    if (filters.alertType) {
      match.alertType = filters.alertType;
    }
    if (filters.unitNumber) {
      match.unitNumber = new RegExp(filters.unitNumber.trim(), 'i');
    }
    if (filters.search) {
      const searchRegex = new RegExp(filters.search.trim(), 'i');
      match.$or = [
        { residentName: searchRegex },
        { unitNumber: searchRegex },
        { residentPhone: searchRegex },
        { alertType: searchRegex },
      ];
    }

    const pipeline = [
      { $match: match },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'resident',
              },
            },
            {
              $unwind: {
                path: '$resident',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                _id: 1,
                orgId: 1,
                userId: 1,
                residentName: 1,
                residentPhone: 1,
                unitNumber: 1,
                blockOrBuilding: 1,
                alertType: 1,
                status: 1,
                coordinates: 1,
                address: 1,
                notes: 1,
                acknowledgedBy: 1,
                acknowledgedAt: 1,
                resolvedBy: 1,
                resolvedAt: 1,
                resolutionNotes: 1,
                createdAt: 1,
                updatedAt: 1,
                resident: {
                  _id: '$resident._id',
                  name: '$resident.name',
                  username: '$resident.username',
                  avatar: '$resident.avatar',
                  phone: '$resident.phone',
                },
              },
            },
          ],
        },
      },
    ];

    const [result] = await EmergencySos.aggregate(pipeline);
    const total = result?.metadata?.[0]?.total || 0;
    const records = result?.data || [];

    return { total, records };
  }
}

export default new EmergencySosRepository();

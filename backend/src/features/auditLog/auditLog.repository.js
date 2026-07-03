import AuditLog from './auditLog.model.js';

export class AuditLogRepository {
  /**
   * Creates an audit log record
   */
  async create(logData) {
    const log = new AuditLog(logData);
    return await log.save();
  }

  /**
   * Retrieves paginated audit logs with populated actor username/email in a single query
   */
  async findAllPaginated(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const result = await AuditLog.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'actorId',
          foreignField: '_id',
          as: 'actor',
        },
      },
      {
        $unwind: {
          path: '$actor',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                action: 1,
                targetId: 1,
                metadata: 1,
                ipAddress: 1,
                createdAt: 1,
                updatedAt: 1,
                'actor._id': 1,
                'actor.username': 1,
                'actor.email': 1,
              },
            },
          ],
        },
      },
    ]);

    const total = result[0]?.metadata[0]?.total || 0;
    const data = result[0]?.data || [];

    return {
      logs: data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export default new AuditLogRepository();

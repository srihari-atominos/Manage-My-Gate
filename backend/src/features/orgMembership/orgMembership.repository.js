import mongoose from 'mongoose';
import OrgMembership from './orgMembership.model.js';

export class OrgMembershipRepository {
  async create(membershipData, session) {
    const membership = new OrgMembership(membershipData);
    return await membership.save(session ? { session } : undefined);
  }

  async findByUserIdAndOrgId(userId, orgId, session) {
    return await OrgMembership.findOne({ userId, orgId }).session(session || null);
  }

  async findFirstByUserId(userId, session = null) {
    return await OrgMembership.findOne({ userId }).session(session || null);
  }

  async findByUserIdWithPopulate(userId, session = null) {
    return await OrgMembership.find({ userId })
      .populate({ path: 'orgId', select: 'name allowedFeatures status isPlatform' })
      .populate({ path: 'roleId', select: 'name' })
      .populate({ path: 'roleIds', select: 'name' })
      .session(session || null);
  }

  /**
   * Retrieves paginated users for a specific organization using aggregation pipeline.
   * @param {string} orgId - Organization ID
   * @param {number} page - Current page
   * @param {number} limit - Items per page
   * @returns {Promise<{ data: Array, totalRecords: number }>}
   */
  async findPaginatedUsersByOrg(orgId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const matchQuery = { orgId: new mongoose.Types.ObjectId(orgId) };

    const result = await OrgMembership.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $lookup: {
          from: 'roles',
          localField: 'roleIds',
          foreignField: '_id',
          as: 'rolesPopulated',
        },
      },
      {
        $lookup: {
          from: 'roles',
          localField: 'roleId',
          foreignField: '_id',
          as: 'rolePopulatedFallback',
        },
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $facet: {
          metadata: [{ $count: 'totalRecords' }],
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 0,
                id: '$user._id',
                username: '$user.username',
                email: '$user.email',
                role: {
                  $cond: {
                    if: { $gt: [{ $size: '$rolesPopulated' }, 0] },
                    then: {
                      $reduce: {
                        input: '$rolesPopulated.name',
                        initialValue: '',
                        in: {
                          $cond: [
                            { $eq: ['$$value', ''] },
                            '$$this',
                            { $concat: ['$$value', ', ', '$$this'] }
                          ]
                        }
                      }
                    },
                    else: { $ifNull: [{ $arrayElemAt: ['$rolePopulatedFallback.name', 0] }, ''] }
                  }
                },
                status: '$user.status',
              },
            },
          ],
        },
      },
    ]);

    const totalRecords = result[0]?.metadata[0]?.totalRecords || 0;
    const data = result[0]?.data || [];

    return {
      data,
      totalRecords,
    };
  }

  async updateRoles(userId, orgId, roleIds, session) {
    return await OrgMembership.findOneAndUpdate(
      { userId, orgId },
      { roleIds, roleId: roleIds.length > 0 ? roleIds[0] : null },
      { new: true, runValidators: true, session: session || null }
    );
  }

  async deleteByUserId(userId, session) {
    return await OrgMembership.deleteMany(
      { userId },
      session ? { session } : undefined
    );
  }

  async clearRoleFromMemberships(roleId, session) {
    return await OrgMembership.updateMany(
      { $or: [{ roleIds: roleId }, { roleId: roleId }] },
      { 
        $pull: { roleIds: roleId },
        $unset: { roleId: 1 }
      },
      { session: session || null }
    );
  }
}

export default new OrgMembershipRepository();


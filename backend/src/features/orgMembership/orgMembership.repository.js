import mongoose from 'mongoose';
import OrgMembership from './orgMembership.model.js';
import HttpError from '../../utils/httpError.utils.js';

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
      .populate({ path: 'orgId', select: 'name allowedFeatures status isPlatform countryCode' })
      .populate({ path: 'roleId', select: 'name' })
      .populate({ path: 'roleIds', select: 'name' })
      .populate({ path: 'villaId' })
      .populate({ path: 'units.villaId' })
      .populate({ path: 'assignments.roleId', select: 'name' })
      .session(session || null);
  }

  /**
   * Retrieves paginated users for a specific organization using aggregation pipeline.
   * @param {string} orgId - Organization ID
   * @param {number} page - Current page
   * @param {number} limit - Items per page
   * @returns {Promise<{ data: Array, totalRecords: number }>}
   */
  async findPaginatedUsersByOrg(orgId, page = 1, limit = 10, filters = {}) {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (safePage - 1) * safeLimit;
    const matchQuery = { orgId: new mongoose.Types.ObjectId(orgId) };

    const filterMatch = {};
    if (filters.search) {
      filterMatch.$or = [
        { 'user.username': { $regex: filters.search, $options: 'i' } },
        { 'user.email': { $regex: filters.search, $options: 'i' } },
        { 'user.name': { $regex: filters.search, $options: 'i' } },
      ];
    }
    if (filters.roles && filters.roles.length > 0) {
      filterMatch['rolesPopulated.name'] = { $in: filters.roles };
    }
    if (filters.status && filters.status.length > 0) {
      filterMatch['status'] = { $in: filters.status };
    }

    const pipeline = [
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
        $lookup: {
          from: 'villas',
          localField: 'villaId',
          foreignField: '_id',
          as: 'villa',
        },
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $unwind: {
          path: '$villa',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: '$user._id',
          user: { $first: '$user' },
          // We don't need $first for rolesPopulated globally, we compute the combined string per unit
          status: { $first: '$status' },
          assignedUnits: {
            $push: {
              $cond: [
                { $eq: [{ $ifNull: ['$villa._id', null] }, null] },
                '$$REMOVE',
                {
                  villaId: '$villa._id',
                  residentType: '$residentType',
                  villaNumber: '$villa.unitNumber',
                  villaBlock: '$villa.blockOrBuilding',
                  status: '$status',
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
                  }
                }
              ]
            }
          },
          // We still need a global role string for users without units (e.g. Community Admin)
          rolesPopulated: { $first: '$rolesPopulated' },
          rolePopulatedFallback: { $first: '$rolePopulatedFallback' }
        }
      },
    ];

    if (Object.keys(filterMatch).length > 0) {
      pipeline.push({ $match: filterMatch });
    }

    pipeline.push({
      $facet: {
        metadata: [{ $count: 'totalRecords' }],
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              id: '$_id',
              username: '$user.username',
              name: '$user.name',
              phone: '$user.phone',
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
              status: {
                $cond: [
                  {
                    $or: [
                      { $eq: ['$user.status', 'Pending Verification'] },
                      { $eq: ['$user.status', 'Pending'] },
                      { $eq: ['$status', 'Pending'] },
                    ],
                  },
                  'Pending',
                  { $ifNull: ['$status', 'Active'] },
                ],
              },
              assignedUnits: '$assignedUnits',
            },
          },
        ],
      },
    });

    const result = await OrgMembership.aggregate(pipeline);

    const totalRecords = result[0]?.metadata[0]?.totalRecords || 0;
    const data = result[0]?.data || [];

    return {
      data,
      totalRecords,
    };
  }

  async updateRoles(userId, orgId, roleIds, villaId = null, residentType = null, session = null) {
    const query = { userId, orgId };
    if (villaId) {
      query.$or = [{ villaId }, { 'units.villaId': villaId }];
    }
    
    const cleanRoleIds = (Array.isArray(roleIds) ? roleIds : [roleIds]).filter(Boolean);
    const updatePayload = { roleIds: cleanRoleIds, roleId: cleanRoleIds.length > 0 ? cleanRoleIds[0] : null };
    if (residentType) {
      updatePayload.residentType = residentType;
    }
    
    const membership = await OrgMembership.findOne(query).session(session || null);
    if (!membership) {
      return null;
    }

    membership.roleIds = cleanRoleIds;
    membership.roleId = cleanRoleIds.length > 0 ? cleanRoleIds[0] : null;
    if (residentType) {
      membership.residentType = residentType;
      if (membership.units && membership.units.length > 0) {
        if (villaId) {
          const uIdx = membership.units.findIndex(u => (u.villaId?._id || u.villaId).toString() === villaId.toString());
          if (uIdx > -1) {
            membership.units[uIdx].residentType = residentType;
          }
        } else {
          membership.units.forEach(u => {
            u.residentType = residentType;
          });
        }
      }
    }

    return await membership.save({ session: session || null });
  }

  async updateStatus(userId, orgId, status, session = null) {
    // A status change must always target exactly one (user, community) membership.
    // Without both ids this used to fall through to an updateMany over every
    // membership of the user (or of the whole community).
    if (!userId || !orgId) {
      throw new HttpError(400, 'Membership status change requires both a user and a community.');
    }
    const query = {
      userId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId,
      orgId: mongoose.Types.ObjectId.isValid(orgId) ? new mongoose.Types.ObjectId(orgId) : orgId,
    };
    return await OrgMembership.updateMany(
      query,
      { status },
      session ? { session } : undefined
    );
  }

  async deleteByUserId(userId, session) {
    return await OrgMembership.deleteMany(
      { userId },
      session ? { session } : undefined
    );
  }

  async deleteByUserIdAndOrgId(userId, orgId, session = null) {
    return await OrgMembership.deleteMany(
      { userId, orgId },
      session ? { session } : undefined
    );
  }

  /** Number of active members holding the role (current roleIds or the legacy single roleId). */
  async countActiveMembersWithRole(roleId, session = null) {
    return await OrgMembership.countDocuments(
      { status: 'Active', $or: [{ roleIds: roleId }, { roleId }] },
      session ? { session } : undefined
    );
  }

  /** Active member counts for several roles inside one community, as { [roleId]: count }. */
  async countActiveMembersByRole(orgId, roleIds, session = null) {
    if (!roleIds || roleIds.length === 0) return {};
    const ids = roleIds.map((id) => new mongoose.Types.ObjectId(String(id)));
    const rows = await OrgMembership.aggregate([
      { $match: { orgId: new mongoose.Types.ObjectId(String(orgId)), status: 'Active' } },
      {
        $project: {
          rids: {
            $setUnion: [
              { $cond: [{ $ifNull: ['$roleId', false] }, ['$roleId'], []] },
              { $ifNull: ['$roleIds', []] },
            ],
          },
        },
      },
      { $unwind: '$rids' },
      { $match: { rids: { $in: ids } } },
      { $group: { _id: '$rids', count: { $sum: 1 } } },
    ]).session(session || null);
    return Object.fromEntries(rows.map((r) => [String(r._id), r.count]));
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

  async findResidentsByVillaId(villaId, session = null) {
    return await OrgMembership.find({ villaId })
      .populate({ path: 'userId', select: 'name email phone status' })
      .session(session);
  }

  async findByUserIdAndOrgIdWithPopulate(userId, orgId, session = null) {
    return await OrgMembership.findOne({ userId, orgId })
      .populate({ path: 'villaId' })
      .populate({ path: 'units.villaId' })
      .session(session);
  }

  async findActiveMemberships(orgId, filter = {}, session = null) {
    const query = {
      orgId: new mongoose.Types.ObjectId(orgId),
      status: 'Active',
      ...filter,
    };
    return await OrgMembership.find(query)
      .populate({ path: 'villaId' })
      .populate({ path: 'units.villaId' })
      .session(session || null);
  }

  async findActiveUserIds(orgId, filter = {}, session = null) {
    const query = {
      orgId: new mongoose.Types.ObjectId(orgId),
      status: 'Active',
      ...filter,
    };
    const memberships = await OrgMembership.find(query).select('userId').session(session || null);
    return [...new Set(memberships.map((m) => m.userId?.toString()).filter(Boolean))];
  }

  /**
   * Retrieves active community administrators for a given organization.
   * Matches canonical administrative roles (Community Admin, Admin, Super Admin, Facility Manager)
   * or memberships with staff:manage permission.
   * Excludes inactive/suspended/deleted users.
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {mongoose.ClientSession} [session=null]
   * @returns {Promise<Array<{ userId: string, name: string, email: string }>>}
   */
  async findCommunityAdmins(orgId, session = null) {
    if (!orgId) return [];

    const canonicalCommunityAdminRoles = [
      'community admin',
      'admin',
      'facility manager',
    ];
    const clean = (r) => (r || '').toLowerCase().trim().replace(/[_-]/g, ' ');

    const orgIdObj = mongoose.Types.ObjectId.isValid(orgId) ? new mongoose.Types.ObjectId(orgId) : orgId;

    const memberships = await OrgMembership.find({
      orgId: orgIdObj,
      status: 'Active',
    })
      .populate('roleId')
      .populate('roleIds')
      .populate('userId')
      .session(session || null);

    const admins = [];
    const seenUserIds = new Set();

    for (const m of memberships) {
      const user = m.userId;
      if (!user) continue;

      const userIdStr = user._id ? user._id.toString() : user.toString();
      if (seenUserIds.has(userIdStr)) continue;

      // Exclude inactive or deleted user accounts
      if (user.isDeleted || user.status === 'Inactive' || user.status === 'Suspended') {
        continue;
      }

      // Check role names scoped strictly to community administration
      const roleNames = [
        m.roleId?.name,
        ...(Array.isArray(m.roleIds) ? m.roleIds.map((r) => r?.name) : []),
      ].filter(Boolean);

      const hasCommunityAdminRole = roleNames.some((n) => canonicalCommunityAdminRoles.includes(clean(n)));

      // Check if any role has 'staff:manage' permission in this community
      let hasStaffManage = false;
      const allRoles = [m.roleId, ...(Array.isArray(m.roleIds) ? m.roleIds : [])].filter(Boolean);
      for (const r of allRoles) {
        if (Array.isArray(r.permissions)) {
          if (r.permissions.some((p) => p === 'staff:manage' || p === 'staff:*')) {
            hasStaffManage = true;
            break;
          }
        }
      }

      // Platform Super Admins without explicit community admin role or staff:manage are excluded from community notifications
      if (user.isPlatform === true && !hasCommunityAdminRole && !hasStaffManage) {
        continue;
      }

      if (hasCommunityAdminRole || hasStaffManage) {
        seenUserIds.add(userIdStr);
        admins.push({
          userId: userIdStr,
          name: user.name || user.username || 'Community Admin',
          email: user.email || '',
          phone: user.phone || '',
        });
      }
    }

    return admins;
  }
}

export default new OrgMembershipRepository();


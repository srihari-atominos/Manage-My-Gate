import mongoose from 'mongoose';
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

  async findDetailsAndSummary(orgId) {
    const objectId = new mongoose.Types.ObjectId(orgId);
    const org = await Organization.findById(objectId).lean();
    if (!org) return null;

    const Villa = (await import('../villa/villa.model.js')).default;
    const OrgMembership = (await import('../orgMembership/orgMembership.model.js')).default;

    const [villas, memberships] = await Promise.all([
      Villa.find({ orgId: objectId }).lean(),
      OrgMembership.find({ orgId: objectId })
        .populate('userId', 'name email phone status avatar createdAt updatedAt')
        .populate('roleIds', 'name description')
        .populate('roleId', 'name description')
        .lean(),
    ]);

    const totalVillas = villas.length;
    const occupiedVillas = villas.filter(
      (v) => v.status === 'Occupied' || v.ownerId || v.primaryResidentId || (v.residents && v.residents.length > 0)
    ).length;
    const vacantVillas = villas.filter((v) => v.status === 'Vacant').length;
    const activeVillas = villas.filter((v) => v.status !== 'Inactive').length;
    const inactiveVillas = villas.filter((v) => v.status === 'Inactive').length;

    const totalUsers = memberships.length;
    const activeUsers = memberships.filter(
      (m) => m.status === 'Active' && m.userId && m.userId.status === 'Active'
    ).length;
    const pendingUsers = memberships.filter(
      (m) => m.status === 'Pending' || (m.userId && m.userId.status === 'Pending Verification')
    ).length;
    const inactiveUsers = totalUsers - activeUsers - pendingUsers;

    const roleBreakdownMap = {};
    memberships.forEach((m) => {
      const roles = m.roleIds && m.roleIds.length > 0 ? m.roleIds : m.roleId ? [m.roleId] : [];
      if (roles.length === 0) {
        roleBreakdownMap['Member'] = (roleBreakdownMap['Member'] || 0) + 1;
      } else {
        roles.forEach((r) => {
          const roleName = r.name || 'Member';
          roleBreakdownMap[roleName] = (roleBreakdownMap[roleName] || 0) + 1;
        });
      }
    });

    return {
      organization: org,
      summary: {
        totalVillas,
        occupiedVillas,
        vacantVillas,
        activeVillas,
        inactiveVillas,
        totalUsers,
        activeUsers,
        inactiveUsers,
        pendingUsers,
        roleBreakdown: roleBreakdownMap,
      },
    };
  }

  async findOrgUsersPaginated(orgId, { page = 1, limit = 10, search = '', role = '', status = '' }) {
    const objectId = new mongoose.Types.ObjectId(orgId);
    const skip = (page - 1) * limit;

    const pipeline = [
      { $match: { orgId: objectId } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: false } },
      {
        $lookup: {
          from: 'roles',
          localField: 'roleIds',
          foreignField: '_id',
          as: 'rolesList',
        },
      },
      {
        $lookup: {
          from: 'roles',
          localField: 'roleId',
          foreignField: '_id',
          as: 'singleRoleList',
        },
      },
      {
        $addFields: {
          allRoles: {
            $cond: {
              if: { $gt: [{ $size: '$rolesList' }, 0] },
              then: '$rolesList',
              else: '$singleRoleList',
            },
          },
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
        $unwind: { path: '$villa', preserveNullAndEmptyArrays: true },
      },
    ];

    const matchFilters = [];

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      matchFilters.push({
        $or: [
          { 'user.name': searchRegex },
          { 'user.email': searchRegex },
          { 'user.phone': searchRegex },
          { 'user.username': searchRegex },
          { 'villa.unitNumber': searchRegex },
          { 'villa.blockOrBuilding': searchRegex },
        ],
      });
    }

    if (role && role.trim()) {
      const roleRegex = new RegExp(role.trim(), 'i');
      matchFilters.push({
        'allRoles.name': roleRegex,
      });
    }

    if (status && status.trim()) {
      const statusRegex = new RegExp(`^${status.trim()}$`, 'i');
      matchFilters.push({
        $or: [
          { status: statusRegex },
          { 'user.status': statusRegex },
        ],
      });
    }

    if (matchFilters.length > 0) {
      pipeline.push({ $match: { $and: matchFilters } });
    }

    pipeline.push({
      $project: {
        _id: 1,
        membershipId: '$_id',
        status: 1,
        createdAt: 1,
        updatedAt: 1,
        userId: '$user._id',
        name: '$user.name',
        username: '$user.username',
        email: '$user.email',
        phone: '$user.phone',
        avatar: '$user.avatar',
        userStatus: '$user.status',
        roles: '$allRoles',
        villa: {
          _id: '$villa._id',
          unitNumber: '$villa.unitNumber',
          blockOrBuilding: '$villa.blockOrBuilding',
        },
      },
    });

    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [{ $skip: skip }, { $limit: limit }],
      },
    });

    const result = await (await import('../orgMembership/orgMembership.model.js')).default.aggregate(pipeline);
    const total = result[0]?.metadata[0]?.total || 0;
    const data = result[0]?.data || [];

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOrgUserDetails(orgId, userId) {
    const orgObjectId = new mongoose.Types.ObjectId(orgId);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const OrgMembership = (await import('../orgMembership/orgMembership.model.js')).default;
    const membership = await OrgMembership.findOne({ orgId: orgObjectId, userId: userObjectId })
      .populate('userId', 'name username email phone avatar status createdAt updatedAt')
      .populate('roleIds', 'name description')
      .populate('roleId', 'name description')
      .populate('villaId', 'unitNumber blockOrBuilding status type')
      .lean();

    if (!membership) return null;

    const roles = membership.roleIds && membership.roleIds.length > 0
      ? membership.roleIds
      : membership.roleId ? [membership.roleId] : [];

    return {
      membershipId: membership._id,
      orgId: membership.orgId,
      userId: membership.userId?._id,
      name: membership.userId?.name || membership.userId?.username || 'N/A',
      email: membership.userId?.email || 'N/A',
      phone: membership.userId?.phone || 'N/A',
      avatar: membership.userId?.avatar || null,
      status: membership.status || membership.userId?.status || 'Active',
      userStatus: membership.userId?.status || 'Active',
      roles: roles.map((r) => ({ id: r._id, name: r.name, description: r.description })),
      villa: membership.villaId ? {
        id: membership.villaId._id,
        unitNumber: membership.villaId.unitNumber,
        block: membership.villaId.blockOrBuilding,
        status: membership.villaId.status,
      } : null,
      joinedDate: membership.createdAt || membership.userId?.createdAt,
      lastLogin: membership.userId?.updatedAt || null,
    };
  }
}

export default new OrganizationRepository();


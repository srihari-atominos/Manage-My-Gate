import OrgMembership from '../orgMembership/orgMembership.model.js';
import User from '../user/user.model.js';
import CommunityNote from '../communityNote/communityNote.model.js';
import mongoose from 'mongoose';

export const directoryRepository = {
  async getPaginatedDirectory({ orgId, role, search, page = 1, limit = 50 }) {
    const cleanOrgId = new mongoose.Types.ObjectId(orgId);
    const skip = (page - 1) * limit;
    const now = new Date();

    // Match Stage for OrgMembership
    const matchStage = {
      orgId: cleanOrgId,
      status: 'Active',
    };

    const pipeline = [
      { $match: matchStage },
      // Lookup User
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },

      // Filter out users who hid themselves from directory or are suspended/blocked
      {
        $match: {
          'user.hideFromDirectory': { $ne: true },
          'user.status': { $in: ['Active', 'Pending Verification'] },
        },
      },

      // Lookup Villa / Unit
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
          path: '$villa',
          preserveNullAndEmptyArrays: true,
        },
      },

      // Lookup Role
      {
        $lookup: {
          from: 'roles',
          localField: 'roleId',
          foreignField: '_id',
          as: 'role',
        },
      },
      {
        $unwind: {
          path: '$role',
          preserveNullAndEmptyArrays: true,
        },
      },

      // Lookup Active Community Note (unexpired & active)
      {
        $lookup: {
          from: 'communitynotes',
          let: { uId: '$user._id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$userId', '$$uId'] },
                    { $eq: ['$orgId', cleanOrgId] },
                    { $eq: ['$isActive', true] },
                    { $gt: ['$expiresAt', now] },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
          ],
          as: 'activeNote',
        },
      },
      {
        $unwind: {
          path: '$activeNote',
          preserveNullAndEmptyArrays: true,
        },
      },

      // Transform fields & Privacy Masking
      {
        $project: {
          _id: '$user._id',
          id: '$user._id',
          userId: '$user._id',
          name: { $ifNull: ['$user.name', '$user.username'] },
          avatarUrl: '$user.avatar',
          role: {
            $switch: {
              branches: [
                {
                  case: {
                    $regexMatch: {
                      input: { $ifNull: ['$role.name', ''] },
                      regex: /guard|security/i,
                    },
                  },
                  then: 'guard',
                },
                {
                  case: {
                    $regexMatch: {
                      input: { $ifNull: ['$role.name', ''] },
                      regex: /staff|technician|maintenance/i,
                    },
                  },
                  then: 'staff',
                },
                {
                  case: {
                    $regexMatch: {
                      input: { $ifNull: ['$role.name', ''] },
                      regex: /admin|president|board/i,
                    },
                  },
                  then: 'admin',
                },
              ],
              default: 'resident',
            },
          },
          designation: { $ifNull: ['$role.name', '$residentType'] },
          unitNumber: { $ifNull: ['$villa.unitNumber', '$villa.name'] },
          phone: {
            $cond: {
              if: { $eq: ['$user.showPhoneInDirectory', false] },
              then: null,
              else: '$user.phone',
            },
          },
          intercomNumber: {
            $cond: {
              if: { $eq: ['$user.allowIntercomCalls', false] },
              then: null,
              else: { $ifNull: ['$villa.unitNumber', ''] },
            },
          },
          allowDirectoryMessages: { $ifNull: ['$user.allowDirectoryMessages', true] },
          showPhoneInDirectory: { $ifNull: ['$user.showPhoneInDirectory', true] },
          allowIntercomCalls: { $ifNull: ['$user.allowIntercomCalls', true] },
          interests: { $ifNull: ['$user.interests', []] },
          activeCommunityNote: '$activeNote',
          isOnline: true,
        },
      },
    ];

    // Optional Role Filter
    if (role && role !== 'all') {
      pipeline.push({
        $match: {
          role: role.toLowerCase(),
        },
      });
    }

    // Optional Search Filter
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      pipeline.push({
        $match: {
          $or: [
            { name: searchRegex },
            { unitNumber: searchRegex },
            { designation: searchRegex },
            { intercomNumber: searchRegex },
            { 'activeCommunityNote.text': searchRegex },
          ],
        },
      });
    }

    // $facet for Data + Total Pagination Count
    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [{ $skip: skip }, { $limit: limit }],
      },
    });

    const results = await OrgMembership.aggregate(pipeline);
    const metadata = results[0]?.metadata[0] || { total: 0 };
    const data = results[0]?.data || [];

    const total = metadata.total;
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: data,
      totalRecords: total,
      currentPage: page,
      totalPages,
      limit,
    };
  },
};

export default directoryRepository;

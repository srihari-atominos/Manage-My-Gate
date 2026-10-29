import mongoose from 'mongoose';
import Role from './role.model.js';
import { escapeRegex } from '../../utils/regex.utils.js';

export class RoleRepository {
  async findAll(session) {
    return await Role.find({}).session(session || null).sort({ name: 1 });
  }

  async findById(id, session) {
    return await Role.findById(id).session(session || null);
  }

  async findByIds(ids, session = null) {
    return await Role.find({ _id: { $in: ids } }).session(session || null);
  }

  async findByName(name, orgId = null, session = null) {
    if (!name) return null;
    const trimmed = String(name).trim();
    const regex = new RegExp('^' + trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');

    if (orgId) {
      const orgRole = await Role.findOne({ name: regex, orgId }).session(session || null);
      if (orgRole) return orgRole;
      const globalRole = await Role.findOne({ name: regex, $or: [{ orgId: null }, { isSystem: true }] }).session(session || null);
      if (globalRole) return globalRole;
      return null;
    }

    return await Role.findOne({ name: regex, $or: [{ orgId: null }, { isSystem: true }] }).session(session || null);
  }

  async findByOrgAndName(name, orgId = null, session = null) {
    if (!name) return null;
    const trimmed = String(name).trim();
    const regex = new RegExp('^' + trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');

    return await Role.findOne({ name: regex, orgId: orgId || null }).session(session || null);
  }

  /**
   * Paginated fetch using $facet aggregation for roles and permissions.
   * @param {string} orgId - Organization ID.
   * @param {number} skip - Number of documents to skip.
   * @param {number} limit - Max documents to return.
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session.
   * @returns {Promise<{ data: Array, totalRecords: number }>}
   */
  async findAllPaginated(orgId, skip, limit, session, search = '', scope = '') {
    const opts = session ? { session } : {};
    // A community Role Builder must only show roles created for that community.
    // Global system roles (for example Platform Super Admin and Resident) are
    // resolved by auth/onboarding flows, but are not configurable community roles.

    const term = String(search || '').trim();
    const matchQuery = orgId
      ? { $or: [{ orgId: new mongoose.Types.ObjectId(orgId) }, { orgId: null, isShared: true }] }
      : { orgId: null };
    if (term) {
      const regex = new RegExp(escapeRegex(term), 'i');
      matchQuery.$and = [{ $or: [{ name: regex }, { description: regex }] }];
    }

    // Roles saved before role scopes existed have no roleScope; infer it the way the API formats it.
    const effectiveScope = { $ifNull: ['$roleScope', { $cond: ['$isTenantRole', 'UNIT', 'GLOBAL'] }] };
    const scopeFilter = scope ? [{ $match: { effectiveScope: String(scope) } }] : [];

    const result = await Role.aggregate([
      { $match: matchQuery },
      { $addFields: { effectiveScope } },
      { $sort: { name: 1 } },
      {
        $facet: {
          // Counts ignore the scope filter so the filter chips always show the community-wide totals.
          scopeCounts: [{ $group: { _id: '$effectiveScope', count: { $sum: 1 } } }],
          data: [
            ...scopeFilter,
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: 'rolepermissions',
                localField: '_id',
                foreignField: 'roleId',
                as: 'rolePermissions',
              },
            },
            {
              $lookup: {
                from: 'permissions',
                localField: 'rolePermissions.permissionId',
                foreignField: '_id',
                as: 'permissionsList',
              },
            },
            {
              $project: {
                name: 1,
                orgId: 1,
                description: 1,
                isTenantRole: 1,
                roleScope: 1,
                communityOnly: 1,
                createdAt: 1,
                updatedAt: 1,
                permissions: '$permissionsList.name',
                integrationMappings: 1,
              },
            },
          ],
          metadata: [...scopeFilter, { $count: 'totalRecords' }],
        },
      },
    ]).session(opts.session || null);

    const scopeCounts = (result[0]?.scopeCounts || []).reduce((acc, row) => {
      acc[row._id] = row.count;
      return acc;
    }, {});

    const data = result[0]?.data || [];
    // Map aggregation output IDs to string matching standard format (Mongoose normally returns object with _id)
    const formattedData = data.map((r) => ({
      ...r,
      _id: r._id,
      id: r._id ? r._id.toString() : r.id,
    }));

    const totalRecords = result[0]?.metadata[0]?.totalRecords || 0;
    return { data: formattedData, totalRecords, scopeCounts };
  }

  async create(roleData, session) {
    const role = new Role(roleData);
    return await role.save(session ? { session } : undefined);
  }

  async update(id, updateData, session) {
    return await Role.findByIdAndUpdate(id, updateData, {
      returnDocument: 'after',
      runValidators: true,
      ...(session ? { session } : {}),
    });
  }

  async delete(id, session) {
    return await Role.findByIdAndDelete(id, session ? { session } : undefined);
  }

  /**
   * Check if any role is using a specific connection ID in its integrationMappings.
   * @param {string|mongoose.Types.ObjectId} connectionId - The integration connection ID.
   * @param {import('mongoose').ClientSession} [session] - Optional session.
   * @returns {Promise<boolean>} True if in use, false otherwise.
   */
  async isConnectionInUse(connectionId, session) {
    const connId = typeof connectionId === 'string' ? new mongoose.Types.ObjectId(connectionId) : connectionId;
    const count = await Role.countDocuments(
      {
        $expr: {
          $in: [
            connId,
            {
              $map: {
                input: { $objectToArray: { $ifNull: [ "$integrationMappings", {} ] } },
                as: "kv",
                in: "$$kv.v"
              }
            }
          ]
        }
      },
      session ? { session } : undefined
    );
    return count > 0;
  }
}

export default new RoleRepository();

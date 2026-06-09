import Role from './role.model.js';

export class RoleRepository {
  async findAll(session) {
    return await Role.find({}).session(session || null).sort({ name: 1 });
  }

  async findById(id, session) {
    return await Role.findById(id).session(session || null);
  }

  async findByName(name, session) {
    return await Role.findOne({ name }).session(session || null);
  }

  /**
   * Paginated fetch using $facet aggregation for roles and permissions.
   * @param {number} skip - Number of documents to skip.
   * @param {number} limit - Max documents to return.
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session.
   * @returns {Promise<{ data: Array, totalRecords: number }>}
   */
  async findAllPaginated(skip, limit, session) {
    const opts = session ? { session } : {};
    const result = await Role.aggregate([
      { $sort: { name: 1 } },
      {
        $facet: {
          data: [
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
                description: 1,
                createdAt: 1,
                updatedAt: 1,
                permissions: '$permissionsList.name',
              },
            },
          ],
          metadata: [{ $count: 'totalRecords' }],
        },
      },
    ]).session(opts.session || null);

    const data = result[0]?.data || [];
    // Map aggregation output IDs to string matching standard format (Mongoose normally returns object with _id)
    const formattedData = data.map((r) => ({
      ...r,
      _id: r._id,
    }));

    const totalRecords = result[0]?.metadata[0]?.totalRecords || 0;
    return { data: formattedData, totalRecords };
  }

  async create(roleData, session) {
    const role = new Role(roleData);
    return await role.save(session ? { session } : undefined);
  }

  async update(id, updateData, session) {
    return await Role.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
      ...(session ? { session } : {}),
    });
  }

  async delete(id, session) {
    return await Role.findByIdAndDelete(id, session ? { session } : undefined);
  }
}

export default new RoleRepository();

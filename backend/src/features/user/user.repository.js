import User from './user.model.js';

export class UserRepository {
  async findById(id, session) {
    return await User.findById(id).session(session || null);
  }

  async findByEmail(email, session) {
    return await User.findOne({ email }).session(session || null);
  }

  async findByUsername(username, session) {
    return await User.findOne({ username }).session(session || null);
  }

  /**
   * Paginated fetch using $facet aggregation for a single round-trip.
   * @param {number} skip - Number of documents to skip.
   * @param {number} limit - Max documents to return.
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session.
   * @returns {Promise<{ data: Array, totalRecords: number }>}
   */
  async findAllPaginated(skip, limit, session) {
    const opts = session ? { session } : {};
    const result = await User.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            { $project: { password: 0 } },
          ],
          metadata: [{ $count: 'totalRecords' }],
        },
      },
    ]).session(opts.session || null);

    const data = result[0]?.data || [];
    const totalRecords = result[0]?.metadata[0]?.totalRecords || 0;
    return { data, totalRecords };
  }

  /**
   * @param {Object} userData
   * @param {import('mongoose').ClientSession} [session]
   */
  async create(userData, session) {
    const user = new User(userData);
    return await user.save(session ? { session } : undefined);
  }

  /**
   * @param {string} id
   * @param {Object} updateData
   * @param {import('mongoose').ClientSession} [session]
   */
  async update(id, updateData, session) {
    return await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
      ...(session ? { session } : {}),
    }).select('-password');
  }

  /**
   * @param {string} id
   * @param {import('mongoose').ClientSession} [session]
   */
  async delete(id, session) {
    return await User.findByIdAndDelete(id, session ? { session } : undefined);
  }
}

export default new UserRepository();

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
      returnDocument: 'after',
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

  /**
   * Find a user by phone or its normalized/base phone.
   * @param {string} phone
   * @param {import('mongoose').ClientSession} [session]
   */
  async findByPhone(phone, session) {
    if (!phone) return null;
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) return null;

    const digitsOnly = trimmedPhone.replace(/\D/g, '');
    const last10 = digitsOnly.slice(-10);

    const orConditions = [{ phone: trimmedPhone }];
    if (digitsOnly) {
      orConditions.push({ phone: digitsOnly });
    }
    if (last10 && last10.length >= 7) {
      orConditions.push({ phone: new RegExp(`${last10}$`) });
    }

    return await User.findOne({ $or: orConditions }).session(session || null);
  }

  /**
   * Find a user by villaNumber/flatNumber and orgId
   * @param {string} villaNumber
   * @param {string} orgId
   * @param {import('mongoose').ClientSession} [session]
   */
  async findByVillaNumber(villaNumber, orgId, session) {
    const trimmed = villaNumber.trim();
    return await User.findOne({
      orgId,
      $or: [
        { villaNumber: new RegExp(`^${trimmed}$`, 'i') },
        { flatNumber: new RegExp(`^${trimmed}$`, 'i') }
      ]
    }).session(session || null);
  }

  /**
   * Anonymize a user for privacy/store compliance upon self-service account deletion.
   * @param {string} id - User ID
   * @param {import('mongoose').ClientSession} [session]
   */
  async anonymize(id, session) {
    const timestamp = Date.now();
    return await User.findByIdAndUpdate(
      id,
      {
        $set: {
          name: 'Deleted User',
          phone: null,
          email: `deleted_${id}_${timestamp}@deleted.nahom.local`,
          username: `deleted_${id}_${timestamp}`,
          password: `DELETED_${id}_${timestamp}`,
          avatar: null,
          status: 'Deleted',
          deletedAt: new Date(),
          interests: [],
          hideFromDirectory: true,
          allowDirectoryMessages: false,
          allowIntercomCalls: false,
          showPhoneInDirectory: false,
          villaId: null,
          residencyType: 'None',
          roles: [],
        },
      },
      { returnDocument: 'after', session: session || null }
    );
  }
}

export default new UserRepository();

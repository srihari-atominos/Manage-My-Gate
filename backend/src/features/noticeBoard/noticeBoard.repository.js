import mongoose from 'mongoose';
import Notice from './noticeBoard.model.js';

export class NoticeBoardRepository {
  /**
   * Create a new notice.
   */
  async createNotice(noticeData, session) {
    const notice = new Notice(noticeData);
    return await notice.save({ session });
  }

  /**
   * Find a notice by its ID.
   */
  async findById(id, orgId = null, session) {
    const query = { _id: id }; if (orgId) query.orgId = orgId; return await Notice.findOne(query)
      .populate('createdBy', 'name username avatar')
      .populate('targetAudience.targetRoles', 'name')
      .populate('targetAudience.targetUsers', 'name username email')
      .session(session);
  }

  /**
   * Find paginated notices for an organization with filters and sorting.
   */
  async getNotices(orgId, skip, limit, filters = {}, sort = { isPinned: -1, createdAt: -1 }, session) {
    const matchQuery = {
      orgId: typeof orgId === 'string' ? new mongoose.Types.ObjectId(orgId) : orgId,
      ...filters,
    };

    const pipeline = [
      { $match: matchQuery },
      { $sort: sort },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
          ],
          totalRecords: [
            { $count: 'count' },
          ],
        },
      },
    ];

    const query = session ? Notice.aggregate(pipeline).session(session) : Notice.aggregate(pipeline);
    const [result] = await query;

    const data = result.data || [];
    const totalRecords = result.totalRecords[0]?.count || 0;

    return { data, totalRecords };
  }

  /**
   * Count documents matching the filters for an organization.
   */
  async countDocuments(orgId, filters = {}, session) {
    const query = {
      orgId: typeof orgId === 'string' ? new mongoose.Types.ObjectId(orgId) : orgId,
      ...filters,
    };
    return session ? Notice.countDocuments(query).session(session) : Notice.countDocuments(query);
  }

  /**
   * Update a notice by ID.
   */
  async updateNotice(id, orgId = null, updateData, session) {
    const query = { _id: id }; if (orgId) query.orgId = orgId; return await Notice.findOneAndUpdate(query, updateData, {
      returnDocument: 'after',
      runValidators: true,
      session,
    });
  }

  /**
   * Delete a notice by ID.
   */
  async deleteNotice(id, orgId = null, session) {
    const query = { _id: id }; if (orgId) query.orgId = orgId; return await Notice.findOneAndDelete(query).session(session);
  }

  /**
   * Toggle the pin state of a notice.
   */
  async togglePin(id, orgId = null, isPinned, session) {
    const query = { _id: id }; if (orgId) query.orgId = orgId; return await Notice.findOneAndUpdate(query, { isPinned }, { returnDocument: 'after', runValidators: true, session });
  }

  /**
   * Unpins all notices in an organization except a specific one.
   */
  async unpinAllExcept(orgId, excludeId, session) {
    const query = {
      orgId: typeof orgId === 'string' ? new mongoose.Types.ObjectId(orgId) : orgId,
      _id: { $ne: typeof excludeId === 'string' ? new mongoose.Types.ObjectId(excludeId) : excludeId },
      isPinned: true,
    };
    return await Notice.updateMany(query, { isPinned: false }, { session });
  }

  /**
   * Automatically transition published notices to expired if their expiryDate is past.
   */
  async updateExpiredNotices(orgId, currentDate, session) {
    const query = {
      orgId: typeof orgId === 'string' ? new mongoose.Types.ObjectId(orgId) : orgId,
      expiryDate: { $lte: currentDate },
      status: 'Published',
    };
    return await Notice.updateMany(query, { status: 'Expired' }, { session });
  }
}

export default new NoticeBoardRepository();


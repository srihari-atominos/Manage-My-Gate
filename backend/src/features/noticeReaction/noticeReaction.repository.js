import NoticeReaction from './noticeReaction.model.js';

export class NoticeReactionRepository {
  async upsert(noticeId, userId, orgId, reactionType, session = null) {
    return await NoticeReaction.findOneAndUpdate(
      { noticeId, userId },
      { orgId, reactionType },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, session: session || null }
    );
  }

  async delete(noticeId, userId, session = null) {
    return await NoticeReaction.findOneAndDelete({ noticeId, userId }).session(session || null);
  }

  async findByNoticeAndUser(noticeId, userId, session = null) {
    return await NoticeReaction.findOne({ noticeId, userId }).session(session || null);
  }

  async getReactionCounts(noticeId, orgId, session = null) {
    const results = await NoticeReaction.aggregate([
      { $match: { noticeId, orgId } },
      { $group: { _id: '$reactionType', count: { $sum: 1 } } },
    ]).session(session || null);

    const counts = {};
    results.forEach((r) => {
      counts[r._id] = r.count;
    });

    return counts;
  }
}

export default new NoticeReactionRepository();

import mongoose from 'mongoose';
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

  async getBatchReactionData(noticeIds, orgId, userId = null) {
    if (!noticeIds || noticeIds.length === 0) return { countsByNotice: {}, userReactions: {} };

    const objectNoticeIds = noticeIds.map((id) => new mongoose.Types.ObjectId(id));
    const objectOrgId = new mongoose.Types.ObjectId(orgId);

    const [countsAgg, userDocs] = await Promise.all([
      NoticeReaction.aggregate([
        { $match: { noticeId: { $in: objectNoticeIds }, orgId: objectOrgId } },
        { $group: { _id: { noticeId: '$noticeId', reactionType: '$reactionType' }, count: { $sum: 1 } } },
      ]),
      userId
        ? NoticeReaction.find({
            noticeId: { $in: objectNoticeIds },
            orgId: objectOrgId,
            userId: new mongoose.Types.ObjectId(userId),
          }).lean()
        : [],
    ]);

    const countsByNotice = {};
    countsAgg.forEach((item) => {
      const nid = item._id.noticeId.toString();
      if (!countsByNotice[nid]) countsByNotice[nid] = {};
      countsByNotice[nid][item._id.reactionType] = item.count;
    });

    const userReactions = {};
    userDocs.forEach((doc) => {
      userReactions[doc.noticeId.toString()] = doc.reactionType;
    });

    return { countsByNotice, userReactions };
  }
}

export default new NoticeReactionRepository();

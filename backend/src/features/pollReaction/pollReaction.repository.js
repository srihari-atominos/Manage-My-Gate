import PollReaction from './pollReaction.model.js';
import mongoose from 'mongoose';

export class PollReactionRepository {
  async upsert(pollId, userId, orgId, reactionType, session = null) {
    const opts = { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true };
    if (session && !session._isMockSession) {
      opts.session = session;
    }
    return await PollReaction.findOneAndUpdate(
      { pollId, userId },
      { orgId, reactionType },
      opts
    );
  }

  async delete(pollId, userId, session = null) {
    const query = PollReaction.findOneAndDelete({ pollId, userId });
    if (session && !session._isMockSession) {
      query.session(session);
    }
    return await query;
  }

  async findByPollAndUser(pollId, userId, session = null) {
    const query = PollReaction.findOne({ pollId, userId });
    if (session && !session._isMockSession) {
      query.session(session);
    }
    return await query;
  }

  async getReactionCounts(pollId, orgId, session = null) {
    const agg = PollReaction.aggregate([
      { $match: { pollId: new mongoose.Types.ObjectId(pollId), orgId: new mongoose.Types.ObjectId(orgId) } },
      { $group: { _id: '$reactionType', count: { $sum: 1 } } },
    ]);
    if (session && !session._isMockSession) {
      agg.session(session);
    }
    const results = await agg;

    const counts = {};
    results.forEach((r) => {
      counts[r._id] = r.count;
    });

    return counts;
  }

  async getBatchReactionData(pollIds, orgId, userId = null) {
    if (!pollIds || pollIds.length === 0) return { countsByPoll: {}, userReactions: {} };

    const objectPollIds = pollIds.map((id) => new mongoose.Types.ObjectId(id));
    const objectOrgId = new mongoose.Types.ObjectId(orgId);

    const [countsAgg, userDocs] = await Promise.all([
      PollReaction.aggregate([
        { $match: { pollId: { $in: objectPollIds }, orgId: objectOrgId } },
        { $group: { _id: { pollId: '$pollId', reactionType: '$reactionType' }, count: { $sum: 1 } } },
      ]),
      userId
        ? PollReaction.find({
            pollId: { $in: objectPollIds },
            orgId: objectOrgId,
            userId: new mongoose.Types.ObjectId(userId),
          }).lean()
        : [],
    ]);

    const countsByPoll = {};
    countsAgg.forEach((item) => {
      const pid = item._id.pollId.toString();
      if (!countsByPoll[pid]) countsByPoll[pid] = {};
      countsByPoll[pid][item._id.reactionType] = item.count;
    });

    const userReactions = {};
    userDocs.forEach((doc) => {
      userReactions[doc.pollId.toString()] = doc.reactionType;
    });

    return { countsByPoll, userReactions };
  }
}

export default new PollReactionRepository();

import mongoose from 'mongoose';
import pollReactionRepository from './pollReaction.repository.js';
import { POLL_REACTION_TYPES } from './pollReaction.model.js';
import audienceService from '../audience/audience.service.js';
import HttpError from '../../utils/httpError.utils.js';
import logger, { loggerStorage } from '../../utils/logger.utils.js';

export class PollReactionService {
  /**
   * Toggles or updates a reaction on a poll.
   *
   * @param {string|mongoose.Types.ObjectId} pollId
   * @param {string|mongoose.Types.ObjectId} userId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {string} [reactionType='LIKE']
   * @param {mongoose.ClientSession} [session=null]
   * @returns {Promise<Object>}
   */
  async toggleReaction(pollId, userId, orgId, reactionType = 'LIKE', session = null) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info('PollReactionService.toggleReaction request received', {
      pollId,
      userId,
      reactionType,
      correlationId,
    });

    if (!pollId || !mongoose.Types.ObjectId.isValid(pollId)) {
      throw new HttpError(400, 'Invalid Poll ID.');
    }
    if (!POLL_REACTION_TYPES.includes(reactionType)) {
      throw new HttpError(400, `Invalid reaction type. Must be one of: ${POLL_REACTION_TYPES.join(', ')}.`);
    }

    const Poll = mongoose.model('Poll');
    const poll = await Poll.findById(pollId);

    if (!poll) {
      throw new HttpError(404, `Poll with ID ${pollId} not found.`);
    }

    if (poll.orgId.toString() !== orgId.toString()) {
      throw new HttpError(403, 'Forbidden. Poll belongs to another community.');
    }

    // Eligibility check
    if (poll.targetAudience && poll.targetAudience.targetType !== 'ALL') {
      let isEligible = await audienceService.checkEligibility(userId, poll.targetAudience, orgId);
      if (!isEligible) {
        const User = mongoose.model('User');
        const user = await User.findById(userId);
        if (user && ['Admin', 'Community Admin', 'Super Admin', 'Platform Super Admin'].includes(user.role)) {
          isEligible = true;
        }
      }
      if (!isEligible) {
        throw new HttpError(403, 'You are not eligible to react to this poll.');
      }
    }

    const pollObjectId = new mongoose.Types.ObjectId(pollId);
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const orgObjectId = new mongoose.Types.ObjectId(orgId);

    const existing = await pollReactionRepository.findByPollAndUser(pollObjectId, userObjectId, session);

    let actionTaken;
    if (existing && existing.reactionType === reactionType) {
      // Toggle off: remove reaction
      await pollReactionRepository.delete(pollObjectId, userObjectId, session);
      actionTaken = 'removed';
    } else {
      // Add or switch reaction
      await pollReactionRepository.upsert(pollObjectId, userObjectId, orgObjectId, reactionType, session);
      actionTaken = existing ? 'updated' : 'added';
    }

    const counts = await pollReactionRepository.getReactionCounts(pollObjectId, orgObjectId, session);
    const userReaction = actionTaken === 'removed' ? null : reactionType;
    const normalizedCounts = {
      HELPFUL: (counts.HELPFUL || 0) + (counts.LIKE || 0),
      IMPORTANT: (counts.IMPORTANT || 0) + (counts.LOVE || 0),
      THANKS: (counts.THANKS || 0) + (counts.APPLAUD || 0),
      ...counts,
    };
    const totalReactions = (normalizedCounts.HELPFUL || 0) + (normalizedCounts.IMPORTANT || 0) + (normalizedCounts.THANKS || 0);

    return {
      action: actionTaken,
      userReaction,
      counts: normalizedCounts,
      reactions: normalizedCounts,
      likeCount: normalizedCounts.HELPFUL || totalReactions,
      isLiked: userReaction === 'HELPFUL' || userReaction === 'LIKE' || (Boolean(userReaction) && reactionType === 'LIKE'),
      totalReactions,
    };
  }

  /**
   * Retrieves reaction counts and current user's reaction for a poll.
   *
   * @param {string|mongoose.Types.ObjectId} pollId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {string|mongoose.Types.ObjectId} userId
   * @returns {Promise<Object>}
   */
  async getReactions(pollId, orgId, userId = null) {
    if (!pollId || !mongoose.Types.ObjectId.isValid(pollId)) {
      throw new HttpError(400, 'Invalid Poll ID.');
    }

    const Poll = mongoose.model('Poll');
    const poll = await Poll.findById(pollId);
    if (!poll) {
      throw new HttpError(404, `Poll with ID ${pollId} not found.`);
    }

    if (poll.orgId.toString() !== orgId.toString()) {
      throw new HttpError(403, 'Forbidden. Poll belongs to another community.');
    }

    const pollObjectId = new mongoose.Types.ObjectId(pollId);
    const orgObjectId = new mongoose.Types.ObjectId(orgId);
    const userObjectId = userId ? new mongoose.Types.ObjectId(userId) : null;

    const [counts, userReactionDoc] = await Promise.all([
      pollReactionRepository.getReactionCounts(pollObjectId, orgObjectId),
      userObjectId ? pollReactionRepository.findByPollAndUser(pollObjectId, userObjectId) : null,
    ]);

    const userReaction = userReactionDoc ? userReactionDoc.reactionType : null;
    const normalizedCounts = {
      HELPFUL: (counts.HELPFUL || 0) + (counts.LIKE || 0),
      IMPORTANT: (counts.IMPORTANT || 0) + (counts.LOVE || 0),
      THANKS: (counts.THANKS || 0) + (counts.APPLAUD || 0),
      ...counts,
    };
    const totalReactions = (normalizedCounts.HELPFUL || 0) + (normalizedCounts.IMPORTANT || 0) + (normalizedCounts.THANKS || 0);

    return {
      counts: normalizedCounts,
      reactions: normalizedCounts,
      userReaction,
      likeCount: normalizedCounts.HELPFUL || totalReactions,
      isLiked: userReaction === 'HELPFUL' || userReaction === 'LIKE' || Boolean(userReaction),
      totalReactions,
    };
  }

  /**
   * Batch enriches poll items with reaction counts and current user reaction status.
   *
   * @param {Array} polls
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {string|mongoose.Types.ObjectId} userId
   * @returns {Promise<Array>}
   */
  async enrichPollsWithReactions(polls, orgId, userId = null) {
    if (!polls || polls.length === 0) return polls;

    const pollIds = polls.map((p) => p._id);
    const { countsByPoll, userReactions } = await pollReactionRepository.getBatchReactionData(pollIds, orgId, userId);

    return polls.map((poll) => {
      const pid = poll._id.toString();
      const rawCounts = countsByPoll[pid] || {};
      const normalizedCounts = {
        HELPFUL: (rawCounts.HELPFUL || 0) + (rawCounts.LIKE || 0),
        IMPORTANT: (rawCounts.IMPORTANT || 0) + (rawCounts.LOVE || 0),
        THANKS: (rawCounts.THANKS || 0) + (rawCounts.APPLAUD || 0),
        ...rawCounts,
      };
      const userReaction = userReactions[pid] || null;
      const totalReactions = (normalizedCounts.HELPFUL || 0) + (normalizedCounts.IMPORTANT || 0) + (normalizedCounts.THANKS || 0);

      return {
        ...poll,
        reactionCounts: normalizedCounts,
        reactions: normalizedCounts,
        userReaction,
        likeCount: normalizedCounts.HELPFUL || totalReactions,
        isLiked: userReaction === 'HELPFUL' || userReaction === 'LIKE' || Boolean(userReaction),
        totalReactions,
      };
    });
  }
}

export default new PollReactionService();

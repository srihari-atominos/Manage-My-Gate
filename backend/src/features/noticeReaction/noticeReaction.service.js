import mongoose from 'mongoose';
import noticeReactionRepository from './noticeReaction.repository.js';
import { NOTICE_REACTION_TYPES } from './noticeReaction.model.js';
import audienceService from '../audience/audience.service.js';
import auditLogService from '../auditLog/auditLog.services.js';
import HttpError from '../../utils/httpError.utils.js';
import logger, { loggerStorage } from '../../utils/logger.utils.js';

export class NoticeReactionService {
  /**
   * Toggles or updates a reaction on a notice.
   *
   * @param {string|mongoose.Types.ObjectId} noticeId
   * @param {string|mongoose.Types.ObjectId} userId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {string} reactionType
   * @param {mongoose.ClientSession} [session=null]
   * @returns {Promise<Object>}
   */
  async toggleReaction(noticeId, userId, orgId, reactionType, session = null) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info('NoticeReactionService.toggleReaction request received', {
      noticeId,
      userId,
      reactionType,
      correlationId,
    });

    if (!noticeId || !mongoose.Types.ObjectId.isValid(noticeId)) {
      throw new HttpError(400, 'Invalid Notice ID.');
    }
    if (!NOTICE_REACTION_TYPES.includes(reactionType)) {
      throw new HttpError(400, `Invalid reaction type. Must be one of: ${NOTICE_REACTION_TYPES.join(', ')}.`);
    }

    const Notice = mongoose.model('Notice');
    const notice = await Notice.findById(noticeId).session(session || null);

    if (!notice) {
      throw new HttpError(404, `Notice with ID ${noticeId} not found.`);
    }

    if (notice.orgId.toString() !== orgId.toString()) {
      throw new HttpError(403, 'Forbidden. Notice belongs to another community.');
    }

    if (notice.allowReactions === false) {
      throw new HttpError(400, 'Reactions are disabled for this notice.');
    }

    let isEligible = await audienceService.checkEligibility(userId, notice.targetAudience, orgId, session);
    if (!isEligible) {
      const User = mongoose.model('User');
      const user = await User.findById(userId).session(session || null);
      if (user && ['Admin', 'Community Admin', 'Super Admin', 'Platform Super Admin', 'SuperAdmin'].includes(user.role)) {
        isEligible = true;
      }
    }
    if (!isEligible) {
      throw new HttpError(403, 'You are not eligible to react to this notice.');
    }

    const noticeObjectId = new mongoose.Types.ObjectId(noticeId);
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const orgObjectId = new mongoose.Types.ObjectId(orgId);

    const existing = await noticeReactionRepository.findByNoticeAndUser(noticeObjectId, userObjectId, session);

    let actionTaken;
    if (existing && existing.reactionType === reactionType) {
      // Toggle off: remove existing reaction
      await noticeReactionRepository.delete(noticeObjectId, userObjectId, session);
      actionTaken = 'removed';
    } else {
      // Add or switch reaction
      await noticeReactionRepository.upsert(noticeObjectId, userObjectId, orgObjectId, reactionType, session);
      actionTaken = existing ? 'updated' : 'added';

      // Log audit event
      try {
        await auditLogService.logEvent({
          actorId: userId,
          action: 'NOTICE_REACTION_ADDED',
          targetId: orgId,
          metadata: {
            noticeId: noticeId.toString(),
            reactionType,
          },
        });
      } catch (auditErr) {
        logger.error('Failed to log audit event for notice reaction:', auditErr);
      }
    }

    const counts = await noticeReactionRepository.getReactionCounts(noticeObjectId, orgObjectId, session);
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
      isLiked: userReaction === 'HELPFUL' || userReaction === 'LIKE' || Boolean(userReaction),
      totalReactions,
    };
  }

  /**
   * Retrieves reaction counts and current user's reaction for a notice.
   *
   * @param {string|mongoose.Types.ObjectId} noticeId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {string|mongoose.Types.ObjectId} userId
   * @returns {Promise<Object>}
   */
  async getReactions(noticeId, orgId, userId) {
    if (!noticeId || !mongoose.Types.ObjectId.isValid(noticeId)) {
      throw new HttpError(400, 'Invalid Notice ID.');
    }

    const Notice = mongoose.model('Notice');
    const notice = await Notice.findById(noticeId);
    if (!notice) {
      throw new HttpError(404, `Notice with ID ${noticeId} not found.`);
    }

    if (notice.orgId.toString() !== orgId.toString()) {
      throw new HttpError(403, 'Forbidden. Notice belongs to another community.');
    }

    let isEligible = await audienceService.checkEligibility(userId, notice.targetAudience, orgId);
    if (!isEligible) {
      const User = mongoose.model('User');
      const user = await User.findById(userId);
      if (user && ['Admin', 'Community Admin', 'Super Admin', 'Platform Super Admin', 'SuperAdmin'].includes(user.role)) {
        isEligible = true;
      }
    }
    if (!isEligible) {
      throw new HttpError(403, 'You are not eligible to view reactions on this notice.');
    }

    const noticeObjectId = new mongoose.Types.ObjectId(noticeId);
    const orgObjectId = new mongoose.Types.ObjectId(orgId);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const [counts, userReactionDoc] = await Promise.all([
      noticeReactionRepository.getReactionCounts(noticeObjectId, orgObjectId),
      noticeReactionRepository.findByNoticeAndUser(noticeObjectId, userObjectId),
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
   * Batch enriches notice items with reaction counts and current user reaction status.
   *
   * @param {Array} notices
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {string|mongoose.Types.ObjectId} userId
   * @returns {Promise<Array>}
   */
  async enrichNoticesWithReactions(notices, orgId, userId = null) {
    if (!notices || notices.length === 0) return notices;

    const noticeIds = notices.map((n) => n._id);
    const { countsByNotice, userReactions } = await noticeReactionRepository.getBatchReactionData(noticeIds, orgId, userId);

    return notices.map((notice) => {
      const nid = notice._id.toString();
      const rawCounts = countsByNotice[nid] || {};
      const normalizedCounts = {
        HELPFUL: (rawCounts.HELPFUL || 0) + (rawCounts.LIKE || 0),
        IMPORTANT: (rawCounts.IMPORTANT || 0) + (rawCounts.LOVE || 0),
        THANKS: (rawCounts.THANKS || 0) + (rawCounts.APPLAUD || 0),
        ...rawCounts,
      };
      const userReaction = userReactions[nid] || null;
      const totalReactions = (normalizedCounts.HELPFUL || 0) + (normalizedCounts.IMPORTANT || 0) + (normalizedCounts.THANKS || 0);

      const noticeObj = notice.toObject ? notice.toObject() : notice;
      return {
        ...noticeObj,
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

export default new NoticeReactionService();

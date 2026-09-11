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

    const isEligible = await audienceService.checkEligibility(userId, notice.targetAudience, orgId, session);
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

    return {
      action: actionTaken,
      userReaction: actionTaken === 'removed' ? null : reactionType,
      counts,
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

    const isEligible = await audienceService.checkEligibility(userId, notice.targetAudience, orgId);
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

    return {
      counts,
      userReaction: userReactionDoc ? userReactionDoc.reactionType : null,
    };
  }
}

export default new NoticeReactionService();

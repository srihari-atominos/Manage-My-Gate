import mongoose from 'mongoose';
import noticeCommentRepository from './noticeComment.repository.js';
import audienceService from '../audience/audience.service.js';
import auditLogService from '../auditLog/auditLog.services.js';
import HttpError from '../../utils/httpError.utils.js';
import logger, { loggerStorage } from '../../utils/logger.utils.js';

export class NoticeCommentService {
  /**
   * Adds a root comment or nested reply to a notice.
   *
   * @param {string|mongoose.Types.ObjectId} noticeId
   * @param {string|mongoose.Types.ObjectId} userId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {string} content
   * @param {string|mongoose.Types.ObjectId} [parentCommentId=null]
   * @param {mongoose.ClientSession} [session=null]
   * @returns {Promise<Object>}
   */
  async addComment(noticeId, userId, orgId, content, parentCommentId = null, session = null) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info('NoticeCommentService.addComment request received', {
      noticeId,
      userId,
      parentCommentId,
      correlationId,
    });

    if (!noticeId || !mongoose.Types.ObjectId.isValid(noticeId)) {
      throw new HttpError(400, 'Invalid Notice ID.');
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      throw new HttpError(400, 'Comment content cannot be empty.');
    }

    const Notice = mongoose.model('Notice');
    const notice = await Notice.findById(noticeId).session(session || null);

    if (!notice) {
      throw new HttpError(404, `Notice with ID ${noticeId} not found.`);
    }

    if (notice.orgId.toString() !== orgId.toString()) {
      throw new HttpError(403, 'Forbidden. Notice belongs to another community.');
    }

    if (notice.allowComments === false) {
      throw new HttpError(400, 'Comments are disabled for this notice.');
    }

    // Verify audience eligibility
    const isEligible = await audienceService.checkEligibility(userId, notice.targetAudience, orgId, session);
    if (!isEligible) {
      throw new HttpError(403, 'You are not eligible to comment on this notice.');
    }

    // Validate parent comment if provided
    let parentObjectId = null;
    if (parentCommentId) {
      if (!mongoose.Types.ObjectId.isValid(parentCommentId)) {
        throw new HttpError(400, 'Invalid parent comment ID.');
      }
      const parent = await noticeCommentRepository.findById(parentCommentId, orgId, session);
      if (!parent || parent.noticeId.toString() !== noticeId.toString() || parent.status === 'Deleted') {
        throw new HttpError(400, 'Parent comment does not exist or has been deleted.');
      }
      parentObjectId = new mongoose.Types.ObjectId(parentCommentId);
    }

    const commentData = {
      noticeId: new mongoose.Types.ObjectId(noticeId),
      orgId: new mongoose.Types.ObjectId(orgId),
      userId: new mongoose.Types.ObjectId(userId),
      parentCommentId: parentObjectId,
      content: content.trim(),
      status: 'Active',
    };

    const created = await noticeCommentRepository.create(commentData, session);

    // Record governance audit event
    try {
      await auditLogService.logEvent({
        actorId: userId,
        action: 'NOTICE_COMMENTED',
        targetId: orgId,
        metadata: {
          noticeId: noticeId.toString(),
          commentId: created._id.toString(),
          isReply: !!parentCommentId,
        },
      });
    } catch (auditErr) {
      logger.error('Failed to log audit event for notice comment:', auditErr);
    }

    return created;
  }

  /**
   * Retrieves threaded comments for a notice.
   *
   * @param {string|mongoose.Types.ObjectId} noticeId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {string|mongoose.Types.ObjectId} userId
   * @returns {Promise<Array>} Nested array of root comments with replies
   */
  async getComments(noticeId, orgId, userId) {
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
      throw new HttpError(403, 'You are not eligible to view comments on this notice.');
    }

    const rawComments = await noticeCommentRepository.findByNotice(noticeId, orgId);

    // Structure into threaded hierarchy (root comments + replies)
    const commentMap = new Map();
    const rootComments = [];

    rawComments.forEach((c) => {
      const plain = c.toObject ? c.toObject() : { ...c };
      plain.replies = [];
      commentMap.set(plain._id.toString(), plain);
    });

    rawComments.forEach((c) => {
      const plain = commentMap.get(c._id.toString());
      if (c.parentCommentId) {
        const parent = commentMap.get(c.parentCommentId.toString());
        if (parent) {
          parent.replies.push(plain);
        } else {
          // If parent missing, treat as root
          rootComments.push(plain);
        }
      } else {
        rootComments.push(plain);
      }
    });

    return rootComments;
  }

  /**
   * Soft-deletes a comment.
   *
   * @param {string|mongoose.Types.ObjectId} commentId
   * @param {string|mongoose.Types.ObjectId} noticeId
   * @param {string|mongoose.Types.ObjectId} userId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {Array<string>} [userRoleNames=[]]
   * @returns {Promise<Object>}
   */
  async deleteComment(commentId, noticeId, userId, orgId, userRoleNames = []) {
    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
      throw new HttpError(400, 'Invalid comment ID.');
    }

    const comment = await noticeCommentRepository.findById(commentId, orgId);
    if (!comment || comment.noticeId.toString() !== noticeId.toString()) {
      throw new HttpError(404, 'Comment not found on this notice.');
    }

    const isAuthor = comment.userId.toString() === userId.toString();
    const isAdmin = userRoleNames.some((r) =>
      ['Admin', 'Community Admin', 'Super Admin', 'Manager'].includes(r)
    );

    if (!isAuthor && !isAdmin) {
      throw new HttpError(403, 'Forbidden. You do not have permission to delete this comment.');
    }

    return await noticeCommentRepository.updateStatus(commentId, orgId, 'Deleted');
  }
}

export default new NoticeCommentService();

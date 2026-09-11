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
  async addComment(noticeId, userId, orgId, content, parentCommentId = null, session = null, currentUserObj = null) {
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
    let isEligible = await audienceService.checkEligibility(userId, notice.targetAudience, orgId, session);
    if (!isEligible) {
      const User = mongoose.model('User');
      const user = await User.findById(userId).session(session || null);
      const testRole = currentUserObj?.role || user?.role;
      if (user && ['Admin', 'Community Admin', 'Super Admin', 'Platform Super Admin', 'SuperAdmin'].includes(testRole)) {
        isEligible = true;
      }
    }
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

    const User = mongoose.model('User');
    const commentUser = await User.findById(userId).populate('roles', 'name').session(session || null);
    const userRoleNames = (commentUser?.roles || []).map(r => typeof r === 'string' ? r : r.name);
    if (commentUser?.role) userRoleNames.push(commentUser.role);
    if (currentUserObj?.role) userRoleNames.push(currentUserObj.role);
    if (Array.isArray(currentUserObj?.roles)) {
      currentUserObj.roles.forEach(r => userRoleNames.push(typeof r === 'string' ? r : r.name));
    }

    // Also check OrgMembership for community admin role in this specific community
    try {
      const OrgMembership = mongoose.model('OrgMembership');
      const membership = await OrgMembership.findOne({ userId, orgId }).populate('roleId roleIds').session(session || null);
      if (membership) {
        if (membership.roleId?.name) userRoleNames.push(membership.roleId.name);
        if (Array.isArray(membership.roleIds)) {
          membership.roleIds.forEach(r => { if (r?.name) userRoleNames.push(r.name); });
        }
      }
    } catch (mErr) {
      // silent fallback
    }

    const isAdminUser = userRoleNames.some(r =>
      ['Admin', 'Community Admin', 'Super Admin', 'Platform Super Admin', 'SuperAdmin'].includes(r)
    );

    const displayName = isAdminUser
      ? 'Community Admin'
      : (commentUser?.name || currentUserObj?.name || commentUser?.username || 'Resident');

    const commentData = {
      noticeId: new mongoose.Types.ObjectId(noticeId),
      orgId: new mongoose.Types.ObjectId(orgId),
      userId: new mongoose.Types.ObjectId(userId),
      parentCommentId: parentObjectId,
      content: content.trim(),
      status: 'Active',
      authorName: displayName,
      authorRole: isAdminUser ? 'Community Admin' : 'Resident',
      isAdminComment: isAdminUser,
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

    const createdObj = created.toObject ? created.toObject() : { ...created };
    createdObj.authorName = displayName;
    createdObj.authorRole = isAdminUser ? 'Community Admin' : 'Resident';
    createdObj.isAdminComment = isAdminUser;
    createdObj.createdBy = {
      _id: commentUser?._id,
      name: displayName,
      username: commentUser?.username,
      avatar: commentUser?.avatar,
      role: isAdminUser ? 'Community Admin' : 'Resident',
    };

    return createdObj;
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

    let isEligible = await audienceService.checkEligibility(userId, notice.targetAudience, orgId);
    if (!isEligible) {
      const User = mongoose.model('User');
      const user = await User.findById(userId);
      if (user && ['Admin', 'Community Admin', 'Super Admin', 'Platform Super Admin', 'SuperAdmin'].includes(user.role)) {
        isEligible = true;
      }
    }
    if (!isEligible) {
      throw new HttpError(403, 'You are not eligible to view comments on this notice.');
    }

    const rawComments = await noticeCommentRepository.findByNotice(noticeId, orgId);

    // Bulk resolve OrgMemberships for author user IDs to detect Community Admin role
    const authorUserIds = rawComments
      .map(c => c.userId?._id || c.userId)
      .filter(Boolean);

    let adminUserIdsSet = new Set();
    if (authorUserIds.length > 0) {
      try {
        const OrgMembership = mongoose.model('OrgMembership');
        const memberships = await OrgMembership.find({
          userId: { $in: authorUserIds },
          orgId,
        }).populate('roleId roleIds');

        memberships.forEach(m => {
          const mRoles = [];
          if (m.roleId?.name) mRoles.push(m.roleId.name);
          if (Array.isArray(m.roleIds)) {
            m.roleIds.forEach(r => { if (r?.name) mRoles.push(r.name); });
          }
          if (mRoles.some(r => ['Admin', 'Community Admin', 'Super Admin', 'Platform Super Admin', 'SuperAdmin'].includes(r))) {
            adminUserIdsSet.add(m.userId.toString());
          }
        });
      } catch (err) {
        // silent fallback
      }
    }

    // Structure into threaded hierarchy (root comments + replies)
    const commentMap = new Map();
    const rootComments = [];

    rawComments.forEach((c) => {
      const plain = c.toObject ? c.toObject() : { ...c };
      plain.replies = [];

      const commentUser = plain.userId || {};
      const commentUserIdStr = (commentUser._id || commentUser.id || plain.userId)?.toString();
      const userRoleNames = (commentUser.roles || []).map(r => typeof r === 'string' ? r : r.name);
      if (commentUser.role) userRoleNames.push(commentUser.role);

      const isAdmin =
        plain.isAdminComment ||
        plain.authorRole === 'Community Admin' ||
        plain.authorName === 'Community Admin' ||
        (commentUserIdStr && adminUserIdsSet.has(commentUserIdStr)) ||
        userRoleNames.some(r =>
          ['Admin', 'Community Admin', 'Super Admin', 'Platform Super Admin', 'SuperAdmin'].includes(r)
        );

      const computedName = isAdmin
        ? 'Community Admin'
        : (commentUser.name || commentUser.username || plain.authorName || 'Resident');

      plain.authorName = computedName;
      plain.authorRole = isAdmin ? 'Community Admin' : 'Resident';
      plain.isAdminComment = isAdmin;

      plain.createdBy = {
        _id: commentUser._id || commentUser.id,
        name: computedName,
        username: commentUser.username,
        avatar: commentUser.avatar,
        role: isAdmin ? 'Community Admin' : 'Resident',
      };

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

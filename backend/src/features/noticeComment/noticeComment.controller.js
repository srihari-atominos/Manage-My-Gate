import noticeCommentService from './noticeComment.service.js';

export class NoticeCommentController {
  async addComment(req, res, next) {
    try {
      const noticeId = req.params.id || req.params.noticeId;
      const userId = req.user.id || req.user._id;
      const orgId = req.orgId || req.user.currentOrgId || req.user.orgId;
      const { content, parentCommentId } = req.body;

      const comment = await noticeCommentService.addComment(noticeId, userId, orgId, content, parentCommentId);
      res.status(201).json({
        success: true,
        message: 'Comment added successfully.',
        data: comment,
      });
    } catch (error) {
      next(error);
    }
  }

  async getComments(req, res, next) {
    try {
      const noticeId = req.params.id || req.params.noticeId;
      const userId = req.user.id || req.user._id;
      const orgId = req.orgId || req.user.currentOrgId || req.user.orgId;

      const comments = await noticeCommentService.getComments(noticeId, orgId, userId);
      res.status(200).json({
        success: true,
        message: 'Comments retrieved successfully.',
        data: comments,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteComment(req, res, next) {
    try {
      const noticeId = req.params.id || req.params.noticeId;
      const commentId = req.params.commentId;
      const userId = req.user.id || req.user._id;
      const orgId = req.orgId || req.user.currentOrgId || req.user.orgId;
      const userRoles = req.user.roles || [];

      const result = await noticeCommentService.deleteComment(commentId, noticeId, userId, orgId, userRoles);
      res.status(200).json({
        success: true,
        message: 'Comment deleted successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new NoticeCommentController();

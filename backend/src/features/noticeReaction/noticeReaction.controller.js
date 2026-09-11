import noticeReactionService from './noticeReaction.service.js';

export class NoticeReactionController {
  async toggleReaction(req, res, next) {
    try {
      const noticeId = req.params.id || req.params.noticeId;
      const userId = req.user.id || req.user._id;
      const orgId = req.orgId || req.user.currentOrgId || req.user.orgId;
      const { reactionType } = req.body;

      const result = await noticeReactionService.toggleReaction(noticeId, userId, orgId, reactionType);
      res.status(200).json({
        success: true,
        message: `Reaction ${result.action} successfully.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getReactions(req, res, next) {
    try {
      const noticeId = req.params.id || req.params.noticeId;
      const userId = req.user.id || req.user._id;
      const orgId = req.orgId || req.user.currentOrgId || req.user.orgId;

      const result = await noticeReactionService.getReactions(noticeId, orgId, userId);
      res.status(200).json({
        success: true,
        message: 'Notice reactions retrieved successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new NoticeReactionController();

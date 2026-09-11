import pollReactionService from './pollReaction.service.js';

export class PollReactionController {
  async toggleReaction(req, res, next) {
    try {
      const pollId = req.params.id || req.params.pollId;
      const userId = req.user.id || req.user._id;
      const orgId = req.tenant?.orgId || req.orgId || req.user.currentOrgId || req.user.orgId;
      const reactionType = req.body?.reactionType || 'LIKE';

      const result = await pollReactionService.toggleReaction(pollId, userId, orgId, reactionType);
      return res.status(200).json({
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
      const pollId = req.params.id || req.params.pollId;
      const userId = req.user?.id || req.user?._id || null;
      const orgId = req.tenant?.orgId || req.orgId || req.user.currentOrgId || req.user.orgId;

      const result = await pollReactionService.getReactions(pollId, orgId, userId);
      return res.status(200).json({
        success: true,
        message: 'Poll reactions retrieved successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new PollReactionController();

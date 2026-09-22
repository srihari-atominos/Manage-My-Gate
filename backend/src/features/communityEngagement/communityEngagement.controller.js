import communityEngagementService from './communityEngagement.service.js';

export class CommunityEngagementController {
  /**
   * Unified content creation endpoint for Community Engagement (Notice or Poll).
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async createContent(req, res, next) {
    try {
      const result = await communityEngagementService.createContent(
        req.body,
        req.user,
        req.tenant,
        req.files || []
      );

      const typeLabel = result.contentType === 'NOTICE' ? 'Notice' : 'Poll';
      return res.success(result, `${typeLabel} created successfully`, 201);
    } catch (error) {
      next(error);
    }
  }
}

export const communityEngagementController = new CommunityEngagementController();
export default communityEngagementController;

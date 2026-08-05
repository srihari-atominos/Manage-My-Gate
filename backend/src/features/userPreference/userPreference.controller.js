import userPreferenceService from './userPreference.service.js';

class UserPreferenceController {
  /**
   * GET /api/users/preferences
   * Retrieve current user preferences and feature catalog
   */
  async getUserPreferences(req, res, next) {
    try {
      const userId = req.user?._id || req.user?.id;
      const data = await userPreferenceService.getUserPreferences(userId);

      return res.status(200).json({
        success: true,
        message: 'User preferences retrieved successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/users/preferences/quick-actions
   * Update active quick actions array (up to 7 items)
   */
  async updateQuickActions(req, res, next) {
    try {
      const userId = req.user?._id || req.user?.id;
      const { activeQuickActions } = req.body;

      const data = await userPreferenceService.updateQuickActions(userId, activeQuickActions);

      return res.status(200).json({
        success: true,
        message: 'Quick actions updated successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new UserPreferenceController();

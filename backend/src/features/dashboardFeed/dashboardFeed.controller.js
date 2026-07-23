import dashboardFeedService from './dashboardFeed.service.js';

class DashboardFeedController {
  async getAnnouncements(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const userId = req.user.id || req.user._id;
      const feed = await dashboardFeedService.getUnifiedAnnouncements(orgId, userId);
      res.success(feed, 'Dashboard announcements retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new DashboardFeedController();

import CrmInquiry from '../crmInquiry/crmInquiry.model.js';
import PlatformQuote from '../platformQuote/platformQuote.model.js';
import PlatformSubscription from '../platformSubscription/platformSubscription.model.js';

class AdminAnalyticsController {
  /**
   * High-performance endpoint for Super Admin Dashboard stats
   * GET /api/admin/dashboard-stats
   */
  async getDashboardStats(req, res, next) {
    try {
      // Execute concurrently to minimize wait time. 
      // For cross-collection KPI counts, Promise.all with countDocuments is the most performant approach.
      const [
        openEnquiries, 
        pendingApprovals, 
        activeTrials, 
        activeSubscriptions
      ] = await Promise.all([
        CrmInquiry.countDocuments({ status: { $in: ['NEW', 'QUALIFIED', 'DEMO_SCHEDULED'] } }),
        PlatformQuote.countDocuments({ status: 'DRAFT' }),
        PlatformSubscription.countDocuments({ status: { $in: ['TRIAL', 'TRIAL_ACTIVE'] } }),
        PlatformSubscription.countDocuments({ status: { $in: ['ACTIVE', 'RENEWED'] } })
      ]);

      return res.status(200).json({
        success: true,
        data: {
          openEnquiries,
          pendingApprovals,
          activeTrials,
          activeSubscriptions
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminAnalyticsController();

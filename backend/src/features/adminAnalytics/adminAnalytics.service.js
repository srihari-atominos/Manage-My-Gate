import crmInquiryService from '../crmInquiry/crmInquiry.service.js';
import platformQuoteService from '../platformQuote/platformQuote.service.js';
import platformSubscriptionService from '../platformSubscription/platformSubscription.service.js';

class AdminAnalyticsService {
  /**
   * High-performance aggregated KPI counts for Super Admin Dashboard stats
   * @returns {Promise<{openEnquiries: number, pendingApprovals: number, activeTrials: number, activeSubscriptions: number}>}
   */
  async getDashboardStats() {
    // Execute concurrently across domain services to minimize wait time
    const [
      openEnquiries,
      pendingApprovals,
      activeTrials,
      activeSubscriptions
    ] = await Promise.all([
      crmInquiryService.countInquiries({ status: { $in: ['NEW', 'QUALIFIED', 'DEMO_SCHEDULED'] } }),
      platformQuoteService.countQuotes({ status: 'DRAFT' }),
      platformSubscriptionService.countSubscriptions({ status: { $in: ['TRIAL', 'TRIAL_ACTIVE'] } }),
      platformSubscriptionService.countSubscriptions({ status: { $in: ['ACTIVE', 'RENEWED'] } })
    ]);

    return {
      openEnquiries,
      pendingApprovals,
      activeTrials,
      activeSubscriptions
    };
  }
}

export default new AdminAnalyticsService();

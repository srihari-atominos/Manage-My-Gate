import issueReportConfigService from './issueReportConfig.service.js';

export class IssueReportConfigController {
  /**
   * GET /api/v1/platform/reports/config
   * Fetch configured platform admin notification email
   */
  async getConfig(req, res, next) {
    try {
      const result = await issueReportConfigService.getConfig();
      res.success(result, 'Configuration retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/platform/reports/config
   * Update configured platform admin notification email
   */
  async updateConfig(req, res, next) {
    try {
      const { email } = req.body || {};
      const userId = req.user?.id || req.user?._id;
      const result = await issueReportConfigService.updateConfig(email, userId);
      res.success(result, 'Configuration updated successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}

export const issueReportConfigController = new IssueReportConfigController();
export default issueReportConfigController;

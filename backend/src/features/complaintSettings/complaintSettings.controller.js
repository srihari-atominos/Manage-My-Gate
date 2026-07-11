import complaintSettingsService from './complaintSettings.service.js';

class ComplaintSettingsController {
  async getSettings(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const settings = await complaintSettingsService.getSettings(orgId);
      res.success(settings, 'Complaint settings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const user = req.user;
      const updated = await complaintSettingsService.updateSettings(orgId, req.body, user);
      res.success(updated, 'Complaint settings updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new ComplaintSettingsController();

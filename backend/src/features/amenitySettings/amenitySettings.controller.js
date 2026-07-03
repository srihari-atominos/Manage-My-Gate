import amenitySettingsService from './amenitySettings.service.js';
import HttpError from '../../utils/httpError.utils.js';

class AmenitySettingsController {
  async getSettings(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const settings = await amenitySettingsService.getSettings(orgId);
      res.success(settings, 'Amenity settings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const userId = req.user.id;
      
      const settings = await amenitySettingsService.updateSettings(
        orgId,
        req.body,
        userId
      );
      
      res.success(settings, 'Amenity settings updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new AmenitySettingsController();

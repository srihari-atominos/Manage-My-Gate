import deviceTokenService from './deviceToken.services.js';

export class DeviceTokenController {
  /**
   * Register or refresh a device push token for the authenticated user.
   */
  async registerToken(req, res, next) {
    try {
      const userId = req.user?._id || req.user?.id;
      const result = await deviceTokenService.registerToken(userId, req.body);
      res.success(result, 'Device push token registered successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deactivate a device push token (e.g. on logout).
   */
  async unregisterToken(req, res, next) {
    try {
      const { pushToken } = req.params;
      const userId = req.user?._id || req.user?.id;
      const result = await deviceTokenService.unregisterToken(pushToken, userId);
      res.success(result, 'Device push token unregistered successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new DeviceTokenController();

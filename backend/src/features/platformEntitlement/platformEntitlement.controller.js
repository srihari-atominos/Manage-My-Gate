import platformEntitlementService from './platformEntitlement.service.js';

export class PlatformEntitlementController {
  async getEntitlements(req, res, next) {
    try {
      const { organizationId } = req.query;
      const data = await platformEntitlementService.getEntitlements(organizationId);
      res.success(data, 'Entitlements retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getCurrent(req, res, next) {
    try {
      const { organizationId } = req.params;
      const data = await platformEntitlementService.getCurrentEntitlement(organizationId);
      res.success(data, 'Current entitlement retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new PlatformEntitlementController();

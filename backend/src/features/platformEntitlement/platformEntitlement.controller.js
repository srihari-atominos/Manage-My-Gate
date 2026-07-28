import platformEntitlementService from './platformEntitlement.service.js';

class PlatformEntitlementController {
  async verify(req, res, next) {
    try {
      const { organisationId } = req.params;
      const { featureKey } = req.query;

      const result = await platformEntitlementService.checkEntitlementStatus(organisationId, featureKey);
      return res.status(200).json({
        success: true,
        message: 'Entitlement status verified successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async grant(req, res, next) {
    try {
      const entitlement = await platformEntitlementService.grantEntitlement(req.body);
      return res.status(201).json({
        success: true,
        message: 'Entitlement granted successfully.',
        data: entitlement,
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const result = await platformEntitlementService.listEntitlements(req.query);
      return res.status(200).json({
        success: true,
        message: 'Platform entitlements fetched successfully.',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getByOrgId(req, res, next) {
    try {
      const entitlements = await platformEntitlementService.getEntitlementsByOrgId(req.params.organisationId);
      return res.status(200).json({
        success: true,
        message: 'Organisation entitlements fetched successfully.',
        data: entitlements,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const entitlement = await platformEntitlementService.updateStatus(id, status);
      return res.status(200).json({
        success: true,
        message: 'Entitlement status updated successfully.',
        data: entitlement,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new PlatformEntitlementController();

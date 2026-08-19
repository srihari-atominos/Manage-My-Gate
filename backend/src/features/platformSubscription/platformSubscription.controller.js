import platformSubscriptionService from './platformSubscription.service.js';

export class PlatformSubscriptionController {
  async getAll(req, res, next) {
    try {
      const userRole = req.user?.role?.name || req.user?.role || '';
      const isPlatformAdmin = ['Super Admin', 'Platform Admin', 'SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(userRole);
      
      const queryParams = { ...req.query };
      if (!isPlatformAdmin && (req.user?.orgId || req.user?.organizationId)) {
        queryParams.organizationId = req.user.orgId || req.user.organizationId;
      }

      const data = await platformSubscriptionService.getSubscriptions(queryParams);
      res.success(data, 'Subscriptions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const data = await platformSubscriptionService.getSubscriptionById(id);
      res.success(data, 'Subscription retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getRenewal(req, res, next) {
    try {
      const { id } = req.params;
      const data = await platformSubscriptionService.getRenewalJob(id);
      res.success(data, 'Renewal job retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async suspend(req, res, next) {
    try {
      const { id } = req.params;
      const data = await platformSubscriptionService.suspendSubscription(id);
      res.success(data, 'Subscription suspended');
    } catch (error) {
      next(error);
    }
  }

  async cancel(req, res, next) {
    try {
      const { id } = req.params;
      const data = await platformSubscriptionService.cancelSubscription(id);
      res.success(data, 'Subscription cancelled');
    } catch (error) {
      next(error);
    }
  }

  async renewOrganization(req, res, next) {
    try {
      const orgId = req.body.organizationId || req.user?.orgId;
      const data = await platformSubscriptionService.renewSubscription(orgId, req.body);
      res.success(data, 'Subscription renewed successfully');
    } catch (error) {
      next(error);
    }
  }

  async renewSubscriptionById(req, res, next) {
    try {
      const { id } = req.params;
      const sub = await platformSubscriptionService.getSubscriptionById(id);
      const orgId = sub.organizationId;
      const data = await platformSubscriptionService.renewSubscription(orgId, req.body);
      res.success(data, 'Subscription renewed successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new PlatformSubscriptionController();

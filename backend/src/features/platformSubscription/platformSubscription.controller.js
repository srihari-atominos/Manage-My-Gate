import platformSubscriptionService from './platformSubscription.service.js';

class PlatformSubscriptionController {
  async create(req, res, next) {
    try {
      const subscription = await platformSubscriptionService.createSubscription(req.body);
      return res.status(201).json({
        success: true,
        message: 'Platform subscription created successfully.',
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const result = await platformSubscriptionService.listSubscriptions(req.query);
      return res.status(200).json({
        success: true,
        message: 'Platform subscriptions fetched successfully.',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const subscription = await platformSubscriptionService.getSubscriptionById(req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Platform subscription fetched successfully.',
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  async getByOrgId(req, res, next) {
    try {
      const subscription = await platformSubscriptionService.getSubscriptionByOrgId(req.params.organisationId);
      return res.status(200).json({
        success: true,
        message: 'Platform subscription for organisation fetched successfully.',
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const subscription = await platformSubscriptionService.updateSubscriptionStatus(id, status);
      return res.status(200).json({
        success: true,
        message: 'Platform subscription status updated successfully.',
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  async cancel(req, res, next) {
    try {
      const { id } = req.params;
      const subscription = await platformSubscriptionService.cancelSubscription(id);
      return res.status(200).json({
        success: true,
        message: 'Platform subscription cancelled successfully.',
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new PlatformSubscriptionController();

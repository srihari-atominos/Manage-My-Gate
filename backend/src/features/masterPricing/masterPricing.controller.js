import masterPricingService from './masterPricing.service.js';

class MasterPricingController {
  /**
   * Create a new master pricing plan.
   */
  async create(req, res, next) {
    try {
      const xRequestId = req.headers['x-request-id'] || req.id;
      const result = await masterPricingService.createPlan(req.body, xRequestId);
      res.success(result, 'Master pricing plan created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all master pricing plans with pagination and filters.
   */
  async getAll(req, res, next) {
    try {
      const xRequestId = req.headers['x-request-id'] || req.id;
      const result = await masterPricingService.getAllPlans(req.query, xRequestId);
      res.success(result, 'Master pricing plans retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get master pricing plan by ID.
   */
  async getById(req, res, next) {
    try {
      const xRequestId = req.headers['x-request-id'] || req.id;
      const { id } = req.params;
      const result = await masterPricingService.getPlanById(id, xRequestId);
      res.success(result, 'Master pricing plan retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update master pricing plan by ID.
   */
  async update(req, res, next) {
    try {
      const xRequestId = req.headers['x-request-id'] || req.id;
      const { id } = req.params;
      const result = await masterPricingService.updatePlan(id, req.body, xRequestId);
      res.success(result, 'Master pricing plan updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete master pricing plan by ID.
   */
  async delete(req, res, next) {
    try {
      const xRequestId = req.headers['x-request-id'] || req.id;
      const { id } = req.params;
      const result = await masterPricingService.deletePlan(id, xRequestId);
      res.success(result, 'Master pricing plan deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new MasterPricingController();

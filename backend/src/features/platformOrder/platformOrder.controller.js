import platformOrderService from './platformOrder.service.js';

export class PlatformOrderController {
  /**
   * Convert accepted quote to order (Atomic Transaction with Idempotency Key).
   */
  async convertFromQuote(req, res, next) {
    try {
      const { quoteId } = req.params;
      const conversionId = req.body.conversionId || req.headers['x-idempotency-key'] || null;
      const actorId = req.user?._id || req.user?.id || null;
      const actorName = req.user?.name || req.user?.email || 'Platform User';

      const result = await platformOrderService.convertQuoteToOrder(
        quoteId,
        conversionId,
        actorId,
        actorName
      );
      const status = result.isDuplicateRequest ? 200 : 201;
      res.success(result, result.message, status);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Confirm Order & Generate Billing Schedule.
   */
  async confirm(req, res, next) {
    try {
      const { id } = req.params;
      const actorId = req.user?._id || req.user?.id || null;
      const actorName = req.user?.name || req.user?.email || 'Platform User';
      const data = await platformOrderService.confirmOrder(id, actorId, actorName);
      res.success(data, 'Order confirmed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create Commercial Order Amendment.
   */
  async createAmendment(req, res, next) {
    try {
      const { id } = req.params;
      const actorId = req.user?._id || req.user?.id || null;
      const actorName = req.user?.name || req.user?.email || 'Platform User';
      const data = await platformOrderService.createAmendment(id, req.body, actorId, actorName);
      res.success(data, 'Order amendment created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all orders (paginated).
   */
  async getAll(req, res, next) {
    try {
      const userRole = req.user?.role?.name || req.user?.role || '';
      const isPlatformAdmin = ['Super Admin', 'Platform Admin', 'SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(userRole);
      
      const queryParams = { ...req.query };
      if (!isPlatformAdmin && (req.user?.orgId || req.user?.organizationId)) {
        queryParams.organizationId = req.user.orgId || req.user.organizationId;
      }

      const data = await platformOrderService.getOrders(queryParams);
      res.success(data, 'Orders retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single order by ID or orderNumber.
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const data = await platformOrderService.getOrderById(id);
      res.success(data, 'Order retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get order timeline.
   */
  async getTimeline(req, res, next) {
    try {
      const { id } = req.params;
      const data = await platformOrderService.getOrderTimeline(id);
      res.success(data, 'Order timeline retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get order billing schedules.
   */
  async getBillingSchedules(req, res, next) {
    try {
      const { id } = req.params;
      const data = await platformOrderService.getBillingSchedules(id);
      res.success(data, 'Billing schedules retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get order amendments.
   */
  async getAmendments(req, res, next) {
    try {
      const { id } = req.params;
      const data = await platformOrderService.getAmendments(id);
      res.success(data, 'Order amendments retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new PlatformOrderController();

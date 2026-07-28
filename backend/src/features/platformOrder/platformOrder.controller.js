import platformOrderService from './platformOrder.service.js';

class PlatformOrderController {
  /**
   * Create an order from an approved quote.
   */
  async createFromQuote(req, res, next) {
    try {
      const payload = {
        quoteId: req.body.quoteId,
        organisationId: req.body.organisationId,
        acceptedBy: req.user ? req.user._id : req.body.acceptedBy,
      };
      const result = await platformOrderService.createOrderFromQuote(payload);
      res.success(result, 'Platform order created successfully from quote', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all platform orders with pagination & filters.
   */
  async getAll(req, res, next) {
    try {
      const result = await platformOrderService.getAllOrders(req.query);
      res.success(result, 'Platform orders retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get platform order by ID.
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await platformOrderService.getOrderById(id);
      res.success(result, 'Platform order retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get platform order by order number.
   */
  async getByNumber(req, res, next) {
    try {
      const { orderNumber } = req.params;
      const result = await platformOrderService.getOrderByNumber(orderNumber);
      res.success(result, 'Platform order retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update platform order status.
   */
  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const result = await platformOrderService.updateOrderStatus(id, status);
      res.success(result, `Platform order status updated to ${status} successfully`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update platform order details.
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const result = await platformOrderService.updateOrder(id, req.body);
      res.success(result, 'Platform order updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete platform order.
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const result = await platformOrderService.deleteOrder(id);
      res.success(result, 'Platform order deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new PlatformOrderController();

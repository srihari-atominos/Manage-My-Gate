import platformPaymentService from './platformPayment.service.js';

class PlatformPaymentController {
  /**
   * Process a payment or incoming payment webhook.
   */
  async process(req, res, next) {
    try {
      const result = await platformPaymentService.processPayment(req.body);
      const statusCode = result.alreadyProcessed ? 200 : 201;
      res.success(result, result.message, statusCode);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all platform payments with pagination & filters.
   */
  async getAll(req, res, next) {
    try {
      const result = await platformPaymentService.getAllPayments(req.query);
      res.success(result, 'Platform payments retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get platform payment by ID.
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await platformPaymentService.getPaymentById(id);
      res.success(result, 'Platform payment retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payments by Order ID.
   */
  async getByOrderId(req, res, next) {
    try {
      const { orderId } = req.params;
      const result = await platformPaymentService.getPaymentsByOrderId(orderId);
      res.success(result, 'Platform payments retrieved successfully for order');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payments by Invoice ID.
   */
  async getByInvoiceId(req, res, next) {
    try {
      const { invoiceId } = req.params;
      const result = await platformPaymentService.getPaymentsByInvoiceId(invoiceId);
      res.success(result, 'Platform payments retrieved successfully for invoice');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refund a platform payment.
   */
  async refund(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const result = await platformPaymentService.refundPayment(id, reason);
      res.success(result, result.message);
    } catch (error) {
      next(error);
    }
  }
}

export default new PlatformPaymentController();

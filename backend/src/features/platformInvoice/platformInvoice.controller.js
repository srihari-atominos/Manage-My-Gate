import platformInvoiceService from './platformInvoice.service.js';

class PlatformInvoiceController {
  /**
   * Generate an invoice from a platform order.
   */
  async generateFromOrder(req, res, next) {
    try {
      const payload = {
        orderId: req.body.orderId,
        gstin: req.body.gstin,
        hsnSacCode: req.body.hsnSacCode,
        isInterstate: req.body.isInterstate,
      };
      const result = await platformInvoiceService.generateInvoiceFromOrder(payload);
      res.success(result, 'Platform invoice generated successfully from order', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all platform invoices with pagination & filters.
   */
  async getAll(req, res, next) {
    try {
      const result = await platformInvoiceService.getAllInvoices(req.query);
      res.success(result, 'Platform invoices retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get platform invoice by ID.
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await platformInvoiceService.getInvoiceById(id);
      res.success(result, 'Platform invoice retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get platform invoice by invoice number.
   */
  async getByNumber(req, res, next) {
    try {
      const { invoiceNumber } = req.params;
      const result = await platformInvoiceService.getInvoiceByNumber(invoiceNumber);
      res.success(result, 'Platform invoice retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update platform invoice status.
   */
  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const result = await platformInvoiceService.updateInvoiceStatus(id, status);
      res.success(result, `Platform invoice status updated to ${status} successfully`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update platform invoice details.
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const result = await platformInvoiceService.updateInvoice(id, req.body);
      res.success(result, 'Platform invoice updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete platform invoice.
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const result = await platformInvoiceService.deleteInvoice(id);
      res.success(result, 'Platform invoice deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new PlatformInvoiceController();

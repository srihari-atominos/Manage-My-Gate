import platformInvoiceService from './platformInvoice.service.js';

export class PlatformInvoiceController {
  /**
   * Generate Invoice from Order.
   */
  async generateFromOrder(req, res, next) {
    try {
      const { orderId } = req.body;
      const billingScheduleId = req.body.billingScheduleId || null;
      const actorId = req.user?._id || req.user?.id || null;
      const actorName = req.user?.name || req.user?.email || 'Platform User';

      const data = await platformInvoiceService.generateInvoiceFromOrder(
        orderId,
        billingScheduleId,
        actorId,
        actorName
      );
      res.success(data, 'Invoice generated successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Record payment on invoice.
   */
  async recordPayment(req, res, next) {
    try {
      const { id } = req.params;
      const { amount } = req.body;
      const data = await platformInvoiceService.recordPaymentOnInvoice(id, amount);
      res.success(data, 'Payment recorded on invoice');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Void an invoice.
   */
  async voidInvoice(req, res, next) {
    try {
      const { id } = req.params;
      const data = await platformInvoiceService.voidInvoice(id, req.body.reason || '');
      res.success(data, 'Invoice voided successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all invoices (paginated).
   */
  async getAll(req, res, next) {
    try {
      const userRole = req.user?.role?.name || req.user?.role || '';
      const isPlatformAdmin = ['Super Admin', 'Platform Admin', 'SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(userRole);
      
      const queryParams = { ...req.query };
      if (!isPlatformAdmin && (req.user?.orgId || req.user?.organizationId)) {
        queryParams.organizationId = req.user.orgId || req.user.organizationId;
      }

      const data = await platformInvoiceService.getInvoices(queryParams);
      res.success(data, 'Invoices retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get invoice by ID or invoiceNumber.
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const data = await platformInvoiceService.getInvoiceById(id);
      res.success(data, 'Invoice retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async downloadPdf(req, res, next) {
    try {
      const { id } = req.params;
      const html = await platformInvoiceService.generateInvoiceHtml(id);
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `inline; filename=Invoice_${id}.html`);
      res.send(html);
    } catch (error) {
      next(error);
    }
  }
}

export default new PlatformInvoiceController();

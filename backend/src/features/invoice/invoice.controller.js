import invoiceService from './invoice.services.js';

export class InvoiceController {
  /**
   * Fetch personal outstanding dues and compliance info for a user.
   */
  async getMyDues(req, res, next) {
    try {
      // req.user contains the authenticated user context
      const data = await invoiceService.getUserDuesOverview(req.user);
      res.success(data, 'Outstanding dues retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Manually trigger billing generation for ad-hoc / missed cycles.
   */
  async triggerManual(req, res, next) {
    try {
      const data = await invoiceService.triggerManualBilling(req.body);
      res.success(data, 'Manual billing cycle generated successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark invoice as verification pending with offline payment cheque/NEFT ref.
   */
  async settleOffline(req, res, next) {
    try {
      const { id } = req.params;
      const { offlineReference } = req.body;
      const data = await invoiceService.logOfflinePayment(id, offlineReference);
      res.success(data, 'Offline payment recorded and pending clearance verification');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fetch aggregated community billing dashboard metrics.
   */
  async getDashboardKPIs(req, res, next) {
    try {
      const { communityId } = req.query;
      const data = await invoiceService.getDashboardKPIs(communityId);
      res.success(data, 'Dashboard billing KPIs retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new InvoiceController();

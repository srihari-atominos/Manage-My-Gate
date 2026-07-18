import apiClient from '../../../services/apiClient.js';

export const billingService = {
  /**
   * Fetch community billing dashboard statistics/KPIs.
   * @param {string} communityId
   */
  async getKPIs(communityId) {
    return await apiClient.get('/invoices/kpis', { params: { communityId } });
  },

  /**
   * Fetch personal outstanding dues for a resident.
   */
  async getMyDues() {
    return await apiClient.get('/invoices/my-dues');
  },

  /**
   * Fetch paginated and filtered invoices for the admin table grid.
   * @param {number} page
   * @param {number} limit
   * @param {Object} [filters]
   */
  async getInvoicesTable(page, limit, filters = {}) {
    return await apiClient.get('/invoices', { params: { page, limit, ...filters } });
  },

  /**
   * Manually trigger billing run.
   * @param {string} assessmentId
   * @param {string} billingPeriodString
   */
  async triggerManualBilling(assessmentId, billingPeriodString) {
    return await apiClient.post('/invoices/trigger-manual', {
      assessmentId,
      billingPeriodString,
    });
  },

  /**
   * Record an offline payment for verification.
   * @param {string} invoiceId
   * @param {Object} payload - { offlineReference, paymentMethod }
   */
  async settleInvoiceOffline(invoiceId, payload) {
    return await apiClient.patch(`/invoices/${invoiceId}/settle-offline`, payload);
  },

  /**
   * Clear/approve offline payment (Admin only).
   * @param {string} invoiceId
   */
  async approveInvoiceOffline(invoiceId) {
    return await apiClient.patch(`/invoices/${invoiceId}/approve`);
  },
};

export default billingService;

import apiClient from '../../../services/apiClient';
import {
  BillingKPIs,
  OfflineSettlementPayload,
  RazorpayVerificationPayload,
} from '../types';

export const billingService = {
  /**
   * Fetch community billing dashboard statistics/KPIs.
   * @param communityId
   */
  async getKPIs(communityId: string): Promise<BillingKPIs> {
    const response: any = await apiClient.get('/invoices/kpis', { params: { communityId } });
    const body = response?.success !== undefined ? response : response?.data;
    return body?.data || body;
  },

  /**
   * Fetch personal outstanding dues for a resident.
   */
  async getMyDues(): Promise<any> {
    const response: any = await apiClient.get('/invoices/my-dues');
    const body = response?.success !== undefined ? response : response?.data;
    return body?.data || body;
  },

  /**
   * Fetch single invoice details by ID.
   * @param id
   */
  async getInvoiceById(id: string): Promise<any> {
    const response: any = await apiClient.get(`/invoices/${id}`);
    const body = response?.success !== undefined ? response : response?.data;
    return body?.data || body;
  },

  /**
   * Fetch paginated and filtered invoices for the grid/list.
   * @param page
   * @param limit
   * @param filters
   */
  async getInvoicesTable(page: number, limit: number, filters: Record<string, any> = {}): Promise<any> {
    const response: any = await apiClient.get('/invoices', { params: { page, limit, ...filters } });
    const body = response?.success !== undefined ? response : response?.data;
    return body?.data || body;
  },

  /**
   * Manually trigger billing run.
   * @param assessmentId
   * @param billingPeriodString
   */
  async triggerManualBilling(assessmentId: string, billingPeriodString: string): Promise<any> {
    const response: any = await apiClient.post('/invoices/trigger-manual', {
      assessmentId,
      billingPeriodString,
    });
    const body = response?.success !== undefined ? response : response?.data;
    return body?.data || body;
  },

  /**
   * Trigger invoice generation / notification delivery.
   * @param payload
   */
  async triggerInvoiceGeneration(payload: Record<string, any> = {}): Promise<any> {
    const response: any = await apiClient.post('/invoices/trigger-whatsapp', payload);
    const body = response?.success !== undefined ? response : response?.data;
    return body?.data || body;
  },

  /**
   * Record an offline payment for verification.
   * @param invoiceId
   * @param payload
   */
  async settleInvoiceOffline(invoiceId: string, payload: OfflineSettlementPayload): Promise<any> {
    const response: any = await apiClient.patch(`/invoices/${invoiceId}/settle-offline`, payload);
    const body = response?.success !== undefined ? response : response?.data;
    return body?.data || body;
  },

  /**
   * Clear/approve offline payment (Admin only).
   * @param invoiceId
   */
  async approveInvoiceOffline(invoiceId: string): Promise<any> {
    const response: any = await apiClient.patch(`/invoices/${invoiceId}/approve`);
    const body = response?.success !== undefined ? response : response?.data;
    return body?.data || body;
  },

  /**
   * Reject offline payment submission (Admin only).
   * @param invoiceId
   * @param reason
   */
  async rejectInvoiceOffline(invoiceId: string, reason?: string): Promise<any> {
    const response: any = await apiClient.patch(`/invoices/${invoiceId}/reject`, { reason });
    const body = response?.success !== undefined ? response : response?.data;
    return body?.data || body;
  },

  /**
   * Settle invoice payment using resident digital wallet balance.
   * @param invoiceId
   * @param amount
   */
  async payInvoiceWithWallet(invoiceId: string, amount: number): Promise<any> {
    const response: any = await apiClient.post('/wallet/pay-invoice', { invoiceId, amount });
    const body = response?.success !== undefined ? response : response?.data;
    return body?.data || body;
  },

  /**
   * Create Razorpay payment order for an invoice.
   * @param invoiceId
   * @param amount
   */
  async createRazorpayOrder(invoiceId: string, amount: number): Promise<any> {
    const response: any = await apiClient.post('/payments/create-order', {
      referenceId: invoiceId,
      referenceType: 'Invoice',
      amount,
      currency: 'INR',
      gateway: 'razorpay',
    });
    const body = response?.success !== undefined ? response : response?.data;
    return body?.data || body;
  },

  /**
   * Verify Razorpay cryptographic signature.
   * @param payload
   */
  async verifyRazorpayPayment(payload: RazorpayVerificationPayload): Promise<any> {
    const formattedPayload = {
      paymentId: payload.paymentId || payload.payment_id,
      orderId: payload.razorpayOrderId || payload.orderId || payload.razorpay_order_id,
      razorpayPaymentId: payload.razorpayPaymentId || payload.razorpay_payment_id,
      razorpaySignature: payload.razorpaySignature || payload.razorpay_signature,
      payment_id: payload.paymentId || payload.payment_id,
      razorpay_payment_id: payload.razorpayPaymentId || payload.razorpay_payment_id,
      razorpay_order_id: payload.razorpayOrderId || payload.orderId || payload.razorpay_order_id,
      razorpay_signature: payload.razorpaySignature || payload.razorpay_signature,
    };
    const response: any = await apiClient.post('/payments/verify-signature', formattedPayload);
    const body = response?.success !== undefined ? response : response?.data;
    return body?.data || body;
  },

  /**
   * Fetch digital wallet balance and details.
   */
  async getWalletBalance(): Promise<any> {
    const response: any = await apiClient.get('/wallet');
    const body = response?.success !== undefined ? response : response?.data;
    return body?.data || body;
  },

  /**
   * Create Razorpay order to top up wallet balance.
   * @param amount
   */
  async createWalletOrder(amount: number): Promise<any> {
    const response: any = await apiClient.post('/wallet/create-order', { amount });
    const body = response?.success !== undefined ? response : response?.data;
    return body?.data || body;
  },

  /**
   * Verify payment to top up wallet.
   * @param paymentData
   */
  async verifyWalletPayment(paymentData: any): Promise<any> {
    const formattedPayload = {
      ...paymentData,
      amount: paymentData?.amount,
      razorpay_order_id: paymentData?.razorpay_order_id || paymentData?.razorpayOrderId || paymentData?.orderId,
      razorpay_payment_id: paymentData?.razorpay_payment_id || paymentData?.razorpayPaymentId || paymentData?.paymentId,
      razorpay_signature: paymentData?.razorpay_signature || paymentData?.razorpaySignature,
      razorpayOrderId: paymentData?.razorpay_order_id || paymentData?.razorpayOrderId || paymentData?.orderId,
      razorpayPaymentId: paymentData?.razorpay_payment_id || paymentData?.razorpayPaymentId || paymentData?.paymentId,
      razorpaySignature: paymentData?.razorpay_signature || paymentData?.razorpaySignature,
    };
    const response: any = await apiClient.post('/wallet/verify-payment', formattedPayload);
    const body = response?.success !== undefined ? response : response?.data;
    return body?.data || body;
  },

  /**
   * Create a new community assessment rule (Admin/Finance).
   * @param payload
   */
  async createAssessment(payload: Record<string, any>): Promise<any> {
    const response: any = await apiClient.post('/assessments', payload);
    const body = response?.success !== undefined ? response : response?.data;
    return body?.data || body;
  },

  /**
   * Update an existing assessment rule template (Admin/Finance).
   * @param assessmentId
   * @param payload
   */
  async updateAssessment(assessmentId: string, payload: Record<string, any>): Promise<any> {
    const response: any = await apiClient.patch(`/assessments/${assessmentId}`, payload);
    const body = response?.success !== undefined ? response : response?.data;
    return body?.data || body;
  },

  /**
   * Fetch community assessment rules list (Admin/Finance).
   */
  async getAssessments(): Promise<any> {
    const response: any = await apiClient.get('/assessments');
    const body = response?.success !== undefined ? response : response?.data;
    return body?.data || body;
  },

  /**
   * Delete an assessment rule (Admin/Finance).
   * Performs physical delete if untriggered, or soft-delete (archived) if invoices exist.
   * @param assessmentId
   */
  async deleteAssessment(assessmentId: string): Promise<any> {
    const response: any = await apiClient.delete(`/assessments/${assessmentId}`);
    const body = response?.success !== undefined ? response : response?.data;
    return body?.data || body;
  },

  /**
   * Send an in-app reminder notification to the resident for an individual invoice.
   * @param invoiceId
   */
  async sendInvoiceReminder(invoiceId: string): Promise<any> {
    const response: any = await apiClient.post(`/invoices/${invoiceId}/send-reminder`);
    const body = response?.success !== undefined ? response : response?.data;
    return body?.data || body;
  },

  /**
   * Send an in-app reminder notification to a resident for their overall dues portfolio.
   * @param payload
   */
  async notifyResidentPortfolio(payload: {
    residentUserId: string;
    residentName?: string;
    totalDue: number;
    units?: string[];
  }): Promise<any> {
    const response: any = await apiClient.post('/invoices/notify-resident', payload);
    const body = response?.success !== undefined ? response : response?.data;
    return body?.data || body;
  },
};

export default billingService;

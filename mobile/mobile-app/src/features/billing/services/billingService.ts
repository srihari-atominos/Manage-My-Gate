import apiClient from '../../../services/apiClient';

export const billingService = {
  getKPIs: async (communityId: string) => {
    return await apiClient.get('/invoices/kpis', { params: { communityId } });
  },

  getMyDues: async () => {
    return await apiClient.get('/invoices/my-dues');
  },

  getInvoicesTable: async (page: number, limit: number, filters: any = {}) => {
    return await apiClient.get('/invoices', { params: { page, limit, ...filters } });
  },

  triggerManualBilling: async (assessmentId: string, billingPeriodString: string) => {
    return await apiClient.post('/invoices/trigger-manual', {
      assessmentId,
      billingPeriodString,
    });
  },

  settleInvoiceOffline: async (invoiceId: string, payload: any) => {
    return await apiClient.patch(`/invoices/${invoiceId}/settle-offline`, payload);
  },

  approveInvoiceOffline: async (invoiceId: string) => {
    return await apiClient.patch(`/invoices/${invoiceId}/approve`);
  },

  payInvoiceWithWallet: async (invoiceId: string) => {
    return await apiClient.post('/wallet/pay-invoice', { invoiceId });
  },

  createRazorpayOrder: async (invoiceId: string, amount: number) => {
    return await apiClient.post('/payments/create-order', {
      referenceId: invoiceId,
      referenceType: 'Invoice',
      amount,
      currency: 'INR',
      gateway: 'razorpay',
    });
  },

  verifyRazorpayPayment: async (payload: any) => {
    const formattedPayload = {
      paymentId: payload.paymentId || payload.payment_id,
      orderId: payload.razorpayOrderId || payload.orderId || payload.razorpay_order_id,
      razorpayPaymentId: payload.razorpayPaymentId || payload.razorpay_payment_id,
      razorpaySignature: payload.razorpaySignature || payload.razorpay_signature,
    };
    return await apiClient.post('/payments/verify-signature', formattedPayload);
  },
};

export default billingService;

import apiClient from '@/src/services/apiClient';
import { WalletRechargeOrder, WalletVerificationPayload } from '../types';

export const walletService = {
  /**
   * Fetch digital wallet balance, active access passes, and transaction history.
   */
  async getWalletData(): Promise<any> {
    const response: any = await apiClient.get('/wallet');
    const body = response?.success !== undefined ? response : response?.data;
    return body?.data || body;
  },

  /**
   * Create Razorpay top-up order on the backend.
   */
  async createRechargeOrder(amount: number): Promise<WalletRechargeOrder> {
    const response: any = await apiClient.post('/wallet/create-order', { amount });
    const body = response?.success !== undefined ? response : response?.data;
    return body?.data || body;
  },

  /**
   * Direct wallet top-up (system/test mode).
   */
  async addMoneyDirect(amount: number): Promise<any> {
    const response: any = await apiClient.post('/wallet/add-money', { amount });
    const body = response?.success !== undefined ? response : response?.data;
    return body?.data || body;
  },

  /**
   * Verify cryptographic payment signature to finalize wallet credit.
   */
  async verifyPayment(paymentData: WalletVerificationPayload): Promise<any> {
    const formattedPayload = {
      ...paymentData,
      amount: paymentData?.amount,
      razorpay_order_id:
        paymentData?.razorpay_order_id || paymentData?.razorpayOrderId || paymentData?.orderId,
      razorpay_payment_id:
        paymentData?.razorpay_payment_id || paymentData?.razorpayPaymentId,
      razorpay_signature:
        paymentData?.razorpay_signature || paymentData?.razorpaySignature,
      razorpayOrderId:
        paymentData?.razorpay_order_id || paymentData?.razorpayOrderId || paymentData?.orderId,
      razorpayPaymentId:
        paymentData?.razorpay_payment_id || paymentData?.razorpayPaymentId,
      razorpaySignature:
        paymentData?.razorpay_signature || paymentData?.razorpaySignature,
      paymentId: paymentData?.paymentId || paymentData?.payment_id,
      payment_id: paymentData?.paymentId || paymentData?.payment_id,
    };
    const response: any = await apiClient.post('/wallet/verify-payment', formattedPayload);
    const body = response?.success !== undefined ? response : response?.data;
    return body?.data || body;
  },

  /**
   * Pay an outstanding invoice using wallet funds.
   */
  async payInvoice(invoiceId: string, amount?: number): Promise<any> {
    const response: any = await apiClient.post('/wallet/pay-invoice', { invoiceId, amount });
    const body = response?.success !== undefined ? response : response?.data;
    return body?.data || body;
  },
};

export default walletService;

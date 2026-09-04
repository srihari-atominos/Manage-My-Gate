import { useState, useCallback } from 'react';
import { useBilling } from './useBilling';

export type PaymentMethod = 'WALLET' | 'RAZORPAY' | 'OFFLINE';

export interface MobilePaymentState {
  isProcessing: boolean;
  paymentMethod: PaymentMethod | null;
  activeOrder: any | null;
  error: string | null;
  successMsg: string | null;
}

/**
 * Custom Hook: useMobilePayment
 *
 * Encapsulates the mobile payment lifecycle (Wallet payment, Razorpay order creation,
 * signature verification, and error handling) for mobile checkout components.
 */
export const useMobilePayment = () => {
  const { payInvoiceWallet, payInvoiceRazorpay, verifyRazorpay, loadingStates } = useBilling();

  const [paymentState, setPaymentState] = useState<MobilePaymentState>({
    isProcessing: false,
    paymentMethod: null,
    activeOrder: null,
    error: null,
    successMsg: null,
  });

  const resetPaymentState = useCallback(() => {
    setPaymentState({
      isProcessing: false,
      paymentMethod: null,
      activeOrder: null,
      error: null,
      successMsg: null,
    });
  }, []);

  /**
   * Settle invoice via Digital Wallet
   */
  const processWalletPayment = useCallback(
    async (invoiceId: string, amount: number) => {
      setPaymentState({
        isProcessing: true,
        paymentMethod: 'WALLET',
        activeOrder: null,
        error: null,
        successMsg: null,
      });

      try {
        const result = await payInvoiceWallet(invoiceId, amount);
        setPaymentState({
          isProcessing: false,
          paymentMethod: 'WALLET',
          activeOrder: null,
          error: null,
          successMsg: 'Invoice payment settled via Digital Wallet successfully!',
        });
        return result;
      } catch (err: any) {
        const errorMsg = err?.message || err || 'Wallet payment failed';
        setPaymentState({
          isProcessing: false,
          paymentMethod: 'WALLET',
          activeOrder: null,
          error: errorMsg,
          successMsg: null,
        });
        throw err;
      }
    },
    [payInvoiceWallet]
  );

  /**
   * Create Razorpay payment order
   */
  const initiateRazorpayPayment = useCallback(
    async (invoiceId: string, amount: number) => {
      setPaymentState({
        isProcessing: true,
        paymentMethod: 'RAZORPAY',
        activeOrder: null,
        error: null,
        successMsg: null,
      });

      try {
        const orderData = await payInvoiceRazorpay(invoiceId, amount);
        setPaymentState({
          isProcessing: false,
          paymentMethod: 'RAZORPAY',
          activeOrder: orderData,
          error: null,
          successMsg: null,
        });
        return orderData;
      } catch (err: any) {
        const errorMsg = err?.message || err || 'Failed to create payment order';
        setPaymentState({
          isProcessing: false,
          paymentMethod: 'RAZORPAY',
          activeOrder: null,
          error: errorMsg,
          successMsg: null,
        });
        throw err;
      }
    },
    [payInvoiceRazorpay]
  );

  /**
   * Verify Razorpay payment signature
   */
  const confirmRazorpayPayment = useCallback(
    async (verificationPayload: any) => {
      setPaymentState((prev) => ({ ...prev, isProcessing: true, error: null }));

      try {
        const verifyResult = await verifyRazorpay(verificationPayload);
        setPaymentState({
          isProcessing: false,
          paymentMethod: 'RAZORPAY',
          activeOrder: null,
          error: null,
          successMsg: 'Payment verified and settled successfully!',
        });
        return verifyResult;
      } catch (err: any) {
        const errorMsg = err?.message || err || 'Payment verification failed';
        setPaymentState((prev) => ({
          ...prev,
          isProcessing: false,
          error: errorMsg,
        }));
        throw err;
      }
    },
    [verifyRazorpay]
  );

  return {
    paymentState,
    isGlobalSettling: loadingStates.settleInvoice || paymentState.isProcessing,
    processWalletPayment,
    initiateRazorpayPayment,
    confirmRazorpayPayment,
    resetPaymentState,
  };
};

export default useMobilePayment;

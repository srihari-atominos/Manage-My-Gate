import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import {
  fetchMyDues,
  fetchInvoicesGrid,
  submitOfflineSettlement,
  payWithWallet as payWithWalletThunk,
  verifyRazorpaySignature as verifyRazorpaySignatureThunk,
  clearBillingError,
} from '../store/billingSlice';
import billingService from '../services/billingService';

export const useBilling = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { kpis, activeDues, invoicesList, pagination, loadingStates, error } = useSelector(
    (state: RootState) => (state as any).billing
  );

  const getMyDues = useCallback(() => {
    return dispatch(fetchMyDues());
  }, [dispatch]);

  const getInvoices = useCallback(
    (page: number, limit: number, filters?: any) => {
      return dispatch(fetchInvoicesGrid({ page, limit, filters }));
    },
    [dispatch]
  );

  const payOffline = useCallback(
    (invoiceId: string, offlineReference: string, paymentMethod: string) => {
      return dispatch(submitOfflineSettlement({ invoiceId, offlineReference, paymentMethod })).unwrap();
    },
    [dispatch]
  );

  const payViaWallet = useCallback(
    (invoiceId: string) => {
      return dispatch(payWithWalletThunk(invoiceId)).unwrap();
    },
    [dispatch]
  );

  const triggerRazorpayCheckout = useCallback(async (invoiceId: string, amount: number) => {
    // Triggers Razorpay order creation on backend
    const response = await billingService.createRazorpayOrder(invoiceId, amount);
    const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
    return body?.data || body;
  }, []);

  const verifyPaymentSignature = useCallback(
    (payload: any) => {
      return dispatch(verifyRazorpaySignatureThunk(payload)).unwrap();
    },
    [dispatch]
  );

  const resetError = useCallback(() => {
    dispatch(clearBillingError());
  }, [dispatch]);

  return {
    kpis,
    activeDues,
    invoices: invoicesList,
    pagination,
    loadingStates,
    error,

    fetchMyDues: getMyDues,
    fetchInvoices: getInvoices,
    settleOffline: payOffline,
    payWithWallet: payViaWallet,
    initRazorpayCheckout: triggerRazorpayCheckout,
    verifyPayment: verifyPaymentSignature,
    clearError: resetError,
  };
};

export default useBilling;

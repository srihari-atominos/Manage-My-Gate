import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import {
  fetchKPIs as fetchKPIsThunk,
  fetchMyDues,
  fetchInvoicesGrid,
  fetchInvoiceDetails as fetchInvoiceDetailsThunk,
  submitOfflineSettlement,
  approveOfflineInvoice as approveOfflineInvoiceThunk,
  triggerManualBilling as triggerManualBillingThunk,
  payWithWallet as payWithWalletThunk,
  verifyRazorpaySignature as verifyRazorpaySignatureThunk,
  clearBillingError,
  setSelectedInvoice as setSelectedInvoiceAction,
  clearSelectedInvoice as clearSelectedInvoiceAction,
} from '../store/billingSlice';
import billingService from '../services/billingService';

export const useBilling = () => {
  const dispatch = useDispatch<AppDispatch>();

  const {
    kpis,
    activeDues,
    invoicesList,
    selectedInvoice,
    assessmentTemplates,
    pagination,
    loadingStates,
    error,
  } = useSelector((state: RootState) => (state as any).billing);

  const getKPIs = useCallback(
    (communityId: string) => {
      return dispatch(fetchKPIsThunk(communityId));
    },
    [dispatch]
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

  const getInvoiceDetails = useCallback(
    (invoiceId: string) => {
      return dispatch(fetchInvoiceDetailsThunk(invoiceId));
    },
    [dispatch]
  );

  const payOffline = useCallback(
    (invoiceId: string, offlineReference: string, paymentMethod: string) => {
      return dispatch(submitOfflineSettlement({ invoiceId, offlineReference, paymentMethod })).unwrap();
    },
    [dispatch]
  );

  const approveOffline = useCallback(
    (invoiceId: string) => {
      return dispatch(approveOfflineInvoiceThunk(invoiceId)).unwrap();
    },
    [dispatch]
  );

  const triggerManual = useCallback(
    (assessmentId: string, billingPeriodString: string) => {
      return dispatch(triggerManualBillingThunk({ assessmentId, billingPeriodString })).unwrap();
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

  const setSelected = useCallback(
    (invoice: any) => {
      dispatch(setSelectedInvoiceAction(invoice));
    },
    [dispatch]
  );

  const clearSelected = useCallback(() => {
    dispatch(clearSelectedInvoiceAction());
  }, [dispatch]);

  const resetError = useCallback(() => {
    dispatch(clearBillingError());
  }, [dispatch]);

  return {
    kpis,
    activeDues,
    invoices: invoicesList,
    selectedInvoice,
    assessmentTemplates,
    pagination,
    loadingStates,
    error,

    fetchKPIs: getKPIs,
    fetchMyDues: getMyDues,
    fetchInvoices: getInvoices,
    fetchInvoiceDetails: getInvoiceDetails,
    settleOffline: payOffline,
    approveOffline,
    triggerManualBilling: triggerManual,
    payWithWallet: payViaWallet,
    initRazorpayCheckout: triggerRazorpayCheckout,
    verifyPayment: verifyPaymentSignature,
    setSelectedInvoice: setSelected,
    clearSelectedInvoice: clearSelected,
    clearError: resetError,
  };
};

export default useBilling;

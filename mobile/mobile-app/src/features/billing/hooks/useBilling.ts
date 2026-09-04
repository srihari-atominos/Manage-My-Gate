import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import {
  fetchAdminKPIs,
  fetchMyDues,
  fetchInvoicesGrid,
  executeManualTrigger,
  submitOfflineSettlement,
  clearOfflineSettlement,
  rejectOfflineSettlement,
  payWithWallet,
  createRazorpayOrder,
  verifyRazorpaySignature,
  clearBillingError,
} from '../store/billingSlice';
import { fetchWalletBalance } from '../store/walletSlice';

/**
 * Custom Hook: useBilling
 *
 * Sole controller bridge between visual UI components and Redux Toolkit state.
 * Conforms to the "Thin View" pattern by encapsulating all dispatch actions.
 */
export const useBilling = () => {
  const dispatch = useDispatch<AppDispatch>();

  // 1. Selector mapping
  const { kpis, activeDues, invoicesList, pagination, loadingStates, error } = useSelector(
    (state: RootState) => state.billing
  );
  const walletBalance = useSelector((state: RootState) => state.wallet?.balance || 0);
  const activeOrgId = useSelector((state: any) =>
    state.workspace?.activeOrganizationId ||
    state.auth?.activeOrganizationId ||
    state.auth?.user?.orgId ||
    state.auth?.user?.organizationId ||
    state.auth?.user?.org?._id ||
    state.auth?.user?.activeOrgId ||
    state.auth?.user?.activeOrganizationId
  );

  // 2. Action dispatchers wrapped in useCallback
  const loadAdminDashboard = useCallback(
    (communityId?: string) => {
      const orgId = communityId || activeOrgId;
      if (!orgId) {
        console.warn('loadAdminDashboard ignored: active communityId/orgId is undefined');
        return;
      }
      dispatch(fetchInvoicesGrid({ page: 1, limit: 10 }));
      return dispatch(fetchAdminKPIs(orgId));
    },
    [dispatch, activeOrgId]
  );

  const loadResidentDues = useCallback(() => {
    dispatch(fetchWalletBalance());
    return dispatch(fetchMyDues());
  }, [dispatch]);

  const loadWalletBalance = useCallback(() => {
    return dispatch(fetchWalletBalance());
  }, [dispatch]);

  const changeTablePage = useCallback(
    (pageNumber: number, filters: Record<string, any> = {}) => {
      return dispatch(
        fetchInvoicesGrid({
          page: pageNumber,
          limit: pagination.limit,
          filters,
        })
      );
    },
    [dispatch, pagination.limit]
  );

  const triggerManualRun = useCallback(
    (assessmentId: string, periodString: string) => {
      return dispatch(
        executeManualTrigger({
          assessmentId,
          billingPeriodString: periodString,
        })
      ).unwrap();
    },
    [dispatch]
  );

  const settleOffline = useCallback(
    (invoiceId: string, referenceData: { offlineReference: string; offlineAmount?: number; amountPaid?: number; amount?: number; paymentReference?: string; paymentMethod: string; paymentDate?: string; paymentScreenshot?: string }) => {
      const effectiveAmount = referenceData.offlineAmount ?? referenceData.amountPaid ?? referenceData.amount;
      return dispatch(
        submitOfflineSettlement({
          invoiceId,
          offlineReference: referenceData.offlineReference || referenceData.paymentReference || '',
          amount: effectiveAmount,
          paymentMethod: referenceData.paymentMethod,
        })
      ).unwrap();
    },
    [dispatch]
  );

  const approveOffline = useCallback(
    (invoiceId: string) => {
      return dispatch(clearOfflineSettlement(invoiceId)).unwrap();
    },
    [dispatch]
  );

  const rejectOffline = useCallback(
    (invoiceId: string, reason?: string) => {
      return dispatch(rejectOfflineSettlement({ invoiceId, reason })).unwrap();
    },
    [dispatch]
  );

  const payInvoiceWallet = useCallback(
    (invoiceId: string, amount: number) => {
      return dispatch(payWithWallet({ invoiceId, amount })).unwrap();
    },
    [dispatch]
  );

  const payInvoiceRazorpay = useCallback(
    (invoiceId: string, amount: number) => {
      return dispatch(createRazorpayOrder({ invoiceId, amount })).unwrap();
    },
    [dispatch]
  );

  const verifyRazorpay = useCallback(
    (verificationData: any) => {
      return dispatch(verifyRazorpaySignature(verificationData)).unwrap();
    },
    [dispatch]
  );

  const resetBillingError = useCallback(() => {
    dispatch(clearBillingError());
  }, [dispatch]);

  return {
    // Redux Slice states
    kpis,
    activeDues,
    invoicesList,
    invoices: invoicesList,
    pagination,
    loadingStates,
    error,
    walletBalance,
    activeOrgId,

    // Dispatcher methods
    loadAdminDashboard,
    loadResidentDues,
    loadWalletBalance,
    changeTablePage,
    fetchInvoices: changeTablePage,
    fetchMyDues: loadResidentDues,
    triggerManualRun,
    settleOffline,
    approveOffline,
    rejectOffline,
    payInvoiceWallet,
    payWithWallet: payInvoiceWallet,
    payInvoiceRazorpay,
    verifyRazorpay,
    verifyPayment: verifyRazorpay,
    resetBillingError,
    clearError: resetBillingError,
  };
};

export default useBilling;

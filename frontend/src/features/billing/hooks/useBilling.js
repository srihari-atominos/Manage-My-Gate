import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAdminKPIs,
  fetchMyDues,
  fetchInvoicesGrid,
  executeManualTrigger,
  submitOfflineSettlement,
  clearBillingError,
} from '../store/billingSlice.js';

/**
 * Custom Hook: useBilling
 * 
 * Sole controller bridge between visual UI components and Redux Toolkit state.
 * Conforms to the "Thin View" pattern by encapsulating all dispatch actions.
 */
export const useBilling = () => {
  const dispatch = useDispatch();

  // 1. Selector mapping
  const { kpis, activeDues, invoicesList, pagination, loadingStates, error } = useSelector(
    (state) => state.billing
  );
  const activeOrgId = useSelector((state) => state.workspace?.activeOrganizationId);

  // 2. Action dispatchers wrapped in useCallback to prevent unnecessary UI re-renders
  const loadAdminDashboard = useCallback(
    (communityId) => {
      const orgId = communityId || activeOrgId;
      if (!orgId) {
        console.warn('loadAdminDashboard ignored: workspace communityId is undefined');
        return;
      }
      return dispatch(fetchAdminKPIs(orgId));
    },
    [dispatch, activeOrgId]
  );

  const loadResidentDues = useCallback(
    () => {
      return dispatch(fetchMyDues());
    },
    [dispatch]
  );

  const changeTablePage = useCallback(
    (pageNumber, filters = {}) => {
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
    (assessmentId, periodString) => {
      return dispatch(
        executeManualTrigger({
          assessmentId,
          billingPeriodString: periodString,
        })
      );
    },
    [dispatch]
  );

  const settleOffline = useCallback(
    (invoiceId, referenceData) => {
      return dispatch(
        submitOfflineSettlement({
          invoiceId,
          offlineReference: referenceData.offlineReference,
          paymentMethod: referenceData.paymentMethod,
        })
      );
    },
    [dispatch]
  );

  const resetBillingError = useCallback(
    () => {
      dispatch(clearBillingError());
    },
    [dispatch]
  );

  return {
    // Redux Slice states
    kpis,
    activeDues,
    invoicesList,
    pagination,
    loadingStates,
    error,
    activeOrgId,

    // Dispatcher methods
    loadAdminDashboard,
    loadResidentDues,
    changeTablePage,
    triggerManualRun,
    settleOffline,
    resetBillingError,
  };
};

export default useBilling;

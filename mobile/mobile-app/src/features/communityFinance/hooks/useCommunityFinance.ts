import { useCallback, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { type AppDispatch, type RootState } from '../../../store/store';
import {
  type ReportingPeriod,
  type DashboardData,
  type NormalizedTransaction,
} from '../types';
import {
  setPeriod,
  fetchDashboardData,
  refreshDashboardData,
  clearError,
} from '../store/communityFinanceSlice';

export interface UseCommunityFinanceReturn {
  dashboard: DashboardData | null;
  recentTransactions: NormalizedTransaction[];
  recentTransactionsTotal: number;
  selectedPeriod: ReportingPeriod;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  hasPermission: boolean;
  changePeriod: (period: ReportingPeriod) => void;
  refreshDashboard: () => void;
  clearFinanceError: () => void;
}

export const useCommunityFinance = (): UseCommunityFinanceReturn => {
  const dispatch = useDispatch<AppDispatch>();

  const selectedPeriod = useSelector(
    (state: any) => state.communityFinance?.selectedPeriod ?? 'This Month'
  );
  const dashboard = useSelector(
    (state: any) => state.communityFinance?.dashboardData ?? null
  );
  const recentTransactions = useSelector(
    (state: any) => state.communityFinance?.recentTransactions ?? []
  );
  const recentTransactionsTotal = useSelector(
    (state: any) => state.communityFinance?.recentTransactionsTotal ?? 0
  );
  const loading = useSelector(
    (state: any) => state.communityFinance?.loading ?? false
  );
  const refreshing = useSelector(
    (state: any) => state.communityFinance?.refreshing ?? false
  );
  const error = useSelector(
    (state: any) => state.communityFinance?.error ?? null
  );
  const lastFetchedPeriod = useSelector(
    (state: any) => state.communityFinance?.lastFetchedPeriod ?? null
  );

  const activeOrgId = useSelector(
    (state: any) => state.auth?.user?.activeOrgId || state.auth?.user?.orgId
  );

  // Authorization check (matches backend permission rules)
  const hasPermission = useSelector((state: any) => {
    const permissions = state.auth?.user?.permissions;
    const role = state.auth?.user?.role;
    if (role === 'Platform SuperAdmin' || role === 'Community Admin') {
      return true;
    }
    if (Array.isArray(permissions)) {
      return permissions.some((p: any) => {
        const name = typeof p === 'string' ? p : p?.name;
        return (
          name === 'billing:dashboard' ||
          name === 'billing' ||
          name === 'financial_ledger' ||
          name === 'community_finance' ||
          name === '*'
        );
      });
    }
    return false;
  });

  const lastFetchedKeyRef = useRef<string | null>(null);

  const loadData = useCallback(
    (period: ReportingPeriod) => {
      if (hasPermission && activeOrgId) {
        dispatch(fetchDashboardData(period));
      }
    },
    [dispatch, hasPermission, activeOrgId]
  );

  // Trigger fetch only once per (activeOrgId, selectedPeriod) - prevents infinite retry storms
  useEffect(() => {
    if (hasPermission && activeOrgId && !loading && !refreshing) {
      const fetchKey = `${activeOrgId}_${selectedPeriod}`;
      if (lastFetchedKeyRef.current !== fetchKey) {
        lastFetchedKeyRef.current = fetchKey;
        loadData(selectedPeriod);
      }
    }
  }, [hasPermission, activeOrgId, selectedPeriod, loading, refreshing, loadData]);

  // Handle changing reporting period with duplicate prevention
  const changePeriod = useCallback(
    (newPeriod: ReportingPeriod) => {
      const fetchKey = `${activeOrgId}_${newPeriod}`;
      if (fetchKey === lastFetchedKeyRef.current && dashboard) {
        return; // Prevent duplicate network calls for same period
      }
      lastFetchedKeyRef.current = fetchKey;
      dispatch(setPeriod(newPeriod));
      loadData(newPeriod);
    },
    [dispatch, activeOrgId, dashboard, loadData]
  );

  // Pull-to-refresh action
  const refreshDashboard = useCallback(() => {
    if (hasPermission && activeOrgId) {
      dispatch(refreshDashboardData(selectedPeriod));
    }
  }, [dispatch, hasPermission, activeOrgId, selectedPeriod]);

  const clearFinanceError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    dashboard,
    recentTransactions,
    recentTransactionsTotal,
    selectedPeriod,
    loading,
    refreshing,
    error,
    hasPermission,
    changePeriod,
    refreshDashboard,
    clearFinanceError,
  };
};

export default useCommunityFinance;

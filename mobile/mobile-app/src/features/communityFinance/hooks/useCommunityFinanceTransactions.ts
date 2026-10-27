import { useCallback, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { type AppDispatch, type RootState } from '../../../store/store';
import {
  type ReportingPeriod,
  type NormalizedTransaction,
  type TransactionFilters,
  type TransactionsPagination,
  type TransactionTypeFilter,
  type TransactionDomainFilter,
  type TransactionStatusFilter,
} from '../types';
import {
  fetchTransactionsList,
  refreshTransactionsList,
  setTransactionPeriod,
  setTransactionTypeFilter,
  setTransactionDomainFilter,
  setTransactionStatusFilter,
  setTransactionSearch,
  clearTransactionFilters,
  setSelectedTransaction,
  clearTransactionsError,
} from '../store/communityFinanceSlice';

export interface UseCommunityFinanceTransactionsOptions {
  initialPeriod?: ReportingPeriod;
  initialType?: TransactionTypeFilter;
}

export interface UseCommunityFinanceTransactionsReturn {
  transactions: NormalizedTransaction[];
  pagination: TransactionsPagination;
  filters: TransactionFilters;
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  error: string | null;
  hasPermission: boolean;
  selectedTransaction: NormalizedTransaction | null;
  changePeriod: (period: ReportingPeriod) => void;
  changeType: (type: TransactionTypeFilter) => void;
  changeDomain: (domain: TransactionDomainFilter) => void;
  changeStatus: (status: TransactionStatusFilter) => void;
  changeSearch: (search: string) => void;
  clearFilters: () => void;
  loadMore: () => void;
  refreshTransactions: () => void;
  selectTransaction: (transaction: NormalizedTransaction | null) => void;
  clearError: () => void;
}

export const useCommunityFinanceTransactions = (
  options?: UseCommunityFinanceTransactionsOptions
): UseCommunityFinanceTransactionsReturn => {
  const dispatch = useDispatch<AppDispatch>();

  const transactions = useSelector(
    (state: any) => state.communityFinance?.transactionsList ?? []
  );
  const pagination = useSelector(
    (state: any) =>
      state.communityFinance?.transactionsPagination ?? {
        currentPage: 1,
        totalPages: 0,
        totalRecords: 0,
        limit: 15,
        hasNextPage: false,
      }
  );
  const filters: TransactionFilters = useSelector(
    (state: any) =>
      state.communityFinance?.transactionFilters ?? {
        period: 'This Month',
        type: 'all',
        domain: 'ALL',
        status: 'ALL',
        search: '',
        startDate: null,
        endDate: null,
      }
  );
  const loading = useSelector(
    (state: any) => state.communityFinance?.transactionsLoading ?? false
  );
  const loadingMore = useSelector(
    (state: any) => state.communityFinance?.transactionsLoadingMore ?? false
  );
  const refreshing = useSelector(
    (state: any) => state.communityFinance?.transactionsRefreshing ?? false
  );
  const error = useSelector(
    (state: any) => state.communityFinance?.transactionsError ?? null
  );
  const selectedTransaction = useSelector(
    (state: any) => state.communityFinance?.selectedTransaction ?? null
  );

  const activeOrgId = useSelector(
    (state: any) => state.auth?.user?.activeOrgId || state.auth?.user?.orgId
  );

  // Authorize using same permission checks as backend & dashboard
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

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = useRef<boolean>(false);
  const lastOrgRef = useRef<string | null>(null);

  // Initial load or route period alignment
  useEffect(() => {
    if (!hasPermission || !activeOrgId) return;

    const orgChanged = lastOrgRef.current && lastOrgRef.current !== activeOrgId;
    lastOrgRef.current = activeOrgId;

    if (!hasInitializedRef.current || orgChanged) {
      hasInitializedRef.current = true;
      const customFilters: Partial<TransactionFilters> = {};
      if (options?.initialPeriod && options.initialPeriod !== filters.period) {
        dispatch(setTransactionPeriod(options.initialPeriod));
        customFilters.period = options.initialPeriod;
      }
      if (options?.initialType && options.initialType !== filters.type) {
        dispatch(setTransactionTypeFilter(options.initialType));
        customFilters.type = options.initialType;
      }

      if (Object.keys(customFilters).length > 0) {
        dispatch(
          fetchTransactionsList({
            page: 1,
            isLoadMore: false,
            customFilters,
          })
        );
      } else {
        dispatch(fetchTransactionsList({ page: 1, isLoadMore: false }));
      }
    }
  }, [hasPermission, activeOrgId, options?.initialPeriod, options?.initialType, filters.period, filters.type, dispatch]);

  const changePeriod = useCallback(
    (newPeriod: ReportingPeriod) => {
      if (newPeriod === filters.period) return;
      dispatch(setTransactionPeriod(newPeriod));
      dispatch(
        fetchTransactionsList({
          page: 1,
          isLoadMore: false,
          customFilters: { period: newPeriod, startDate: null, endDate: null },
        })
      );
    },
    [dispatch, filters.period]
  );

  const changeType = useCallback(
    (newType: TransactionTypeFilter) => {
      if (newType === filters.type) return;
      dispatch(setTransactionTypeFilter(newType));
      dispatch(
        fetchTransactionsList({
          page: 1,
          isLoadMore: false,
          customFilters: { type: newType },
        })
      );
    },
    [dispatch, filters.type]
  );

  const changeDomain = useCallback(
    (newDomain: TransactionDomainFilter) => {
      if (newDomain === filters.domain) return;
      dispatch(setTransactionDomainFilter(newDomain));
      dispatch(
        fetchTransactionsList({
          page: 1,
          isLoadMore: false,
          customFilters: { domain: newDomain },
        })
      );
    },
    [dispatch, filters.domain]
  );

  const changeStatus = useCallback(
    (newStatus: TransactionStatusFilter) => {
      if (newStatus === filters.status) return;
      dispatch(setTransactionStatusFilter(newStatus));
      dispatch(
        fetchTransactionsList({
          page: 1,
          isLoadMore: false,
          customFilters: { status: newStatus },
        })
      );
    },
    [dispatch, filters.status]
  );

  const changeSearch = useCallback(
    (text: string) => {
      dispatch(setTransactionSearch(text));
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
      if (!text || text.trim() === '') {
        dispatch(
          fetchTransactionsList({
            page: 1,
            isLoadMore: false,
            customFilters: { search: '' },
          })
        );
      } else {
        searchTimerRef.current = setTimeout(() => {
          dispatch(
            fetchTransactionsList({
              page: 1,
              isLoadMore: false,
              customFilters: { search: text },
            })
          );
        }, 350);
      }
    },
    [dispatch]
  );

  const clearFilters = useCallback(() => {
    dispatch(clearTransactionFilters());
    dispatch(
      fetchTransactionsList({
        page: 1,
        isLoadMore: false,
        customFilters: {
          type: 'all',
          domain: 'ALL',
          status: 'ALL',
          search: '',
        },
      })
    );
  }, [dispatch]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !pagination.hasNextPage) return;
    dispatch(
      fetchTransactionsList({
        page: pagination.currentPage + 1,
        isLoadMore: true,
      })
    );
  }, [dispatch, loading, loadingMore, pagination]);

  const refreshTransactions = useCallback(() => {
    dispatch(refreshTransactionsList());
  }, [dispatch]);

  const selectTransaction = useCallback(
    (tx: NormalizedTransaction | null) => {
      dispatch(setSelectedTransaction(tx));
    },
    [dispatch]
  );

  const clearError = useCallback(() => {
    dispatch(clearTransactionsError());
  }, [dispatch]);

  // Clean up debounce timer
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  return {
    transactions,
    pagination,
    filters,
    loading,
    loadingMore,
    refreshing,
    error,
    hasPermission,
    selectedTransaction,
    changePeriod,
    changeType,
    changeDomain,
    changeStatus,
    changeSearch,
    clearFilters,
    loadMore,
    refreshTransactions,
    selectTransaction,
    clearError,
  };
};

export default useCommunityFinanceTransactions;

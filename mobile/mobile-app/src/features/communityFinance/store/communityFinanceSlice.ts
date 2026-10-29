import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import {
  type ReportingPeriod,
  type DashboardData,
  type NormalizedTransaction,
  type TransactionFilters,
  type TransactionsPagination,
  type TransactionTypeFilter,
  type TransactionDomainFilter,
  type TransactionStatusFilter,
} from '../types';
import { getPeriodDateRange } from '../utils/financeFormatters';
import communityFinanceService from '../services/communityFinanceService';

interface CommunityFinanceState {
  // Dashboard state
  selectedPeriod: ReportingPeriod;
  dashboardData: DashboardData | null;
  recentTransactions: NormalizedTransaction[];
  recentTransactionsTotal: number;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastFetchedPeriod: ReportingPeriod | null;

  // Transaction Details state
  transactionsList: NormalizedTransaction[];
  transactionsPagination: TransactionsPagination;
  transactionsLoading: boolean;
  transactionsLoadingMore: boolean;
  transactionsRefreshing: boolean;
  transactionsError: string | null;
  transactionFilters: TransactionFilters;
  selectedTransaction: NormalizedTransaction | null;
}

const initialTransactionFilters: TransactionFilters = {
  period: 'Today',
  type: 'all',
  domain: 'ALL',
  status: 'ALL',
  search: '',
  startDate: null,
  endDate: null,
};

const initialPagination: TransactionsPagination = {
  currentPage: 1,
  totalPages: 1,
  totalRecords: 0,
  limit: 15,
  hasNextPage: false,
};

const initialState: CommunityFinanceState = {
  selectedPeriod: 'Today',
  dashboardData: null,
  recentTransactions: [],
  recentTransactionsTotal: 0,
  loading: false,
  refreshing: false,
  error: null,
  lastFetchedPeriod: null,

  transactionsList: [],
  transactionsPagination: initialPagination,
  transactionsLoading: false,
  transactionsLoadingMore: false,
  transactionsRefreshing: false,
  transactionsError: null,
  transactionFilters: initialTransactionFilters,
  selectedTransaction: null,
};

export const fetchDashboardData = createAsyncThunk(
  'communityFinance/fetchDashboardData',
  async (period: ReportingPeriod, { rejectWithValue }) => {
    try {
      const { startDate, endDate } = getPeriodDateRange(period);
      const [dashboard, transactionsResponse] = await Promise.all([
        communityFinanceService.fetchDashboard({ startDate, endDate }),
        communityFinanceService.fetchTransactions({
          startDate,
          endDate,
          page: 1,
          limit: 3, // Strict 3-item preview limit per mobile rule
          includeLiabilities: true,
        }),
      ]);

      return {
        dashboard,
        transactions: transactionsResponse?.transactions || [],
        recentTransactionsTotal: transactionsResponse?.total ?? transactionsResponse?.transactions?.length ?? 0,
        period,
      };
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to load community finance dashboard data.';
      return rejectWithValue(message);
    }
  }
);

export const refreshDashboardData = createAsyncThunk(
  'communityFinance/refreshDashboardData',
  async (period: ReportingPeriod, { rejectWithValue }) => {
    try {
      const { startDate, endDate } = getPeriodDateRange(period);
      const [dashboard, transactionsResponse] = await Promise.all([
        communityFinanceService.fetchDashboard({ startDate, endDate }),
        communityFinanceService.fetchTransactions({
          startDate,
          endDate,
          page: 1,
          limit: 3,
          includeLiabilities: true,
        }),
      ]);

      return {
        dashboard,
        transactions: transactionsResponse?.transactions || [],
        recentTransactionsTotal: transactionsResponse?.total ?? transactionsResponse?.transactions?.length ?? 0,
        period,
      };
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to refresh community finance dashboard data.';
      return rejectWithValue(message);
    }
  }
);

export const fetchTransactionsList = createAsyncThunk(
  'communityFinance/fetchTransactionsList',
  async (
    options:
      | {
          page?: number;
          isLoadMore?: boolean;
          customFilters?: Partial<TransactionFilters>;
        }
      | undefined,
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { communityFinance: CommunityFinanceState };
      const currentFilters = {
        ...state.communityFinance.transactionFilters,
        ...(options?.customFilters || {}),
      };
      const page = options?.page || 1;
      const isLoadMore = Boolean(options?.isLoadMore);

      // Prevent concurrent duplicate page requests if loadingMore or no more pages
      if (
        isLoadMore &&
        (state.communityFinance.transactionsLoadingMore ||
          !state.communityFinance.transactionsPagination.hasNextPage)
      ) {
        return null;
      }

      const { startDate, endDate } = getPeriodDateRange(currentFilters.period);

      const response = await communityFinanceService.fetchTransactions({
        type: currentFilters.type,
        domain: currentFilters.domain,
        status: currentFilters.status,
        search: currentFilters.search,
        startDate: currentFilters.startDate ?? startDate,
        endDate: currentFilters.endDate ?? endDate,
        page,
        limit: 15,
        timezone: 'Asia/Kolkata',
        includeLiabilities: currentFilters.status === 'ALL' || currentFilters.status === 'PENDING' || !currentFilters.status,
      });

      return {
        transactions: response?.transactions || [],
        pagination: {
          currentPage: response?.page || page,
          totalPages: response?.totalPages || 0,
          totalRecords: response?.total || 0,
          limit: response?.limit || 15,
          hasNextPage: (response?.page || page) < (response?.totalPages || 0),
        },
        isLoadMore,
      };
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to load transactions.';
      return rejectWithValue(message);
    }
  }
);

export const refreshTransactionsList = createAsyncThunk(
  'communityFinance/refreshTransactionsList',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { communityFinance: CommunityFinanceState };
      const currentFilters = state.communityFinance.transactionFilters;
      const { startDate, endDate } = getPeriodDateRange(currentFilters.period);

      const response = await communityFinanceService.fetchTransactions({
        type: currentFilters.type,
        domain: currentFilters.domain,
        status: currentFilters.status,
        search: currentFilters.search,
        startDate: currentFilters.startDate ?? startDate,
        endDate: currentFilters.endDate ?? endDate,
        page: 1,
        limit: 15,
        timezone: 'Asia/Kolkata',
        includeLiabilities: currentFilters.status === 'ALL' || currentFilters.status === 'PENDING' || !currentFilters.status,
      });

      return {
        transactions: response?.transactions || [],
        pagination: {
          currentPage: response?.page || 1,
          totalPages: response?.totalPages || 0,
          totalRecords: response?.total || 0,
          limit: response?.limit || 15,
          hasNextPage: (response?.page || 1) < (response?.totalPages || 0),
        },
      };
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to refresh transactions.';
      return rejectWithValue(message);
    }
  }
);

const communityFinanceSlice = createSlice({
  name: 'communityFinance',
  initialState,
  reducers: {
    setPeriod: (state, action: PayloadAction<ReportingPeriod>) => {
      state.selectedPeriod = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetCommunityFinanceState: () => initialState,

    // Transaction Details Reducers
    setTransactionPeriod: (state, action: PayloadAction<ReportingPeriod>) => {
      state.transactionFilters.period = action.payload;
      state.transactionFilters.startDate = null;
      state.transactionFilters.endDate = null;
    },
    setTransactionTypeFilter: (state, action: PayloadAction<TransactionTypeFilter>) => {
      state.transactionFilters.type = action.payload;
    },
    setTransactionDomainFilter: (state, action: PayloadAction<TransactionDomainFilter>) => {
      state.transactionFilters.domain = action.payload;
    },
    setTransactionStatusFilter: (state, action: PayloadAction<TransactionStatusFilter>) => {
      state.transactionFilters.status = action.payload;
    },
    setTransactionSearch: (state, action: PayloadAction<string>) => {
      state.transactionFilters.search = action.payload;
    },
    clearTransactionFilters: (state) => {
      state.transactionFilters = {
        ...initialTransactionFilters,
        period: state.transactionFilters.period, // Preserve active period
      };
    },
    setSelectedTransaction: (state, action: PayloadAction<NormalizedTransaction | null>) => {
      state.selectedTransaction = action.payload;
    },
    clearTransactionsError: (state) => {
      state.transactionsError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchDashboardData
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboardData = action.payload.dashboard;
        state.recentTransactions = action.payload.transactions;
        state.recentTransactionsTotal =
          action.payload.recentTransactionsTotal ?? action.payload.transactions.length;
        state.lastFetchedPeriod = action.payload.period;
        state.error = null;
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Unable to load dashboard data.';
      })
      // refreshDashboardData
      .addCase(refreshDashboardData.pending, (state) => {
        state.refreshing = true;
        state.error = null;
      })
      .addCase(refreshDashboardData.fulfilled, (state, action) => {
        state.refreshing = false;
        state.dashboardData = action.payload.dashboard;
        state.recentTransactions = action.payload.transactions;
        state.recentTransactionsTotal =
          action.payload.recentTransactionsTotal ?? action.payload.transactions.length;
        state.lastFetchedPeriod = action.payload.period;
        state.error = null;
      })
      .addCase(refreshDashboardData.rejected, (state, action) => {
        state.refreshing = false;
        state.error = (action.payload as string) || 'Unable to refresh dashboard data.';
      })

      // fetchTransactionsList
      .addCase(fetchTransactionsList.pending, (state, action) => {
        if (action.meta.arg?.isLoadMore) {
          state.transactionsLoadingMore = true;
        } else {
          state.transactionsLoading = true;
        }
        state.transactionsError = null;
      })
      .addCase(fetchTransactionsList.fulfilled, (state, action) => {
        state.transactionsLoading = false;
        state.transactionsLoadingMore = false;
        if (!action.payload) return;

        const txList = action.payload.transactions || [];
        if (action.payload.isLoadMore) {
          // Append unique transactions by ID to prevent duplicates
          const existingIds = new Set(state.transactionsList.map((tx) => tx.id));
          const newItems = txList.filter((tx) => !existingIds.has(tx.id));
          state.transactionsList = [...state.transactionsList, ...newItems];
        } else {
          state.transactionsList = txList;
        }
        state.transactionsPagination = action.payload.pagination || state.transactionsPagination;
        state.transactionsError = null;
      })
      .addCase(fetchTransactionsList.rejected, (state, action) => {
        state.transactionsLoading = false;
        state.transactionsLoadingMore = false;
        state.transactionsError =
          (action.payload as string) || 'Unable to load transactions.';
      })

      // refreshTransactionsList
      .addCase(refreshTransactionsList.pending, (state) => {
        state.transactionsRefreshing = true;
        state.transactionsError = null;
      })
      .addCase(refreshTransactionsList.fulfilled, (state, action) => {
        state.transactionsRefreshing = false;
        state.transactionsList = action.payload?.transactions || [];
        state.transactionsPagination = action.payload?.pagination || state.transactionsPagination;
        state.transactionsError = null;
      })
      .addCase(refreshTransactionsList.rejected, (state, action) => {
        state.transactionsRefreshing = false;
        // Keep existing list on background refresh error per Section 10
        state.transactionsError =
          (action.payload as string) || 'Unable to refresh transactions.';
      });
  },
});

export const {
  setPeriod,
  clearError,
  resetCommunityFinanceState,
  setTransactionPeriod,
  setTransactionTypeFilter,
  setTransactionDomainFilter,
  setTransactionStatusFilter,
  setTransactionSearch,
  clearTransactionFilters,
  setSelectedTransaction,
  clearTransactionsError,
} = communityFinanceSlice.actions;

export default communityFinanceSlice.reducer;

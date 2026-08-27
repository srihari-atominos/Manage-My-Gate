import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchSecurityLogs,
  fetchDashboardStats,
  SecurityLog,
  SecurityDashboardStats,
  SecurityLogFilterParams,
} from '../services/securityLogApi';

export interface SecurityLogState {
  logs: SecurityLog[];
  dashboard: SecurityDashboardStats;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  filters: {
    search: string;
    status: string;
    scanType: string;
    amenityId: string;
    dateRange: string;
  };
  loading: boolean;
  error: string | null;
}

const initialState: SecurityLogState = {
  logs: [],
  dashboard: {
    entries: 0,
    exits: 0,
    denied: 0,
    manualVerifications: 0,
    cancelled: 0,
    refunds: 0,
    qrExpired: 0,
  },
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  },
  filters: {
    search: '',
    status: '',
    scanType: '',
    amenityId: '',
    dateRange: 'today',
  },
  loading: false,
  error: null,
};

export const fetchSecurityLogsThunk = createAsyncThunk(
  'securityLog/fetchLogs',
  async (params: SecurityLogFilterParams | undefined, { rejectWithValue }) => {
    try {
      const data = await fetchSecurityLogs(params);
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch security logs'
      );
    }
  }
);

export const fetchDashboardStatsThunk = createAsyncThunk(
  'securityLog/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const data: any = await fetchDashboardStats();
      return data?.stats || data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch dashboard stats'
      );
    }
  }
);

const securityLogSlice = createSlice({
  name: 'securityLog',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<SecurityLogState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    addLogRealTime: (state, action: PayloadAction<SecurityLog>) => {
      state.logs.unshift(action.payload);
      if (action.payload.scanType) {
        const typeMap: Record<string, keyof SecurityDashboardStats> = {
          Entry: 'entries',
          Exit: 'exits',
          Denied: 'denied',
          'Manual Verification': 'manualVerifications',
          'Booking Cancelled': 'cancelled',
          Refund: 'refunds',
          'QR Expired': 'qrExpired',
        };
        const key = typeMap[action.payload.scanType];
        if (key && state.dashboard[key] !== undefined) {
          state.dashboard[key] += 1;
        }
      }
    },
    clearFilters: (state) => {
      state.filters = {
        search: '',
        status: '',
        scanType: '',
        amenityId: '',
        dateRange: 'today',
      };
      state.pagination.page = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSecurityLogsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSecurityLogsThunk.fulfilled, (state, action) => {
        state.loading = false;
        const payload: any = action.payload;
        if (payload?.logs) {
          state.logs = payload.logs;
          if (payload.pagination) {
            state.pagination = payload.pagination;
          }
        } else if (Array.isArray(payload)) {
          state.logs = payload;
        } else if (payload?.data?.logs) {
          state.logs = payload.data.logs;
          if (payload.data.pagination) {
            state.pagination = payload.data.pagination;
          }
        }
      })
      .addCase(fetchSecurityLogsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchDashboardStatsThunk.fulfilled, (state, action) => {
        if (action.payload) {
          state.dashboard = { ...state.dashboard, ...action.payload };
        }
      });
  },
});

export const { setFilters, setPage, addLogRealTime, clearFilters } = securityLogSlice.actions;
export default securityLogSlice.reducer;

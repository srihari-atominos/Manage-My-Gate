import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import issueReportService from '../services/issueReportService';
import {
  IssueReportItem,
  FetchCommunityReportsParams,
  CommunityReportsResponseData,
} from '../types/issueReport.types';

export interface IssueReportState {
  list: IssueReportItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    search: string;
    reportType: string;
    feature: string;
  };
  selectedReport: IssueReportItem | null;
  loading: boolean;
  detailsLoading: boolean;
  error: string | null;
  detailsError: string | null;
}

const initialState: IssueReportState = {
  list: [],
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  },
  filters: {
    search: '',
    reportType: '',
    feature: '',
  },
  selectedReport: null,
  loading: false,
  detailsLoading: false,
  error: null,
  detailsError: null,
};

export const loadCommunityReports = createAsyncThunk<
  CommunityReportsResponseData,
  FetchCommunityReportsParams | undefined,
  { rejectValue: string }
>(
  'issueReport/loadCommunityReports',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { issueReport?: IssueReportState };
      const currentFilters = state.issueReport?.filters || { search: '', reportType: '', feature: '' };
      const currentPagination = state.issueReport?.pagination || { page: 1, limit: 10 };

      const mergedParams: FetchCommunityReportsParams = {
        page: params.page ?? currentPagination.page,
        limit: params.limit ?? currentPagination.limit,
      };

      const resolvedSearch = params.search !== undefined ? params.search : currentFilters.search;
      if (resolvedSearch && typeof resolvedSearch === 'string' && resolvedSearch.trim()) {
        mergedParams.search = resolvedSearch.trim();
      }

      const resolvedReportType = params.reportType !== undefined ? params.reportType : currentFilters.reportType;
      if (resolvedReportType && typeof resolvedReportType === 'string' && resolvedReportType.trim()) {
        mergedParams.reportType = resolvedReportType.trim();
      }

      const resolvedFeature = params.feature !== undefined ? params.feature : currentFilters.feature;
      if (resolvedFeature && typeof resolvedFeature === 'string' && resolvedFeature.trim()) {
        mergedParams.feature = resolvedFeature.trim();
      }

      return await issueReportService.fetchCommunityReports(mergedParams);
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || 'Failed to load community issue reports.';
      return rejectWithValue(message);
    }
  }
);

export const loadCommunityReportDetails = createAsyncThunk<
  IssueReportItem,
  string,
  { rejectValue: string }
>(
  'issueReport/loadCommunityReportDetails',
  async (id, { rejectWithValue }) => {
    try {
      return await issueReportService.fetchCommunityReportById(id);
    } catch (err: any) {
      const message =
        err?.response?.status === 404
          ? 'This issue report could not be found or is no longer available.'
          : err?.response?.data?.message || err?.message || 'Failed to load issue report details.';
      return rejectWithValue(message);
    }
  }
);

export const issueReportSlice = createSlice({
  name: 'issueReport',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<IssueReportState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = { search: '', reportType: '', feature: '' };
    },
    setSelectedReport: (state, action: PayloadAction<IssueReportItem | null>) => {
      state.selectedReport = action.payload;
      state.detailsError = null;
    },
    clearSelectedReport: (state) => {
      state.selectedReport = null;
      state.detailsError = null;
    },
    clearErrors: (state) => {
      state.error = null;
      state.detailsError = null;
    },
  },
  extraReducers: (builder) => {
    // loadCommunityReports
    builder
      .addCase(loadCommunityReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadCommunityReports.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.reports;
        state.pagination = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(loadCommunityReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load issue reports.';
      });

    // loadCommunityReportDetails
    builder
      .addCase(loadCommunityReportDetails.pending, (state) => {
        state.detailsLoading = true;
        state.detailsError = null;
      })
      .addCase(loadCommunityReportDetails.fulfilled, (state, action) => {
        state.detailsLoading = false;
        state.selectedReport = action.payload;
      })
      .addCase(loadCommunityReportDetails.rejected, (state, action) => {
        state.detailsLoading = false;
        state.detailsError = action.payload || 'Failed to load report details.';
      });
  },
});

export const {
  setFilters,
  resetFilters,
  setSelectedReport,
  clearSelectedReport,
  clearErrors,
} = issueReportSlice.actions;

export default issueReportSlice.reducer;

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import issueReportApi from '../services/issueReportApi.js'
import { DEFAULT_PAGE_LIMIT } from '../constants/issueReport.constants.js'

export const loadPlatformReports = createAsyncThunk(
  'issueReport/loadPlatformReports',
  async (queryParams = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState().issueReport
      const mergedParams = {
        page: queryParams.page || state.pagination.currentPage || 1,
        limit: queryParams.limit || state.pagination.limit || DEFAULT_PAGE_LIMIT,
        search: queryParams.search !== undefined ? queryParams.search : state.filters.search,
        reportType: queryParams.reportType !== undefined ? queryParams.reportType : state.filters.reportType,
        feature: queryParams.feature !== undefined ? queryParams.feature : state.filters.feature,
        organisationId: queryParams.organisationId !== undefined ? queryParams.organisationId : state.filters.organisationId,
        startDate: queryParams.startDate !== undefined ? queryParams.startDate : state.filters.startDate,
        endDate: queryParams.endDate !== undefined ? queryParams.endDate : state.filters.endDate,
      }

      const response = await issueReportApi.fetchPlatformReports(mergedParams)
      return response.data
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to fetch issue reports'
      return rejectWithValue(msg)
    }
  },
)

export const loadPlatformReportDetails = createAsyncThunk(
  'issueReport/loadPlatformReportDetails',
  async (id, { rejectWithValue }) => {
    try {
      const response = await issueReportApi.fetchPlatformReportById(id)
      return response?.data !== undefined ? response.data : response
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to fetch report details'
      return rejectWithValue(msg)
    }
  },
)

const initialFilters = {
  search: '',
  reportType: '',
  feature: '',
  organisationId: '',
  startDate: '',
  endDate: '',
}

const initialState = {
  list: [],
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: DEFAULT_PAGE_LIMIT,
    hasNextPage: false,
    hasPrevPage: false,
  },
  filters: { ...initialFilters },
  selectedReport: null,
  loading: false,
  detailsLoading: false,
  error: null,
  detailsError: null,
}

export const issueReportSlice = createSlice({
  name: 'issueReport',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    resetFilters: (state) => {
      state.filters = { ...initialFilters }
    },
    setSelectedReport: (state, action) => {
      state.selectedReport = action.payload || null
      state.detailsError = null
    },
    clearSelectedReport: (state) => {
      state.selectedReport = null
      state.detailsError = null
    },
    clearError: (state) => {
      state.error = null
      state.detailsError = null
    },
  },
  extraReducers: (builder) => {
    builder
      // List
      .addCase(loadPlatformReports.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadPlatformReports.fulfilled, (state, action) => {
        state.loading = false
        const payloadData = action.payload?.data || action.payload || {}
        state.list = payloadData.reports || []

        const totalRecords =
          payloadData.total !== undefined
            ? payloadData.total
            : (payloadData.pagination?.totalRecords ?? 0)
        const currentPage =
          payloadData.page !== undefined
            ? payloadData.page
            : (payloadData.pagination?.currentPage ?? 1)
        const limit =
          payloadData.limit !== undefined
            ? payloadData.limit
            : (payloadData.pagination?.limit ?? DEFAULT_PAGE_LIMIT)
        const totalPages =
          payloadData.totalPages !== undefined
            ? payloadData.totalPages
            : (payloadData.pagination?.totalPages ?? (Math.ceil(totalRecords / limit) || 1))

        state.pagination = {
          currentPage,
          totalPages,
          totalRecords,
          limit,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1,
        }
      })
      .addCase(loadPlatformReports.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to load issue reports'
      })

      // Details
      .addCase(loadPlatformReportDetails.pending, (state) => {
        state.detailsLoading = true
        state.detailsError = null
      })
      .addCase(loadPlatformReportDetails.fulfilled, (state, action) => {
        state.detailsLoading = false
        const payloadData = action.payload?.data || action.payload || null
        if (payloadData && (payloadData._id || payloadData.id || payloadData.reportNumber || payloadData.title)) {
          state.selectedReport = payloadData
        }
      })
      .addCase(loadPlatformReportDetails.rejected, (state, action) => {
        state.detailsLoading = false
        state.detailsError = action.payload || 'Failed to load report details'
      })
  },
})

export const {
  setFilters,
  resetFilters,
  setSelectedReport,
  clearSelectedReport,
  clearError,
} = issueReportSlice.actions

export default issueReportSlice.reducer

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { fetchSecurityLogs, fetchDashboardStats } from '../services/securityLogApi.js'

export const getSecurityLogs = createAsyncThunk(
  'securityLog/getSecurityLogs',
  async (params, { rejectWithValue }) => {
    try {
      const data = await fetchSecurityLogs(params)
      return data // { logs, pagination }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch security logs')
    }
  },
)

export const getDashboardStats = createAsyncThunk(
  'securityLog/getDashboardStats',
  async (_, { rejectWithValue }) => {
    try {
      const data = await fetchDashboardStats()
      return data.stats
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch stats')
    }
  },
)

const initialState = {
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
}

const securityLogSlice = createSlice({
  name: 'securityLog',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload }
      state.pagination.page = 1 // reset page on filter change
    },
    setPage: (state, action) => {
      state.pagination.page = action.payload
    },
    addLogRealTime: (state, action) => {
      // Socket event
      state.logs.unshift(action.payload)
      // Optional: Update dashboard stats locally to avoid refetching
      if (action.payload.scanType) {
        const typeMap = {
          Entry: 'entries',
          Exit: 'exits',
          Denied: 'denied',
          'Manual Verification': 'manualVerifications',
          'Booking Cancelled': 'cancelled',
          Refund: 'refunds',
          'QR Expired': 'qrExpired',
        }
        const key = typeMap[action.payload.scanType]
        if (key && state.dashboard[key] !== undefined) {
          state.dashboard[key] += 1
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // getSecurityLogs
      .addCase(getSecurityLogs.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(getSecurityLogs.fulfilled, (state, action) => {
        state.loading = false
        state.logs = action.payload.logs
        state.pagination = action.payload.pagination
      })
      .addCase(getSecurityLogs.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // getDashboardStats
      .addCase(getDashboardStats.fulfilled, (state, action) => {
        state.dashboard = action.payload
      })
  },
})

export const { setFilters, setPage, addLogRealTime } = securityLogSlice.actions
export default securityLogSlice.reducer

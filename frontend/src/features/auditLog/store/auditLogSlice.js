import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import auditLogApi from '../services/auditLogApi.js'

export const loadAuditLogs = createAsyncThunk(
  'auditLog/loadAuditLogs',
  async ({ page, limit }, { rejectWithValue }) => {
    try {
      const response = await auditLogApi.fetchAuditLogs(page, limit)
      // The API response interceptor returns response.data directly.
      // The backend returns: { success: true, message: "...", data: { logs, total, page, limit, totalPages } }
      return response.data
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch audit logs')
    }
  },
)

const initialState = {
  list: [],
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
  loading: false,
  error: null,
}

export const auditLogSlice = createSlice({
  name: 'auditLog',
  initialState,
  reducers: {
    clearAuditLogError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAuditLogs.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadAuditLogs.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload?.logs || []
        state.total = action.payload?.total || 0
        state.page = action.payload?.page || 1
        state.limit = action.payload?.limit || 10
        state.totalPages = action.payload?.totalPages || 0
      })
      .addCase(loadAuditLogs.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to load audit logs'
      })
  },
})

export const { clearAuditLogError } = auditLogSlice.actions
export default auditLogSlice.reducer

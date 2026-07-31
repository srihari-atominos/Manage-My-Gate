import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import organizationApi from '../services/organizationApi.js'

export const loadOrganizations = createAsyncThunk(
  'organization/loadOrganizations',
  async ({ page, limit }, { rejectWithValue }) => {
    try {
      const response = await organizationApi.fetchOrganizations(page, limit)
      return response.data
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch organizations')
    }
  },
)

export const toggleOrgStatus = createAsyncThunk(
  'organization/toggleOrgStatus',
  async ({ orgId, currentStatus }, { rejectWithValue }) => {
    try {
      const nextStatus = currentStatus === 'Active' ? 'Rejected' : 'Active'
      const response = await organizationApi.updateOrganizationStatus(orgId, nextStatus)
      return response.data
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to toggle organization status')
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

export const organizationSlice = createSlice({
  name: 'organization',
  initialState,
  reducers: {
    clearOrganizationError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // loadOrganizations
      .addCase(loadOrganizations.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadOrganizations.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload?.organizations || []
        state.total = action.payload?.total || 0
        state.page = action.payload?.page || 1
        state.limit = action.payload?.limit || 10
        state.totalPages = action.payload?.totalPages || 0
      })
      .addCase(loadOrganizations.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to load organizations'
      })
      // toggleOrgStatus
      .addCase(toggleOrgStatus.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(toggleOrgStatus.fulfilled, (state, action) => {
        state.loading = false
        const updatedOrg = action.payload
        if (updatedOrg && updatedOrg._id) {
          state.list = state.list.map((org) => (org._id === updatedOrg._id ? updatedOrg : org))
        }
      })
      .addCase(toggleOrgStatus.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to update organization status'
      })
  },
})

export const { clearOrganizationError } = organizationSlice.actions
export default organizationSlice.reducer

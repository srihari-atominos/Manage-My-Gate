import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import superAdminApi from '../services/superAdminApi.js';

export const loadOrganizations = createAsyncThunk(
  'superAdmin/loadOrganizations',
  async ({ page, limit }, { rejectWithValue }) => {
    try {
      const response = await superAdminApi.fetchOrganizations(page, limit);
      // The API response interceptor returns response.data directly.
      // The backend returns: { success: true, message: "...", data: { organizations, total, page, limit, totalPages } }
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch organizations');
    }
  }
);

export const toggleOrgStatus = createAsyncThunk(
  'superAdmin/toggleOrgStatus',
  async ({ orgId, currentStatus }, { rejectWithValue }) => {
    try {
      const nextStatus = currentStatus === 'Active' ? 'Rejected' : 'Active';
      const response = await superAdminApi.updateOrganizationStatus(orgId, nextStatus);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to toggle organization status');
    }
  }
);

const initialState = {
  list: [],
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
  loading: false,
  error: null,
};

export const superAdminSlice = createSlice({
  name: 'superAdmin',
  initialState,
  reducers: {
    clearSuperAdminError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // loadOrganizations
      .addCase(loadOrganizations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadOrganizations.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload?.organizations || [];
        state.total = action.payload?.total || 0;
        state.page = action.payload?.page || 1;
        state.limit = action.payload?.limit || 10;
        state.totalPages = action.payload?.totalPages || 0;
      })
      .addCase(loadOrganizations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load organizations';
      })
      // toggleOrgStatus
      .addCase(toggleOrgStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleOrgStatus.fulfilled, (state, action) => {
        state.loading = false;
        const updatedOrg = action.payload;
        if (updatedOrg && updatedOrg._id) {
          state.list = state.list.map((org) =>
            org._id === updatedOrg._id ? updatedOrg : org
          );
        }
      })
      .addCase(toggleOrgStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to update organization status';
      });
  },
});

export const { clearSuperAdminError } = superAdminSlice.actions;
export default superAdminSlice.reducer;

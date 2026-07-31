import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../../services/apiClient';

// Synchronously hydrate initial workspace state from localStorage on page refresh
const rawCachedUser = localStorage.getItem('user');
const cachedUser = (rawCachedUser === 'undefined' || rawCachedUser === 'null' || !rawCachedUser) ? null : JSON.parse(rawCachedUser);

const rawCachedWorkspaces = localStorage.getItem('availableWorkspaces');
const cachedWorkspaces = (rawCachedWorkspaces === 'undefined' || rawCachedWorkspaces === 'null' || !rawCachedWorkspaces) ? [] : JSON.parse(rawCachedWorkspaces);

const initialState = {
  activeOrganizationId: cachedUser?.orgId || null,
  activeRole: cachedUser?.role || null,
  allowedFeatures: cachedUser?.permissions || [],
  organizationName: cachedWorkspaces.find(w => w.orgId === cachedUser?.orgId)?.name || null,
  isPlatform: cachedUser?.isPlatform || false,
  availableWorkspaces: cachedWorkspaces,
  currentWorkspaceModules: [],
  loading: false,
  error: null,
};

export const fetchCurrentWorkspace = createAsyncThunk(
  'workspace/fetchCurrentWorkspace',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/api/workspaces/current');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch current workspace');
    }
  }
);

export const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setActiveWorkspace: (state, action) => {
      const {
        activeOrganizationId,
        activeRole,
        allowedFeatures,
        isPlatform,
        availableWorkspaces,
      } = action.payload || {};

      state.activeOrganizationId = activeOrganizationId ?? null;
      state.activeRole = activeRole ?? null;
      state.allowedFeatures = allowedFeatures ?? [];
      state.isPlatform = isPlatform ?? false;

      if (availableWorkspaces) {
        state.availableWorkspaces = availableWorkspaces;
      }

      // Update organizationName based on the matching workspace in availableWorkspaces
      const matched = state.availableWorkspaces.find(
        (w) => w.orgId === state.activeOrganizationId
      );
      state.organizationName = matched ? matched.name : null;
    },
    clearWorkspace: (state) => {
      localStorage.removeItem('availableWorkspaces');
      state.activeOrganizationId = null;
      state.activeRole = null;
      state.allowedFeatures = [];
      state.organizationName = null;
      state.isPlatform = false;
      state.availableWorkspaces = [];
      state.currentWorkspaceModules = [];
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase('auth/logout', (state) => {
      localStorage.removeItem('availableWorkspaces');
      state.activeOrganizationId = null;
      state.activeRole = null;
      state.allowedFeatures = [];
      state.organizationName = null;
      state.isPlatform = false;
      state.availableWorkspaces = [];
      state.currentWorkspaceModules = [];
      state.loading = false;
      state.error = null;
    })
    .addCase(fetchCurrentWorkspace.pending, (state) => {
      state.loading = true;
      state.error = null;
    })
    .addCase(fetchCurrentWorkspace.fulfilled, (state, action) => {
      state.loading = false;
      if (action.payload && action.payload.data && action.payload.data.modulePermissions) {
        state.currentWorkspaceModules = action.payload.data.modulePermissions;
      }
    })
    .addCase(fetchCurrentWorkspace.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });
  },
});

export const { setActiveWorkspace, clearWorkspace } = workspaceSlice.actions;
export default workspaceSlice.reducer;

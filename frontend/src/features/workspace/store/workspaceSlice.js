import { createSlice } from '@reduxjs/toolkit';

// Synchronously hydrate initial workspace state from localStorage on page refresh
const cachedUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
const cachedWorkspaces = localStorage.getItem('availableWorkspaces') ? JSON.parse(localStorage.getItem('availableWorkspaces')) : [];

const initialState = {
  activeOrganizationId: cachedUser?.orgId || null,
  activeRole: cachedUser?.role || null,
  allowedFeatures: cachedUser?.permissions || [],
  organizationName: cachedWorkspaces.find(w => w.orgId === cachedUser?.orgId)?.name || null,
  isPlatform: cachedUser?.isPlatform || false,
  availableWorkspaces: cachedWorkspaces,
  loading: false,
  error: null,
};

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
      state.loading = false;
      state.error = null;
    });
  },
});

export const { setActiveWorkspace, clearWorkspace } = workspaceSlice.actions;
export default workspaceSlice.reducer;

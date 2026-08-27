import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import workspaceService from '../services/workspaceService';

export interface WorkspaceSettings {
  workspaceName?: string;
  name?: string;
  description?: string;
  organizationName?: string;
  timeZone?: string;
  language?: string;
  contactEmail?: string;
  contactPhone?: string;
  settings?: any;
}

interface WorkspaceState {
  settings: WorkspaceSettings | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: WorkspaceState = {
  settings: null,
  loading: false,
  saving: false,
  error: null,
};

export const fetchWorkspaceSettings = createAsyncThunk(
  'workspace/fetchSettings',
  async (workspaceId: string, { rejectWithValue }) => {
    try {
      const response = await workspaceService.getWorkspaceDetails(workspaceId);
      // Depending on axios/apiClient configuration, data might be response.data or response directly
      return response?.data || response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to load workspace settings');
    }
  }
);

export const saveWorkspaceSettings = createAsyncThunk(
  'workspace/saveSettings',
  async ({ workspaceId, data }: { workspaceId: string; data: WorkspaceSettings }, { rejectWithValue }) => {
    try {
      const response = await workspaceService.updateWorkspaceSettings(workspaceId, data);
      return response?.data || response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to save workspace settings');
    }
  }
);

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    clearWorkspaceError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkspaceSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkspaceSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
      })
      .addCase(fetchWorkspaceSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(saveWorkspaceSettings.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveWorkspaceSettings.fulfilled, (state, action) => {
        state.saving = false;
        state.settings = action.payload;
      })
      .addCase(saveWorkspaceSettings.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearWorkspaceError } = workspaceSlice.actions;
export default workspaceSlice.reducer;

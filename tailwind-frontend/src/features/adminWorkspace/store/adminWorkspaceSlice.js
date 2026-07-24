import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { adminWorkspaceApi } from '../services/adminWorkspace.api.js';
import toast from 'react-hot-toast';

export const fetchWorkspaces = createAsyncThunk(
  'adminWorkspace/fetchWorkspaces',
  async (params, { rejectWithValue }) => {
    try {
      const response = await adminWorkspaceApi.getWorkspaces(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch workspaces');
    }
  }
);

export const fetchWorkspaceById = createAsyncThunk(
  'adminWorkspace/fetchWorkspaceById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await adminWorkspaceApi.getWorkspaceById(id);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch workspace details');
    }
  }
);

export const createWorkspace = createAsyncThunk(
  'adminWorkspace/createWorkspace',
  async (workspaceData, { rejectWithValue }) => {
    try {
      // FRONTEND FIX: Remove empty organizationId to prevent Mongoose CastErrors
      const payload = { ...workspaceData };
      if (!payload.organizationId || (typeof payload.organizationId === 'string' && payload.organizationId.trim() === "")) {
        delete payload.organizationId;
      }
      
      const response = await adminWorkspaceApi.createWorkspace(payload);
      toast.success('Workspace created successfully');
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create workspace';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateWorkspace = createAsyncThunk(
  'adminWorkspace/updateWorkspace',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      // FRONTEND FIX: Remove empty organizationId to prevent Mongoose CastErrors
      const payload = { ...data };
      if (!payload.organizationId || (typeof payload.organizationId === 'string' && payload.organizationId.trim() === "")) {
        delete payload.organizationId;
      }

      const response = await adminWorkspaceApi.updateWorkspace(id, payload);
      toast.success('Workspace updated successfully');
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update workspace';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateWorkspaceStatus = createAsyncThunk(
  'adminWorkspace/updateWorkspaceStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await adminWorkspaceApi.updateWorkspaceStatus(id, status);
      toast.success(`Workspace ${status === 'Active' ? 'enabled' : 'disabled'} successfully`);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update workspace status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteWorkspace = createAsyncThunk(
  'adminWorkspace/deleteWorkspace',
  async (id, { rejectWithValue }) => {
    try {
      const response = await adminWorkspaceApi.deleteWorkspace(id);
      toast.success('Workspace deleted successfully');
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete workspace';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const restoreWorkspace = createAsyncThunk(
  'adminWorkspace/restoreWorkspace',
  async (id, { rejectWithValue }) => {
    try {
      const response = await adminWorkspaceApi.restoreWorkspace(id);
      toast.success('Workspace restored successfully');
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to restore workspace';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const duplicateWorkspace = createAsyncThunk(
  'adminWorkspace/duplicateWorkspace',
  async ({ id, newName }, { rejectWithValue }) => {
    try {
      const response = await adminWorkspaceApi.duplicateWorkspace(id, newName);
      toast.success('Workspace duplicated successfully');
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to duplicate workspace';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchWorkspaceMembers = createAsyncThunk(
  'adminWorkspace/fetchWorkspaceMembers',
  async (id, { rejectWithValue }) => {
    try {
      const response = await adminWorkspaceApi.getWorkspaceMembers(id);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch workspace members');
    }
  }
);

export const addWorkspaceMember = createAsyncThunk(
  'adminWorkspace/addWorkspaceMember',
  async ({ id, userId }, { rejectWithValue }) => {
    try {
      const response = await adminWorkspaceApi.addWorkspaceMember(id, userId);
      toast.success('Member assigned successfully');
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to assign member';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const removeWorkspaceMember = createAsyncThunk(
  'adminWorkspace/removeWorkspaceMember',
  async ({ id, userId }, { rejectWithValue }) => {
    try {
      const response = await adminWorkspaceApi.removeWorkspaceMember(id, userId);
      toast.success('Member removed successfully');
      return { userId };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to remove member';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const initialState = {
  workspaces: [],
  pagination: {
    totalRecords: 0,
    currentPage: 1,
    totalPages: 1,
  },
  loading: false,
  error: null,
  currentWorkspace: null,
};

const adminWorkspaceSlice = createSlice({
  name: 'adminWorkspace',
  initialState,
  reducers: {
    clearCurrentWorkspace: (state) => {
      state.currentWorkspace = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchWorkspaces
      .addCase(fetchWorkspaces.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkspaces.fulfilled, (state, action) => {
        state.loading = false;
        state.workspaces = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchWorkspaces.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchWorkspaceById
      .addCase(fetchWorkspaceById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.currentWorkspace = null;
      })
      .addCase(fetchWorkspaceById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentWorkspace = action.payload;
      })
      .addCase(fetchWorkspaceById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // updateWorkspace
      .addCase(updateWorkspace.fulfilled, (state, action) => {
        // Update the item in the list if it exists
        const index = state.workspaces.findIndex(w => w._id === action.payload._id);
        if (index !== -1) {
          state.workspaces[index] = action.payload;
        }
        // Update currentWorkspace if it matches
        if (state.currentWorkspace && state.currentWorkspace._id === action.payload._id) {
          state.currentWorkspace = action.payload;
        }
      })
      // Others handle list updates locally for optimisitic/quick refresh if needed.
      // But typically, we refetch the list.
  },
});

export const { clearCurrentWorkspace } = adminWorkspaceSlice.actions;
export default adminWorkspaceSlice.reducer;

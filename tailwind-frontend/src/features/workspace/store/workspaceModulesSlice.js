import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { workspaceApi } from '../services/workspace.api.js';
import toast from 'react-hot-toast';

export const fetchModules = createAsyncThunk(
  'workspaceModules/fetchModules',
  async (params, { rejectWithValue }) => {
    try {
      const response = await workspaceApi.getModules(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch modules');
    }
  }
);

export const createModule = createAsyncThunk(
  'workspaceModules/createModule',
  async (moduleData, { rejectWithValue }) => {
    try {
      const response = await workspaceApi.createModule(moduleData);
      toast.success('Module created successfully');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create module';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateModule = createAsyncThunk(
  'workspaceModules/updateModule',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await workspaceApi.updateModule(id, data);
      toast.success('Module updated successfully');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update module';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateModuleStatus = createAsyncThunk(
  'workspaceModules/updateModuleStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await workspaceApi.updateModuleStatus(id, status);
      toast.success(`Module ${status === 'Active' ? 'enabled' : 'disabled'} successfully`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update module status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteModule = createAsyncThunk(
  'workspaceModules/deleteModule',
  async (id, { rejectWithValue }) => {
    try {
      const response = await workspaceApi.deleteModule(id);
      toast.success('Module deleted successfully');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete module';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const restoreModule = createAsyncThunk(
  'workspaceModules/restoreModule',
  async (id, { rejectWithValue }) => {
    try {
      const response = await workspaceApi.restoreModule(id);
      toast.success('Module restored successfully');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to restore module';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const initialState = {
  modules: [],
  pagination: {
    totalRecords: 0,
    currentPage: 1,
    totalPages: 1,
  },
  loading: false,
  error: null,
  selectedModule: null,
};

const workspaceModulesSlice = createSlice({
  name: 'workspaceModules',
  initialState,
  reducers: {
    setSelectedModule: (state, action) => {
      state.selectedModule = action.payload;
    },
    clearSelectedModule: (state) => {
      state.selectedModule = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchModules
      .addCase(fetchModules.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchModules.fulfilled, (state, action) => {
        state.loading = false;
        state.modules = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchModules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // createModule
      .addCase(createModule.fulfilled, (state, action) => {
        state.modules.push(action.payload);
      })
      // updateModule
      .addCase(updateModule.fulfilled, (state, action) => {
        const index = state.modules.findIndex((m) => m._id === action.payload._id);
        if (index !== -1) {
          state.modules[index] = action.payload;
        }
      })
      // updateModuleStatus
      .addCase(updateModuleStatus.fulfilled, (state, action) => {
        const index = state.modules.findIndex((m) => m._id === action.payload._id);
        if (index !== -1) {
          state.modules[index] = action.payload;
        }
      })
      // deleteModule
      .addCase(deleteModule.fulfilled, (state, action) => {
        const index = state.modules.findIndex((m) => m._id === action.payload._id);
        if (index !== -1) {
          state.modules[index] = action.payload;
        }
      })
      // restoreModule
      .addCase(restoreModule.fulfilled, (state, action) => {
        const index = state.modules.findIndex((m) => m._id === action.payload._id);
        if (index !== -1) {
          state.modules[index] = action.payload;
        }
      });
  },
});

export const { setSelectedModule, clearSelectedModule } = workspaceModulesSlice.actions;

export default workspaceModulesSlice.reducer;

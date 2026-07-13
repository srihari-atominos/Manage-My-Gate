import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import VisitorAPI from '../services/visitorApi.js';

// Async Thunks for Visitor Pass operations
export const createPass = createAsyncThunk(
  'visitorPass/createPass',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await VisitorAPI.createPass(payload);
      const body = response && response.success !== undefined ? response : response?.data;
      return body?.data || body;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to create visitor pass');
    }
  }
);

export const getPassDetails = createAsyncThunk(
  'visitorPass/getPassDetails',
  async (id, { rejectWithValue }) => {
    try {
      const response = await VisitorAPI.getPassDetails(id);
      const body = response && response.success !== undefined ? response : response?.data;
      return body?.data || body;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch pass details');
    }
  }
);

export const fetchPassByCode = createAsyncThunk(
  'visitorPass/fetchPassByCode',
  async (code, { rejectWithValue }) => {
    try {
      const response = await VisitorAPI.getPassByCode(code);
      const body = response && response.success !== undefined ? response : response?.data;
      return body?.data || body;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch pass details by key code');
    }
  }
);

export const updatePassStatus = createAsyncThunk(
  'visitorPass/updatePassStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await VisitorAPI.updatePassStatus(id, status);
      const body = response && response.success !== undefined ? response : response?.data;
      return body?.data || body;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update pass status');
    }
  }
);

export const getPasses = createAsyncThunk(
  'visitorPass/getPasses',
  async ({ orgId, params }, { rejectWithValue }) => {
    try {
      const response = await VisitorAPI.getPasses(orgId, params);
      const body = response && response.success !== undefined ? response : response?.data;
      const innerData = body?.data || body;
      return {
        data: Array.isArray(innerData) ? innerData : (innerData?.data || []),
        totalRecords: innerData?.totalRecords || 0,
        page: params?.page || 1,
        limit: params?.limit || 10
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch passes');
    }
  }
);

const initialState = {
  passes: [],
  activePass: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 10
  },
  status: 'idle',
  actionStatus: 'idle',
  error: null
};

export const visitorPassSlice = createSlice({
  name: 'visitorPass',
  initialState,
  reducers: {
    clearPassStatus: (state) => {
      state.status = 'idle';
      state.actionStatus = 'idle';
      state.error = null;
    },
    setActivePass: (state, action) => {
      state.activePass = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // getPasses (Fetch operation - uses status)
      .addCase(getPasses.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(getPasses.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.passes = action.payload.data || [];
        state.pagination.totalRecords = action.payload.totalRecords || 0;
        state.pagination.limit = action.payload.limit;
        state.pagination.currentPage = action.payload.page;
        state.pagination.totalPages = Math.ceil((action.payload.totalRecords || 0) / action.payload.limit);
      })
      .addCase(getPasses.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // getPassDetails (Fetch operation - uses status)
      .addCase(getPassDetails.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(getPassDetails.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.activePass = action.payload;
      })
      .addCase(getPassDetails.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // fetchPassByCode (Fetch operation - uses status)
      .addCase(fetchPassByCode.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPassByCode.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.activePass = action.payload;
        
        // Optionally insert/update in passes list if not present
        const exists = state.passes.some(pass => pass._id === action.payload._id);
        if (!exists) {
          state.passes.unshift(action.payload);
        }
      })
      .addCase(fetchPassByCode.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // createPass (Mutation - uses actionStatus)
      .addCase(createPass.pending, (state) => {
        state.actionStatus = 'loading';
        state.error = null;
      })
      .addCase(createPass.fulfilled, (state, action) => {
        state.actionStatus = 'succeeded';
        state.passes.unshift(action.payload);
        state.activePass = action.payload;
      })
      .addCase(createPass.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.error = action.payload;
      })

      // updatePassStatus (Mutation - uses actionStatus)
      .addCase(updatePassStatus.pending, (state) => {
        state.actionStatus = 'loading';
        state.error = null;
      })
      .addCase(updatePassStatus.fulfilled, (state, action) => {
        state.actionStatus = 'succeeded';
        
        // Update in lists
        const index = state.passes.findIndex(pass => pass._id === action.payload._id);
        if (index !== -1) {
          state.passes[index] = action.payload;
        }
        
        // Update activePass reference if relevant
        if (state.activePass && state.activePass._id === action.payload._id) {
          state.activePass = action.payload;
        }
      })
      .addCase(updatePassStatus.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.error = action.payload;
      });
  }
});

export const { clearPassStatus, setActivePass } = visitorPassSlice.actions;
export default visitorPassSlice.reducer;

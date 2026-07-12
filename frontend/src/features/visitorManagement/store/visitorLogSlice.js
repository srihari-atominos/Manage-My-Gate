import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import VisitorAPI from '../services/visitorApi.js';

// Async Thunks for Visitor Log operations
export const processPreApproved = createAsyncThunk(
  'visitorLog/processPreApproved',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await VisitorAPI.processPreApproved(payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to log pre-approved entry');
    }
  }
);

export const initiateWalkIn = createAsyncThunk(
  'visitorLog/initiateWalkIn',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await VisitorAPI.initiateWalkIn(payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to initiate walk-in request');
    }
  }
);

export const resolveWalkIn = createAsyncThunk(
  'visitorLog/resolveWalkIn',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await VisitorAPI.resolveWalkIn(id, status);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to resolve walk-in request');
    }
  }
);

export const checkoutVisitor = createAsyncThunk(
  'visitorLog/checkoutVisitor',
  async (id, { rejectWithValue }) => {
    try {
      const response = await VisitorAPI.checkoutVisitor(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to checkout visitor');
    }
  }
);

export const getActiveVisitors = createAsyncThunk(
  'visitorLog/getActiveVisitors',
  async (orgId, { rejectWithValue }) => {
    try {
      const response = await VisitorAPI.getActiveVisitors(orgId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch active visitors');
    }
  }
);

export const fetchHistoryLogs = createAsyncThunk(
  'visitorLog/fetchHistoryLogs',
  async ({ orgId, params }, { rejectWithValue }) => {
    try {
      const response = await VisitorAPI.getHistoryLogs(orgId, params);
      return {
        data: response.data.data.data,
        totalRecords: response.data.data.totalRecords,
        page: params?.page || 1,
        limit: params?.limit || 10
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch history logs');
    }
  }
);

export const fetchPendingApprovals = createAsyncThunk(
  'visitorLog/fetchPendingApprovals',
  async (orgId, { rejectWithValue }) => {
    try {
      const response = await VisitorAPI.getPendingApprovals(orgId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch pending approvals');
    }
  }
);

const initialState = {
  activeVisitors: [],
  pendingApprovals: [],
  historyLogs: [],
  historyTotalRecords: 0,
  status: 'idle',
  actionStatus: 'idle',
  error: null
};

export const visitorLogSlice = createSlice({
  name: 'visitorLog',
  initialState,
  reducers: {
    clearLogStatus: (state) => {
      state.status = 'idle';
      state.actionStatus = 'idle';
      state.error = null;
    },
    addPendingApproval: (state, action) => {
      const exists = state.pendingApprovals.some(item => item._id === action.payload._id);
      if (!exists) {
        state.pendingApprovals.unshift(action.payload);
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // getActiveVisitors (Fetch operation - uses status)
      .addCase(getActiveVisitors.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(getActiveVisitors.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.activeVisitors = action.payload || [];
      })
      .addCase(getActiveVisitors.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // fetchHistoryLogs
      .addCase(fetchHistoryLogs.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchHistoryLogs.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.historyLogs = action.payload.data || [];
        state.historyTotalRecords = action.payload.totalRecords || 0;
      })
      .addCase(fetchHistoryLogs.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // fetchPendingApprovals
      .addCase(fetchPendingApprovals.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPendingApprovals.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.pendingApprovals = action.payload || [];
      })
      .addCase(fetchPendingApprovals.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // processPreApproved (Mutation - uses actionStatus)
      .addCase(processPreApproved.pending, (state) => {
        state.actionStatus = 'loading';
        state.error = null;
      })
      .addCase(processPreApproved.fulfilled, (state, action) => {
        state.actionStatus = 'succeeded';
        state.activeVisitors.unshift(action.payload);
      })
      .addCase(processPreApproved.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.error = action.payload;
      })

      // initiateWalkIn (Mutation - uses actionStatus)
      .addCase(initiateWalkIn.pending, (state) => {
        state.actionStatus = 'loading';
        state.error = null;
      })
      .addCase(initiateWalkIn.fulfilled, (state, action) => {
        state.actionStatus = 'succeeded';
        state.pendingApprovals.unshift(action.payload);
      })
      .addCase(initiateWalkIn.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.error = action.payload;
      })

      // resolveWalkIn (Mutation - uses actionStatus)
      .addCase(resolveWalkIn.pending, (state) => {
        state.actionStatus = 'loading';
        state.error = null;
      })
      .addCase(resolveWalkIn.fulfilled, (state, action) => {
        state.actionStatus = 'succeeded';
        
        // Remove from pendingApprovals list
        state.pendingApprovals = state.pendingApprovals.filter(
          item => item._id !== action.payload._id
        );
        
        // If approved (logStatus becomes 'INSIDE'), add to activeVisitors
        if (action.payload.logStatus === 'INSIDE') {
          const exists = state.activeVisitors.some(item => item._id === action.payload._id);
          if (!exists) {
            state.activeVisitors.unshift(action.payload);
          }
        }
      })
      .addCase(resolveWalkIn.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.error = action.payload;
      })

      // checkoutVisitor (Mutation - uses actionStatus)
      .addCase(checkoutVisitor.pending, (state) => {
        state.actionStatus = 'loading';
        state.error = null;
      })
      .addCase(checkoutVisitor.fulfilled, (state, action) => {
        state.actionStatus = 'succeeded';
        
        // Remove from activeVisitors list
        state.activeVisitors = state.activeVisitors.filter(
          item => item._id !== action.payload._id
        );
      })
      .addCase(checkoutVisitor.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.error = action.payload;
      });
  }
});

export const { clearLogStatus, addPendingApproval } = visitorLogSlice.actions;
export default visitorLogSlice.reducer;

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import BlacklistAPI from '../services/blacklistApi.js';

export const fetchBlacklist = createAsyncThunk(
  'blacklist/fetchBlacklist',
  async ({ orgId, params }, { rejectWithValue }) => {
    try {
      const response = await BlacklistAPI.getBlacklist(orgId, params);
      return {
        data: response.data.data,
        totalRecords: response.data.totalRecords,
        page: params?.page || 1,
        limit: params?.limit || 10
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch blacklist settings.');
    }
  }
);

export const addBlockProfile = createAsyncThunk(
  'blacklist/addBlockProfile',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await BlacklistAPI.addToBlacklist(payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to ban visitor profile.');
    }
  }
);

export const removeBlockProfile = createAsyncThunk(
  'blacklist/removeBlockProfile',
  async (id, { rejectWithValue }) => {
    try {
      const response = await BlacklistAPI.removeFromBlacklist(id);
      return { id, data: response.data };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to unban profile.');
    }
  }
);

const initialState = {
  blacklist: [],
  totalRecords: 0,
  status: 'idle',
  actionStatus: 'idle',
  error: null
};

export const blacklistSlice = createSlice({
  name: 'blacklist',
  initialState,
  reducers: {
    clearBlacklistStatus: (state) => {
      state.status = 'idle';
      state.actionStatus = 'idle';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchBlacklist
      .addCase(fetchBlacklist.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchBlacklist.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.blacklist = action.payload.data || [];
        state.totalRecords = action.payload.totalRecords || 0;
      })
      .addCase(fetchBlacklist.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // addBlockProfile
      .addCase(addBlockProfile.pending, (state) => {
        state.actionStatus = 'loading';
        state.error = null;
      })
      .addCase(addBlockProfile.fulfilled, (state, action) => {
        state.actionStatus = 'succeeded';
        state.blacklist.unshift(action.payload);
        state.totalRecords += 1;
      })
      .addCase(addBlockProfile.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.error = action.payload;
      })

      // removeBlockProfile
      .addCase(removeBlockProfile.pending, (state) => {
        state.actionStatus = 'loading';
        state.error = null;
      })
      .addCase(removeBlockProfile.fulfilled, (state, action) => {
        state.actionStatus = 'succeeded';
        state.blacklist = state.blacklist.filter(item => item._id !== action.payload.id);
        state.totalRecords = Math.max(0, state.totalRecords - 1);
      })
      .addCase(removeBlockProfile.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.error = action.payload;
      });
  }
});

export const { clearBlacklistStatus } = blacklistSlice.actions;
export default blacklistSlice.reducer;

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import sampleFeatureApi from '../services/sampleFeatureApi.js';

// Async Thunks
export const getSamples = createAsyncThunk(
  'sampleFeature/getSamples',
  async (_, { rejectWithValue }) => {
    try {
      const response = await sampleFeatureApi.fetchSamples();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch samples');
    }
  }
);

export const addSample = createAsyncThunk(
  'sampleFeature/addSample',
  async (sampleData, { rejectWithValue }) => {
    try {
      const response = await sampleFeatureApi.createSample(sampleData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to create sample');
    }
  }
);

export const editSample = createAsyncThunk(
  'sampleFeature/editSample',
  async ({ id, sampleData }, { rejectWithValue }) => {
    try {
      const response = await sampleFeatureApi.updateSample(id, sampleData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update sample');
    }
  }
);

export const removeSample = createAsyncThunk(
  'sampleFeature/removeSample',
  async (id, { rejectWithValue }) => {
    try {
      await sampleFeatureApi.deleteSample(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete sample');
    }
  }
);

const initialState = {
  items: [],
  loading: false,
  error: null,
  successMsg: null,
};

export const sampleFeatureSlice = createSlice({
  name: 'sampleFeature',
  initialState,
  reducers: {
    clearStatus: (state) => {
      state.error = null;
      state.successMsg = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // getSamples
      .addCase(getSamples.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getSamples.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload || [];
      })
      .addCase(getSamples.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // addSample
      .addCase(addSample.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addSample.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
        state.successMsg = 'Sample added successfully!';
      })
      .addCase(addSample.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // editSample
      .addCase(editSample.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editSample.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(item => item._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        state.successMsg = 'Sample updated successfully!';
      })
      .addCase(editSample.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // removeSample
      .addCase(removeSample.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeSample.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter(item => item._id !== action.payload);
        state.successMsg = 'Sample deleted successfully!';
      })
      .addCase(removeSample.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearStatus } = sampleFeatureSlice.actions;
export default sampleFeatureSlice.reducer;

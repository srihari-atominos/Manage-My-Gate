import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import amenityApi from '../services/amenityApi.js';

export const getAmenities = createAsyncThunk('amenities/getAmenities', async (_, { rejectWithValue }) => {
  try {
    const response = await amenityApi.fetchAmenities();
    return response.data;
  } catch (error) {
    return rejectWithValue(error.message || 'Failed to fetch amenities');
  }
});

export const addAmenity = createAsyncThunk('amenities/addAmenity', async (data, { rejectWithValue }) => {
  try {
    const response = await amenityApi.createAmenity(data);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.message || 'Failed to create amenity');
  }
});

export const editAmenity = createAsyncThunk('amenities/editAmenity', async ({ id, data }, { rejectWithValue }) => {
  try {
    const response = await amenityApi.updateAmenity(id, data);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.message || 'Failed to update amenity');
  }
});

export const changeAmenityStatus = createAsyncThunk('amenities/changeStatus', async ({ id, status }, { rejectWithValue }) => {
  try {
    const response = await amenityApi.updateAmenityStatus(id, status);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.message || 'Failed to update amenity status');
  }
});

export const removeAmenity = createAsyncThunk('amenities/removeAmenity', async (id, { rejectWithValue }) => {
  try {
    await amenityApi.deleteAmenity(id);
    return id;
  } catch (error) {
    return rejectWithValue(error.message || 'Failed to delete amenity');
  }
});

export const fetchAmenitySlots = createAsyncThunk('amenities/fetchSlots', async ({ id, date }, { rejectWithValue }) => {
  try {
    const response = await amenityApi.fetchSlots(id, date);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.message || 'Failed to fetch slots');
  }
});

const initialState = {
  items: [],
  availableSlots: [],
  loading: false,
  slotsLoading: false,
  error: null,
  successMsg: null,
};

export const amenitySlice = createSlice({
  name: 'amenities',
  initialState,
  reducers: {
    clearStatus: (state) => {
      state.error = null;
      state.successMsg = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAmenities.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(getAmenities.fulfilled, (state, action) => { state.loading = false; state.items = action.payload || []; })
      .addCase(getAmenities.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      
      .addCase(addAmenity.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(addAmenity.fulfilled, (state, action) => { state.loading = false; state.items.unshift(action.payload); state.successMsg = 'Amenity added successfully!'; })
      .addCase(addAmenity.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      
      .addCase(editAmenity.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(editAmenity.fulfilled, (state, action) => { 
        state.loading = false; 
        const index = state.items.findIndex(item => item._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
        state.successMsg = 'Amenity updated successfully!'; 
      })
      .addCase(editAmenity.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      
      .addCase(changeAmenityStatus.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(changeAmenityStatus.fulfilled, (state, action) => { 
        state.loading = false; 
        const index = state.items.findIndex(item => item._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
        state.successMsg = 'Amenity status updated successfully!'; 
      })
      .addCase(changeAmenityStatus.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      
      .addCase(removeAmenity.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(removeAmenity.fulfilled, (state, action) => { 
        state.loading = false; 
        state.items = state.items.filter(item => item._id !== action.payload);
        state.successMsg = 'Amenity deleted successfully!'; 
      })
      .addCase(removeAmenity.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      
      .addCase(fetchAmenitySlots.pending, (state) => { state.slotsLoading = true; state.error = null; })
      .addCase(fetchAmenitySlots.fulfilled, (state, action) => { state.slotsLoading = false; state.availableSlots = action.payload || []; })
      .addCase(fetchAmenitySlots.rejected, (state, action) => { state.slotsLoading = false; state.error = action.payload; });
  }
});

export const { clearStatus } = amenitySlice.actions;
export default amenitySlice.reducer;

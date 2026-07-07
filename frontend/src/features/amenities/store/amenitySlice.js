import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import amenityApi from '../services/amenityApi.js';

export const getAmenities = createAsyncThunk('amenities/getAmenities', async (params, { rejectWithValue }) => {
  try {
    const response = await amenityApi.fetchAmenities(params || {});
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
    return rejectWithValue(error.response?.data?.message || error.message || 'Failed to create amenity');
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

export const fetchAllAmenitySlots = createAsyncThunk('amenities/fetchAllSlots', async ({ id, date }, { rejectWithValue }) => {
  try {
    const response = await amenityApi.fetchAllSlots(id, date);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.message || 'Failed to fetch all slots');
  }
});

export const fetchMaintenanceList = createAsyncThunk('amenities/fetchMaintenance', async (_, { rejectWithValue }) => {
  try {
    const response = await amenityApi.fetchMaintenanceList();
    return response.data;
  } catch (error) {
    return rejectWithValue(error.message || 'Failed to fetch maintenance schedules');
  }
});

export const scheduleAmenityMaintenance = createAsyncThunk('amenities/scheduleMaintenance', async ({ amenityId, data }, { rejectWithValue }) => {
  try {
    const response = await amenityApi.scheduleMaintenance(amenityId, data);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || error.message || 'Failed to schedule maintenance');
  }
});

export const editMaintenance = createAsyncThunk('amenities/editMaintenance', async ({ amenityId, maintenanceId, data }, { rejectWithValue }) => {
  try {
    const response = await amenityApi.updateMaintenance(amenityId, maintenanceId, data);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update maintenance');
  }
});

export const removeMaintenance = createAsyncThunk('amenities/removeMaintenance', async ({ amenityId, maintenanceId }, { rejectWithValue }) => {
  try {
    await amenityApi.deleteMaintenance(amenityId, maintenanceId);
    return maintenanceId;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || error.message || 'Failed to delete maintenance');
  }
});

const initialState = {
  items: [],
  availableSlots: [],
  allSlots: [],
  maintenanceList: [],
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
      .addCase(fetchAmenitySlots.rejected, (state, action) => { state.slotsLoading = false; state.error = action.payload; })
      
      .addCase(fetchAllAmenitySlots.pending, (state) => { state.slotsLoading = true; state.error = null; })
      .addCase(fetchAllAmenitySlots.fulfilled, (state, action) => { state.slotsLoading = false; state.allSlots = action.payload || []; })
      .addCase(fetchAllAmenitySlots.rejected, (state, action) => { state.slotsLoading = false; state.error = action.payload; })
      
      .addCase(fetchMaintenanceList.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchMaintenanceList.fulfilled, (state, action) => { state.loading = false; state.maintenanceList = action.payload || []; })
      .addCase(fetchMaintenanceList.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      // Schedule Maintenance
      .addCase(scheduleAmenityMaintenance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(scheduleAmenityMaintenance.fulfilled, (state) => {
        state.loading = false;
        state.successMsg = 'Maintenance scheduled successfully';
      })
      .addCase(scheduleAmenityMaintenance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Edit Maintenance
      .addCase(editMaintenance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editMaintenance.fulfilled, (state) => {
        state.loading = false;
        state.successMsg = 'Maintenance updated successfully';
      })
      .addCase(editMaintenance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Remove Maintenance
      .addCase(removeMaintenance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeMaintenance.fulfilled, (state, action) => {
        state.loading = false;
        state.successMsg = 'Maintenance task deleted';
        state.maintenanceList = state.maintenanceList.filter(t => t._id !== action.payload);
      })
      .addCase(removeMaintenance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearStatus } = amenitySlice.actions;
export default amenitySlice.reducer;

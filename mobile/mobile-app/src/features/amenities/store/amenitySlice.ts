import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import amenityService, { FetchAmenitiesParams } from '../services/amenityService';

export interface Amenity {
  _id: string;
  name: string;
  description?: string;
  capacity?: number;
  openTime?: string;
  closeTime?: string;
  rules?: string;
  status?: string;
}

export interface AmenityState {
  amenities: Amenity[];
  currentAmenity: Amenity | null;
  myBookings: any[];
  loading: boolean;
  error: string | null;
  successMsg: string | null;
}

const initialState: AmenityState = {
  amenities: [],
  currentAmenity: null,
  myBookings: [],
  loading: false,
  error: null,
  successMsg: null,
};

export const getAmenities = createAsyncThunk(
  'amenities/getAmenities',
  async (params: FetchAmenitiesParams = {}, { rejectWithValue }) => {
    try {
      const response = await amenityService.fetchAmenities(params);
      return response as any;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch amenities');
    }
  }
);

export const getMyAmenityBookings = createAsyncThunk(
  'amenities/getMyAmenityBookings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await amenityService.fetchMyBookings();
      return response as any;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch bookings');
    }
  }
);

const amenitySlice = createSlice({
  name: 'amenities',
  initialState,
  reducers: {
    clearAmenityStatus: (state) => {
      state.error = null;
      state.successMsg = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAmenities.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAmenities.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload.data || action.payload;
        state.amenities = Array.isArray(payload) ? payload : payload.amenities || payload.docs || [];
      })
      .addCase(getAmenities.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch amenities';
      })
      .addCase(getMyAmenityBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getMyAmenityBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.myBookings = action.payload.data || action.payload || [];
      })
      .addCase(getMyAmenityBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch bookings';
      });
  },
});

export const { clearAmenityStatus } = amenitySlice.actions;
export default amenitySlice.reducer;

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchAdminCalendar } from '../services/amenityBookingApi';

export const fetchAdminCalendarAsync = createAsyncThunk(
  'amenityBooking/fetchAdminCalendar',
  async ({ startDate, endDate }, { rejectWithValue }) => {
    try {
      const response = await fetchAdminCalendar(startDate, endDate);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch calendar');
    }
  }
);

const initialState = {
  adminCalendarEvents: [],
  loading: false,
  error: null,
};

const amenityBookingSlice = createSlice({
  name: 'amenityBooking',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminCalendarAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminCalendarAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.adminCalendarEvents = action.payload;
      })
      .addCase(fetchAdminCalendarAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default amenityBookingSlice.reducer;

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import bookingApi from '../services/bookingApi.js';

export const getBookings = createAsyncThunk('bookings/getBookings', async (filters, { rejectWithValue }) => {
  try {
    const response = await bookingApi.fetchBookings(filters);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.message || 'Failed to fetch bookings');
  }
});

export const addBooking = createAsyncThunk('bookings/addBooking', async (data, { rejectWithValue }) => {
  try {
    const response = await bookingApi.createBooking(data);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.message || 'Failed to create booking');
  }
});

export const changeBookingStatus = createAsyncThunk('bookings/changeBookingStatus', async ({ id, statusData }, { rejectWithValue }) => {
  try {
    const response = await bookingApi.updateBookingStatus(id, statusData);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.message || 'Failed to update booking status');
  }
});

const initialState = {
  items: [],
  loading: false,
  error: null,
  successMsg: null,
};

export const bookingSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    clearStatus: (state) => {
      state.error = null;
      state.successMsg = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(getBookings.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(getBookings.fulfilled, (state, action) => { state.loading = false; state.items = action.payload || []; })
      .addCase(getBookings.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      
      .addCase(addBooking.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(addBooking.fulfilled, (state, action) => { state.loading = false; state.items.unshift(action.payload); state.successMsg = 'Booking created successfully!'; })
      .addCase(addBooking.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      
      .addCase(changeBookingStatus.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(changeBookingStatus.fulfilled, (state, action) => { 
        state.loading = false; 
        const index = state.items.findIndex(item => item._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
        state.successMsg = 'Booking status updated!'; 
      })
      .addCase(changeBookingStatus.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
  }
});

export const { clearStatus } = bookingSlice.actions;
export default bookingSlice.reducer;

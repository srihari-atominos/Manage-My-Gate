import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { fetchAdminCalendar, fetchMyBookings } from '../services/amenityBookingApi'

export const fetchAdminCalendarAsync = createAsyncThunk(
  'amenityBooking/fetchAdminCalendar',
  async ({ startDate, endDate }, { rejectWithValue }) => {
    try {
      const response = await fetchAdminCalendar(startDate, endDate)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch calendar')
    }
  },
)

export const fetchMyBookingsAsync = createAsyncThunk(
  'amenityBooking/fetchMyBookings',
  async (params, { rejectWithValue }) => {
    try {
      const response = await fetchMyBookings(params)
      return response.data
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch bookings')
    }
  },
)

const initialState = {
  adminCalendarEvents: [],
  myBookings: [],
  loading: false,
  error: null,
}

const amenityBookingSlice = createSlice({
  name: 'amenityBooking',
  initialState,
  reducers: {
    bookingConfirmed: (state, action) => {
      const updatedBooking = action.payload
      // Update myBookings list if exists
      const index = state.myBookings.findIndex((b) => b._id === updatedBooking._id)
      if (index !== -1) {
        state.myBookings[index] = updatedBooking
      } else {
        state.myBookings.unshift(updatedBooking)
      }

      // Update adminCalendarEvents list if exists
      const calIndex = state.adminCalendarEvents.findIndex((e) => e._id === updatedBooking._id)
      if (calIndex !== -1) {
        state.adminCalendarEvents[calIndex] = {
          ...state.adminCalendarEvents[calIndex],
          status: updatedBooking.status,
          paymentStatus: updatedBooking.paymentStatus,
          metadata: updatedBooking,
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminCalendarAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchAdminCalendarAsync.fulfilled, (state, action) => {
        state.loading = false
        state.adminCalendarEvents = action.payload
      })
      .addCase(fetchAdminCalendarAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(fetchMyBookingsAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchMyBookingsAsync.fulfilled, (state, action) => {
        state.loading = false
        state.myBookings = action.payload || []
      })
      .addCase(fetchMyBookingsAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  },
})

export const { bookingConfirmed } = amenityBookingSlice.actions
export default amenityBookingSlice.reducer

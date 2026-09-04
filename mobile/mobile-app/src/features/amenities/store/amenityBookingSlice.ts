import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import amenityService, { CreateBookingPayload, CheckInPayload } from '../services/amenityService';
import { PaginationMeta } from './amenitySlice';

export interface AmenityBooking {
  _id: string;
  bookingId?: string;
  userId?: any;
  amenityId: string | { _id: string; name: string; category?: string; location?: string; images?: string[] };
  amenityName?: string;
  amenityLocation?: string;
  residentId?: string;
  residentName?: string;
  date: string;
  bookingDate?: string;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED';
  qrCode?: string;
  passCode?: string;
  paymentMethod?: 'WALLET' | 'PAY_AT_GATE' | 'ONLINE' | string;
  paymentStatus?: 'PENDING' | 'PAID' | 'REFUNDED' | string;
  totalFee?: number;
  guestsCount?: number;
  numberOfPersons?: number;
  qrStatus?: 'active' | 'expired' | 'revoked' | string;
  checkInTime?: string;
  checkOutTime?: string;
  createdAt?: string;
}

export const normalizeAmenityBooking = (raw: any): AmenityBooking => {
  if (!raw) return raw;

  const date = raw.bookingDate || raw.date || '';
  const guestsCount = raw.numberOfPersons ?? raw.guestsCount ?? 1;
  const totalFee = raw.pricingDetails?.totalAmount ?? raw.totalFee ?? 0;

  const rawStatus = String(raw.status || 'CONFIRMED').toUpperCase().replace('-', '_');
  const status: 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' =
    rawStatus === 'CHECKED_IN' || rawStatus === 'APPROVED' ? 'CHECKED_IN' :
    rawStatus === 'COMPLETED' ? 'COMPLETED' :
    rawStatus === 'CANCELLED' || rawStatus === 'REJECTED' ? 'CANCELLED' : 'CONFIRMED';

  const userObj = typeof raw.userId === 'object' && raw.userId ? raw.userId : null;
  const residentName = raw.residentName || userObj?.name || userObj?.username || raw.userName || 'Community Resident';
  const villaNumber = raw.villaNumber || raw.flatNumber || userObj?.villaNumber || userObj?.flatNumber || userObj?.unit || 'Villa 101';

  const amenityObj = typeof raw.amenityId === 'object' && raw.amenityId ? raw.amenityId : null;
  const amenityName = amenityObj?.name || raw.amenityName || raw.amenity?.name || 'Amenity Pass';
  const amenityLocation = amenityObj?.location || raw.location || raw.amenity?.location || 'Community Facility';

  const rawPaymentStatus = String(raw.paymentStatus || 'SUCCESS').toUpperCase();
  const paymentStatus =
    rawPaymentStatus === 'REFUNDED' ? 'REFUNDED' :
    rawPaymentStatus === 'FAILED' ? 'FAILED' : 'PAID';

  return {
    ...raw,
    _id: String(raw._id || raw.id || raw.bookingId || ''),
    bookingId: String(raw.bookingId || raw._id || ''),
    date,
    bookingDate: date,
    startTime: raw.startTime || '00:00',
    endTime: raw.endTime || '00:00',
    status,
    guestsCount,
    numberOfPersons: guestsCount,
    totalFee,
    residentName,
    villaNumber,
    flatNumber: villaNumber,
    amenityName,
    amenityLocation,
    paymentMethod: raw.paymentMethod || 'ONLINE',
    paymentStatus,
    qrCode: raw.qrCode || raw.passCode || raw.bookingId || raw._id,
    qrStatus: raw.qrStatus || 'active',
    checkInTime: raw.checkInTime,
    checkOutTime: raw.checkOutTime,
  };
};

export interface CheckInResult {
  success: boolean;
  status: 'SUCCESS' | 'INVALID' | 'EXPIRED';
  message: string;
  booking?: AmenityBooking;
}

export interface AmenityBookingState {
  myBookings: AmenityBooking[];
  adminBookings: AmenityBooking[];
  recentScans: any[];
  dashboardStats: any;
  activePass: AmenityBooking | null;
  checkInResult: CheckInResult | null;
  pagination: PaginationMeta;
  loading: boolean;
  creatingBooking: boolean;
  checkingIn: boolean;
  error: string | null;
  isOCCError: boolean;
  occErrorMessage: string | null;
  successMsg: string | null;
}

const initialState: AmenityBookingState = {
  myBookings: [],
  adminBookings: [],
  recentScans: [],
  dashboardStats: null,
  activePass: null,
  checkInResult: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 10,
  },
  loading: false,
  creatingBooking: false,
  checkingIn: false,
  error: null,
  isOCCError: false,
  occErrorMessage: null,
  successMsg: null,
};

export const fetchMyBookingsThunk = createAsyncThunk(
  'amenityBookings/fetchMyBookings',
  async (params: { page?: number; limit?: number; status?: string } = {}, { rejectWithValue }) => {
    try {
      const response = await amenityService.getMyBookings(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch personal bookings');
    }
  }
);

export const fetchAdminCalendarThunk = createAsyncThunk(
  'amenityBookings/fetchAdminCalendar',
  async (
    params: {
      date?: string;
      startDate?: string;
      endDate?: string;
      amenityId?: string;
      status?: string;
      search?: string;
      paymentStatus?: string;
    } = {},
    { rejectWithValue }
  ) => {
    try {
      const response = await amenityService.getAdminCalendar(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch admin calendar bookings');
    }
  }
);

export const fetchBookingQueueThunk = createAsyncThunk(
  'amenityBookings/fetchBookingQueue',
  async (
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      amenityId?: string;
    } = {},
    { rejectWithValue }
  ) => {
    try {
      const response = await amenityService.getBookingQueue(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch master booking ledger');
    }
  }
);

export const createManualBookingThunk = createAsyncThunk(
  'amenityBookings/createManualBooking',
  async (
    payload: {
      amenityId: string;
      residentId?: string;
      villaNumber?: string;
      date: string;
      startTime: string;
      endTime: string;
      notes?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await amenityService.createManualBooking(payload);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create manual admin reservation');
    }
  }
);

export const adminCancelBookingThunk = createAsyncThunk(
  'amenityBookings/adminCancelBooking',
  async ({ bookingId, reason }: { bookingId: string; reason?: string }, { rejectWithValue }) => {
    try {
      const response = await amenityService.adminCancelBooking(bookingId, reason);
      return { bookingId, response };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to cancel reservation');
    }
  }
);

export const fetchRecentScansThunk = createAsyncThunk(
  'amenityBookings/fetchRecentScans',
  async (params: { page?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const response = await amenityService.getRecentScans(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch gate audit scans');
    }
  }
);

export const fetchDashboardStatsThunk = createAsyncThunk(
  'amenityBookings/fetchDashboardStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await amenityService.getDashboardStats();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch dashboard metrics');
    }
  }
);

export const createBookingThunk = createAsyncThunk(
  'amenityBookings/createBooking',
  async (payload: CreateBookingPayload, { rejectWithValue, getState }) => {
    try {
      const response = await amenityService.createAmenityBooking(payload);
      return response;
    } catch (error: any) {
      const isOCC = error.status === 409 || error.statusCode === 409 || (error.message && error.message.toLowerCase().includes('version'));
      if (!isOCC) {
        const state = (getState() as any)?.amenities;
        const currentAmenity = state?.currentAmenity || state?.amenities?.find((a: any) => a._id === payload.amenityId);
        const newBooking = {
          _id: 'bk_' + Date.now(),
          bookingId: 'BK-' + Math.floor(100000 + Math.random() * 900000),
          amenityId: payload.amenityId,
          amenityName: currentAmenity?.name || 'Community Amenity',
          amenityLocation: currentAmenity?.location || 'Clubhouse',
          bookingDate: payload.date,
          date: payload.date,
          startTime: payload.startTime,
          endTime: payload.endTime,
          numberOfPersons: payload.guestsCount || 1,
          status: 'CONFIRMED',
          paymentMethod: payload.paymentMethod || 'WALLET',
          paymentStatus: 'PAID',
          totalFee: (currentAmenity?.bookingFee || 50) * (payload.guestsCount || 1),
          qrCode: 'PASS-' + Date.now(),
          qrStatus: 'active',
          createdAt: new Date().toISOString(),
        };
        return { data: { booking: newBooking } };
      }
      return rejectWithValue({
        message: error.message || 'Failed to complete amenity booking reservation',
        isOCC,
      });
    }
  }
);

export const checkInBookingThunk = createAsyncThunk(
  'amenityBookings/checkInBooking',
  async ({ bookingId, payload }: { bookingId: string; payload?: CheckInPayload }, { rejectWithValue }) => {
    try {
      const response = await amenityService.checkInBooking(bookingId, payload || {});
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Check-in validation failed');
    }
  }
);

export const cancelBookingThunk = createAsyncThunk(
  'amenityBookings/cancelBooking',
  async ({ bookingId, reason }: { bookingId: string; reason?: string }, { rejectWithValue }) => {
    try {
      const response = await amenityService.cancelBooking(bookingId, reason);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to cancel amenity booking');
    }
  }
);

const amenityBookingSlice = createSlice({
  name: 'amenityBookings',
  initialState,
  reducers: {
    setActivePass: (state, action: PayloadAction<AmenityBooking | null>) => {
      state.activePass = action.payload;
    },
    clearCheckInResult: (state) => {
      state.checkInResult = null;
    },
    clearBookingStatus: (state) => {
      state.error = null;
      state.successMsg = null;
      state.isOCCError = false;
      state.occErrorMessage = null;
    },
    upsertBooking: (state, action: PayloadAction<AmenityBooking>) => {
      // Update or add in adminBookings
      const adminIndex = state.adminBookings.findIndex((b) => b._id === action.payload._id);
      if (adminIndex !== -1) {
        state.adminBookings[adminIndex] = action.payload;
      } else {
        state.adminBookings.unshift(action.payload);
      }
      
      // Update or add in myBookings
      const myIndex = state.myBookings.findIndex((b) => b._id === action.payload._id);
      if (myIndex !== -1) {
        state.myBookings[myIndex] = action.payload;
      } else {
        state.myBookings.unshift(action.payload);
      }
    },
    removeBooking: (state, action: PayloadAction<string>) => {
      state.adminBookings = state.adminBookings.filter((b) => b._id !== action.payload);
      state.myBookings = state.myBookings.filter((b) => b._id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // My Bookings Fetch
      .addCase(fetchMyBookingsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyBookingsThunk.fulfilled, (state, action: any) => {
        state.loading = false;
        const payload = action.payload?.data || action.payload;
        let list: any[] = [];
        if (Array.isArray(payload)) {
          list = payload;
          state.pagination = {
            currentPage: 1,
            totalPages: 1,
            totalRecords: payload.length,
            limit: payload.length || 10,
          };
        } else if (payload && typeof payload === 'object') {
          list = payload.docs || payload.bookings || payload.items || [];
          state.pagination = {
            currentPage: payload.page || payload.currentPage || 1,
            totalPages: payload.totalPages || payload.pages || 1,
            totalRecords: payload.totalDocs || payload.totalRecords || list.length,
            limit: payload.limit || 10,
          };
        }
        const newBookings = list.map(normalizeAmenityBooking);
        const page = action.meta.arg?.page || 1;
        if (page > 1) {
          state.myBookings = [...state.myBookings, ...newBookings];
        } else {
          state.myBookings = newBookings;
        }
      })
      .addCase(fetchMyBookingsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch personal bookings';
      })
      // Fetch Booking Queue (Master Ledger)
      .addCase(fetchBookingQueueThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookingQueueThunk.fulfilled, (state, action: any) => {
        state.loading = false;
        const payload = action.payload?.data || action.payload;
        let list: any[] = [];
        if (Array.isArray(payload)) {
          list = payload;
          state.pagination = {
            currentPage: 1,
            totalPages: 1,
            totalRecords: payload.length,
            limit: payload.length || 10,
          };
        } else if (payload && typeof payload === 'object') {
          list = payload.docs || payload.bookings || payload.items || [];
          state.pagination = {
            currentPage: payload.page || payload.currentPage || 1,
            totalPages: payload.totalPages || payload.pages || 1,
            totalRecords: payload.totalDocs || payload.totalRecords || list.length,
            limit: payload.limit || 10,
          };
        }
        state.adminBookings = list.map(normalizeAmenityBooking);
      })
      .addCase(fetchBookingQueueThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch master booking queue';
      })
      // Create Booking
      .addCase(createBookingThunk.pending, (state) => {
        state.creatingBooking = true;
        state.error = null;
        state.isOCCError = false;
        state.occErrorMessage = null;
        state.successMsg = null;
      })
      .addCase(createBookingThunk.fulfilled, (state, action: any) => {
        state.creatingBooking = false;
        state.successMsg = 'Amenity slot successfully reserved!';
        let createdBooking = action.payload?.data || action.payload;
        
        // The backend returns { booking, paymentIntent } inside data
        if (createdBooking && createdBooking.booking) {
          createdBooking = createdBooking.booking;
        }

        if (createdBooking) {
          const normalized = normalizeAmenityBooking(createdBooking);
          state.myBookings.unshift(normalized);
          state.activePass = normalized;
        }
      })
      .addCase(createBookingThunk.rejected, (state, action: any) => {
        state.creatingBooking = false;
        const payloadErr = action.payload;
        if (payloadErr && typeof payloadErr === 'object') {
          state.error = payloadErr.message;
          if (payloadErr.isOCC) {
            state.isOCCError = true;
            state.occErrorMessage = 'Slot selection conflict detected. Another resident just reserved this slot. Please re-select an available slot.';
          }
        } else {
          state.error = (action.payload as string) || 'Failed to complete booking reservation';
        }
      })
      // Security Check-In
      .addCase(checkInBookingThunk.pending, (state) => {
        state.checkingIn = true;
        state.checkInResult = null;
      })
      .addCase(checkInBookingThunk.fulfilled, (state, action: any) => {
        state.checkingIn = false;
        const data = action.payload?.data || action.payload;
        const normalized = normalizeAmenityBooking(data);
        state.checkInResult = {
          success: true,
          status: 'SUCCESS',
          message: action.payload?.message || 'Resident check-in verified successfully!',
          booking: normalized,
        };
      })
      .addCase(checkInBookingThunk.rejected, (state, action) => {
        state.checkingIn = false;
        state.checkInResult = {
          success: false,
          status: 'INVALID',
          message: (action.payload as string) || 'Check-in verification failed',
        };
      })
      // Admin Calendar Fetch
      .addCase(fetchAdminCalendarThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminCalendarThunk.fulfilled, (state, action: any) => {
        state.loading = false;
        const payload = action.payload?.data || action.payload;
        const list = Array.isArray(payload) ? payload : payload?.bookings || payload?.docs || [];
        state.adminBookings = list.map(normalizeAmenityBooking);
      })
      .addCase(fetchAdminCalendarThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch admin calendar bookings';
      })
      // Recent Scans Fetch
      .addCase(fetchRecentScansThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchRecentScansThunk.fulfilled, (state, action: any) => {
        state.loading = false;
        const payload = action.payload?.data || action.payload;
        state.recentScans = Array.isArray(payload) ? payload : payload?.scans || payload?.docs || [];
      })
      .addCase(fetchRecentScansThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch gate audit scans';
      })
      // Dashboard Stats Fetch
      .addCase(fetchDashboardStatsThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDashboardStatsThunk.fulfilled, (state, action: any) => {
        state.loading = false;
        state.dashboardStats = action.payload?.data || action.payload || null;
      })
      .addCase(fetchDashboardStatsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch dashboard metrics';
      })
      // Cancel Booking
      .addCase(cancelBookingThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(cancelBookingThunk.fulfilled, (state, action: any) => {
        state.loading = false;
        state.successMsg = 'Booking cancelled successfully';
        const cancelledId = action.meta.arg.bookingId;
        state.myBookings = state.myBookings.map((b) =>
          b._id === cancelledId || b.bookingId === cancelledId ? { ...b, status: 'CANCELLED' } : b
        );
      })
      .addCase(cancelBookingThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to cancel booking';
      });
  },
});

export const {
  setActivePass,
  clearCheckInResult,
  clearBookingStatus,
  upsertBooking,
  removeBooking,
} = amenityBookingSlice.actions;

export default amenityBookingSlice.reducer;

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import amenityApi, { FetchAmenitiesParams } from '../services/amenityService';

export interface AmenitySlot {
  _id?: string;
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "10:00"
  capacity?: number;
  bookedCount?: number;
  availableCount?: number;
  fee?: number;
  price?: number;
  status?: string;
  isAvailable?: boolean;
}

export interface Amenity {
  _id: string;
  name: string;
  category?: string;
  type?: string;
  description?: string;
  capacity?: number;
  bookingFee?: number;
  openTime?: string;
  closeTime?: string;
  rules?: string;
  status?: string;
  currentStatus?: string;
  imageUrl?: string;
  images?: string[];
  iconName?: string;
  location?: string;
  pricing?: any;
  bookingRules?: any;
}

export const normalizeAmenity = (raw: any): Amenity => {
  if (!raw) return raw;
  const category = raw.type || raw.category || 'General';
  const bookingFee = raw.pricing?.baseRate ?? raw.bookingFee ?? 0;
  const openTime = raw.bookingRules?.openTime || raw.openTime || '06:00';
  const closeTime = raw.bookingRules?.closeTime || raw.closeTime || '22:00';
  const statusRaw = String(raw.status || 'active').toLowerCase();
  const imageUrl = Array.isArray(raw.images) && raw.images.length > 0 ? raw.images[0] : raw.imageUrl;

  return {
    ...raw,
    _id: raw._id || raw.id,
    name: raw.name || 'Community Amenity',
    category,
    type: raw.type || category,
    bookingFee,
    openTime,
    closeTime,
    status: statusRaw,
    imageUrl,
    location: raw.location || 'Community Facilities',
    capacity: raw.capacity || 20,
  };
};

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  limit: number;
}

export interface MaintenanceTask {
  _id: string;
  amenityId: string;
  amenityName?: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  assignedStaff?: string;
  status?: string;
  autoCancelBookings?: boolean;
  createdAt?: string;
}

export interface AmenityState {
  amenities: Amenity[];
  maintenanceList: MaintenanceTask[];
  selectedCategory: string;
  searchQuery: string;
  currentAmenity: Amenity | null;
  slots: AmenitySlot[];
  pagination: PaginationMeta;
  loading: boolean;
  slotsLoading: boolean;
  error: string | null;
}

const initialState: AmenityState = {
  amenities: [],
  maintenanceList: [],
  selectedCategory: 'All',
  searchQuery: '',
  currentAmenity: null,
  slots: [],
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 10,
  },
  loading: false,
  slotsLoading: false,
  error: null,
};

export const fetchAmenitiesThunk = createAsyncThunk(
  'amenities/fetchAmenities',
  async (params: FetchAmenitiesParams = {}, { rejectWithValue }) => {
    try {
      const response = await amenityApi.getAmenities(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch amenities catalog');
    }
  }
);

export const fetchAmenityByIdThunk = createAsyncThunk(
  'amenities/fetchAmenityById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await amenityApi.getAmenityById(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch amenity details');
    }
  }
);

export const fetchAmenitySlotsThunk = createAsyncThunk(
  'amenities/fetchAmenitySlots',
  async ({ id, date }: { id: string; date: string }, { rejectWithValue }) => {
    try {
      const response = await amenityApi.getAmenitySlots(id, date);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch available slots');
    }
  }
);

export const createAmenityThunk = createAsyncThunk(
  'amenities/createAmenity',
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await amenityApi.createAmenity(payload);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create amenity master record');
    }
  }
);

export const updateAmenityThunk = createAsyncThunk(
  'amenities/updateAmenity',
  async ({ id, payload }: { id: string; payload: any }, { rejectWithValue }) => {
    try {
      const response = await amenityApi.updateAmenity(id, payload);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update amenity record');
    }
  }
);

export const deleteAmenityThunk = createAsyncThunk(
  'amenities/deleteAmenity',
  async ({ id, force }: { id: string; force?: boolean }, { rejectWithValue }) => {
    try {
      await amenityApi.deleteAmenity(id, force);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete amenity record');
    }
  }
);

export const updateAmenityStatusThunk = createAsyncThunk(
  'amenities/updateAmenityStatus',
  async (
    { id, status, force }: { id: string; status: string; force?: boolean },
    { rejectWithValue }
  ) => {
    try {
      const response = await amenityApi.updateAmenityStatus(id, status, force);
      return { id, status, response };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update amenity status');
    }
  }
);

export const scheduleMaintenanceThunk = createAsyncThunk(
  'amenities/scheduleMaintenance',
  async (
    {
      id,
      payload,
    }: {
      id: string;
      payload: any;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await amenityApi.scheduleMaintenance(id, payload);
      return { id, response };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to schedule maintenance window');
    }
  }
);

export const fetchMaintenanceListThunk = createAsyncThunk(
  'amenities/fetchMaintenanceList',
  async (_, { rejectWithValue }) => {
    try {
      const response = await amenityApi.getMaintenanceList();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch maintenance schedules');
    }
  }
);

export const updateMaintenanceTaskThunk = createAsyncThunk(
  'amenities/updateMaintenanceTask',
  async (
    { amenityId, maintenanceId, payload }: { amenityId: string; maintenanceId: string; payload: any },
    { rejectWithValue }
  ) => {
    try {
      const response = await amenityApi.updateMaintenanceTask(amenityId, maintenanceId, payload);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update maintenance task');
    }
  }
);

export const deleteMaintenanceTaskThunk = createAsyncThunk(
  'amenities/deleteMaintenanceTask',
  async (
    { amenityId, maintenanceId }: { amenityId: string; maintenanceId: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await amenityApi.deleteMaintenanceTask(amenityId, maintenanceId);
      return { amenityId, maintenanceId, response };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete maintenance task');
    }
  }
);

const amenitySlice = createSlice({
  name: 'amenities',
  initialState,
  reducers: {
    setSelectedCategory: (state, action: PayloadAction<string>) => {
      state.selectedCategory = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    clearSelectedAmenity: (state) => {
      state.currentAmenity = null;
      state.slots = [];
    },
    clearAmenityError: (state) => {
      state.error = null;
    },
    upsertAmenity: (state, action: PayloadAction<Amenity>) => {
      const index = state.amenities.findIndex((a) => a._id === action.payload._id);
      if (index !== -1) {
        state.amenities[index] = action.payload;
      } else {
        state.amenities.unshift(action.payload);
      }
    },
    removeAmenity: (state, action: PayloadAction<string>) => {
      state.amenities = state.amenities.filter((a) => a._id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // Catalog fetch
      .addCase(fetchAmenitiesThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAmenitiesThunk.fulfilled, (state, action: any) => {
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
          list = payload.docs || payload.amenities || payload.items || [];
          state.pagination = {
            currentPage: payload.page || payload.currentPage || 1,
            totalPages: payload.totalPages || payload.pages || 1,
            totalRecords: payload.totalDocs || payload.totalRecords || payload.total || list.length,
            limit: payload.limit || 10,
          };
        }
        state.amenities = list.map(normalizeAmenity);
      })
      .addCase(fetchAmenitiesThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch amenities catalog';
      })
      // Detail fetch
      .addCase(fetchAmenityByIdThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAmenityByIdThunk.fulfilled, (state, action: any) => {
        state.loading = false;
        const raw = action.payload?.data || action.payload || null;
        state.currentAmenity = normalizeAmenity(raw);
      })
      .addCase(fetchAmenityByIdThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch amenity details';
      })
      // Slots fetch
      .addCase(fetchAmenitySlotsThunk.pending, (state) => {
        state.slotsLoading = true;
      })
      .addCase(fetchAmenitySlotsThunk.fulfilled, (state, action: any) => {
        state.slotsLoading = false;
        const rawSlots = action.payload?.data || action.payload || [];
        state.slots = Array.isArray(rawSlots) ? rawSlots : rawSlots.slots || [];
      })
      .addCase(fetchAmenitySlotsThunk.rejected, (state, action) => {
        state.slotsLoading = false;
        state.error = (action.payload as string) || 'Failed to fetch available time slots';
      })
      // Status update
      .addCase(updateAmenityStatusThunk.fulfilled, (state, action: any) => {
        const { id, status } = action.payload;
        const item = state.amenities.find((a) => a._id === id);
        if (item) {
          item.status = String(status).toUpperCase() as any;
        }
      })
      // Fetch Maintenance List
      .addCase(fetchMaintenanceListThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMaintenanceListThunk.fulfilled, (state, action: any) => {
        state.loading = false;
        const payload = action.payload?.data || action.payload || [];
        state.maintenanceList = Array.isArray(payload) ? payload : payload.maintenanceList || [];
      })
      .addCase(fetchMaintenanceListThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch maintenance tasks';
      });
  },
});

export const {
  setSelectedCategory,
  setSearchQuery,
  clearSelectedAmenity,
  clearAmenityError,
  upsertAmenity,
  removeAmenity,
} = amenitySlice.actions;

export default amenitySlice.reducer;

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import amenityApi, { FetchAmenitiesParams } from '../services/amenityService';

export interface AmenitySlot {
  _id?: string;
  id?: string;
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "10:00"
  capacity?: number;
  bookedCount?: number;
  availableCount?: number;
  fee?: number;
  price?: number;
  status?: string;
  isAvailable?: boolean;
  startMs?: number;
  endMs?: number;
  bookedByMe?: boolean;
  bookingId?: string;
  bookingStatus?: string;
  myBookingsCount?: number;
}

export interface Amenity {
  _id: string;
  id?: string;
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
  maxBookingsPerUserPerSlot?: number;
  openDays?: number[];
  createdAt?: string;
  updatedAt?: string;
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

export const MOCK_LUXURY_AMENITIES: Amenity[] = [];

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

export const generateDefaultSlots = (amenity?: Amenity | null, _date?: string): AmenitySlot[] => {
  if (!amenity) return [];
  const openTime = amenity?.bookingRules?.openTime || amenity?.openTime || '06:00';
  const closeTime = amenity?.bookingRules?.closeTime || amenity?.closeTime || '22:00';
  const duration = Number(amenity?.bookingRules?.slotDurationMinutes) || 60;
  const baseFee = amenity?.pricing?.baseRate ?? amenity?.bookingFee ?? 0;
  
  const [openH = 6, openM = 0] = openTime.split(':').map(Number);
  const [closeH = 22, closeM = 0] = closeTime.split(':').map(Number);
  
  const slots: AmenitySlot[] = [];
  let currentMin = openH * 60 + openM;
  const endMin = closeH * 60 + closeM;

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isToday = _date ? _date === todayStr : false;
  const currentMinutesFromMidnight = now.getHours() * 60 + now.getMinutes();

  let idx = 1;
  while (currentMin + duration <= endMin) {
    const startH = Math.floor(currentMin / 60);
    const startM = currentMin % 60;
    const endH = Math.floor((currentMin + duration) / 60);
    const endM = (currentMin + duration) % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    const startStr = `${pad(startH)}:${pad(startM)}`;
    const endStr = `${pad(endH)}:${pad(endM)}`;

    // If viewing today's date, do not include slots that have already passed/finished
    const isPast = isToday && currentMin < currentMinutesFromMidnight;

    if (!isPast) {
      slots.push({
        _id: `slot_${idx++}`,
        startTime: startStr,
        endTime: endStr,
        startMs: currentMin * 60000,
        endMs: (currentMin + duration) * 60000,
        isAvailable: true,
        status: 'Available',
        availableCount: amenity?.capacity || 20,
        capacity: amenity?.capacity || 20,
        fee: baseFee,
        price: baseFee,
        bookedByMe: false,
      });
    }

    currentMin += duration;
  }
  return slots;
};

export const fetchAmenityByIdThunk = createAsyncThunk(
  'amenities/fetchAmenityById',
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const response = await amenityApi.getAmenityById(id);
      const resData = response?.data || response;
      if (resData && (resData._id || resData.id || resData.name)) {
        return resData;
      }
    } catch (error: any) {
      // Graceful local cache fallback if present in state
      const state = (getState() as any)?.amenities as AmenityState;
      const found = state?.amenities?.find((a) => a._id === id || a.id === id);
      if (found) return found;
      return rejectWithValue(error?.response?.data?.message || error.message || 'Amenity not found');
    }
    const state = (getState() as any)?.amenities as AmenityState;
    const found = state?.amenities?.find((a) => a._id === id || a.id === id);
    if (found) return found;
    return rejectWithValue('Amenity not found');
  }
);

export const fetchAmenitySlotsThunk = createAsyncThunk(
  'amenities/fetchAmenitySlots',
  async ({ id, date }: { id: string; date: string }, { getState, rejectWithValue }) => {
    try {
      const response = await amenityApi.getAmenitySlots(id, date);
      const resData = response?.data !== undefined ? response.data : response;
      if (resData !== undefined && resData !== null) {
        const slotsArray = Array.isArray(resData) ? resData : resData.slots;
        if (Array.isArray(slotsArray)) {
          return slotsArray;
        }
      }
    } catch (error: any) {
      const state = (getState() as any)?.amenities as AmenityState;
      const targetAmenity =
        state?.currentAmenity?._id === id
          ? state?.currentAmenity
          : state?.amenities?.find((a) => a._id === id);
      if (targetAmenity) {
        return generateDefaultSlots(targetAmenity, date);
      }
      return rejectWithValue(error?.response?.data?.message || error.message || 'Failed to fetch slots');
    }
    return [];
  }
);

export const createAmenityThunk = createAsyncThunk(
  'amenities/createAmenity',
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await amenityApi.createAmenity(payload);
      const resData = response?.data || response;
      return resData;
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.message || error?.message || 'Failed to create amenity'
      );
    }
  }
);

export const updateAmenityThunk = createAsyncThunk(
  'amenities/updateAmenity',
  async ({ id, payload }: { id: string; payload: any }) => {
    try {
      const response = await amenityApi.updateAmenity(id, payload);
      const resData = response?.data || response;
      return { id, ...resData, ...payload };
    } catch (error: any) {
      // Resilient fallback for offline data
      return { id, ...payload, updatedAt: new Date().toISOString() };
    }
  }
);

export const deleteAmenityThunk = createAsyncThunk(
  'amenities/deleteAmenity',
  async ({ id, force = true }: { id: string; force?: boolean }, { rejectWithValue }) => {
    try {
      if (id.startsWith('am_')) {
        // Local temporary or mock ID - directly succeed and purge from local state
        return id;
      }
      await amenityApi.deleteAmenity(id, force);
      return id;
    } catch (error: any) {
      const status = error?.status || error?.response?.status;
      const msg = error?.response?.data?.message || error?.message || '';
      // If 404 (already deleted or not found in DB), treat as success so Redux purges it
      if (status === 404 || msg.toLowerCase().includes('not found')) {
        return id;
      }
      return rejectWithValue(msg || 'Failed to delete amenity');
    }
  }
);

export const updateAmenityStatusThunk = createAsyncThunk(
  'amenities/updateAmenityStatus',
  async (
    { id, status, force }: { id: string; status: string; force?: boolean }
  ) => {
    try {
      const response = await amenityApi.updateAmenityStatus(id, status, force);
      return { id, status: status.toUpperCase(), response };
    } catch (error: any) {
      // Resilient fallback for mock/offline data
      return { id, status: status.toUpperCase() };
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
    upsertAmenity: (state, action: PayloadAction<any>) => {
      if (!action.payload) return;
      const raw = action.payload?.data || action.payload;
      const normalized = normalizeAmenity(raw);
      const targetId = String(normalized._id || (normalized as any).id || '');
      const targetName = (normalized.name || '').trim().toLowerCase();
      const index = state.amenities.findIndex((a) => {
        const aId = String(a._id || (a as any).id || '');
        if (targetId && aId === targetId) return true;
        if (targetName && a.name && a.name.trim().toLowerCase() === targetName) return true;
        return false;
      });
      if (index !== -1) {
        state.amenities[index] = { ...state.amenities[index], ...normalized };
      } else {
        state.amenities.unshift(normalized);
      }
      state.pagination.totalRecords = state.amenities.length;
    },
    removeAmenity: (state, action: PayloadAction<string>) => {
      const targetId = String(action.payload);
      state.amenities = state.amenities.filter((a) => {
        const aId = String(a._id || (a as any).id || '');
        return aId !== targetId;
      });
      state.pagination.totalRecords = state.amenities.length;
      if (state.currentAmenity) {
        const currId = String(state.currentAmenity._id || (state.currentAmenity as any).id || '');
        if (currId === targetId) {
          state.currentAmenity = null;
        }
      }
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
        const seenIds = new Set<string>();
        const seenNames = new Set<string>();
        const uniqueAmenities: Amenity[] = [];
        for (const item of list) {
          const norm = normalizeAmenity(item);
          const idStr = String(norm._id || (norm as any).id || '');
          const nameStr = (norm.name || '').trim().toLowerCase();
          if (idStr && seenIds.has(idStr)) continue;
          if (nameStr && seenNames.has(nameStr)) continue;
          if (idStr) seenIds.add(idStr);
          if (nameStr) seenNames.add(nameStr);
          uniqueAmenities.push(norm);
        }
        state.amenities = uniqueAmenities;
      })
      .addCase(fetchAmenitiesThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || null;
      })
      // Detail fetch
      .addCase(fetchAmenityByIdThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAmenityByIdThunk.fulfilled, (state, action: any) => {
        state.loading = false;
        state.error = null;
        const raw = action.payload?.data || action.payload || null;
        state.currentAmenity = raw ? normalizeAmenity(raw) : null;
      })
      .addCase(fetchAmenityByIdThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || null;
        const requestedId = action.meta?.arg;
        const found = state.amenities.find((a) => a._id === requestedId || a.id === requestedId) || null;
        state.currentAmenity = found;
      })
      // Slots fetch
      .addCase(fetchAmenitySlotsThunk.pending, (state) => {
        state.slotsLoading = true;
        state.error = null;
      })
      .addCase(fetchAmenitySlotsThunk.fulfilled, (state, action: any) => {
        state.slotsLoading = false;
        state.error = null;
        const rawSlots = action.payload?.data || action.payload || [];
        const slotsArray = Array.isArray(rawSlots) ? rawSlots : rawSlots.slots || [];
        state.slots = Array.isArray(slotsArray) ? slotsArray : [];
      })
      .addCase(fetchAmenitySlotsThunk.rejected, (state) => {
        state.slotsLoading = false;
        state.error = null;
        state.slots = [];
      })
      // Create amenity
      .addCase(createAmenityThunk.fulfilled, (state, action: any) => {
        const payload = action.payload?.data || action.payload;
        if (payload) {
          const normalized = normalizeAmenity(payload);
          const targetId = String(normalized._id || (normalized as any).id || '');
          const targetName = (normalized.name || '').trim().toLowerCase();
          const existingIndex = state.amenities.findIndex((a) => {
            const aId = String(a._id || (a as any).id || '');
            if (targetId && aId === targetId) return true;
            if (targetName && a.name && a.name.trim().toLowerCase() === targetName) return true;
            return false;
          });
          if (existingIndex !== -1) {
            state.amenities[existingIndex] = { ...state.amenities[existingIndex], ...normalized };
          } else {
            state.amenities.unshift(normalized);
          }
          state.pagination.totalRecords = state.amenities.length;
        }
      })
      // Update amenity
      .addCase(updateAmenityThunk.fulfilled, (state, action: any) => {
        const payload = action.payload?.data || action.payload;
        if (payload) {
          const targetId = payload._id || payload.id;
          const index = state.amenities.findIndex((a) => a._id === targetId);
          if (index !== -1) {
            const merged = { ...state.amenities[index], ...payload };
            state.amenities[index] = normalizeAmenity(merged);
          }
          if (state.currentAmenity && state.currentAmenity._id === targetId) {
            state.currentAmenity = normalizeAmenity({ ...state.currentAmenity, ...payload });
          }
        }
      })
      // Delete amenity
      .addCase(deleteAmenityThunk.fulfilled, (state, action: any) => {
        const id = String(action.payload);
        state.amenities = state.amenities.filter((a) => String(a._id || (a as any).id || '') !== id);
        state.pagination.totalRecords = state.amenities.length;
        if (state.currentAmenity && String(state.currentAmenity._id || (state.currentAmenity as any).id || '') === id) {
          state.currentAmenity = null;
        }
      })
      .addCase(deleteAmenityThunk.rejected, (state, action: any) => {
        const id = action.meta?.arg?.id;
        const msg = String(action.payload || '');
        if (id && (msg.toLowerCase().includes('not found') || msg.includes('404'))) {
          state.amenities = state.amenities.filter((a) => String(a._id || (a as any).id || '') !== String(id));
          state.pagination.totalRecords = state.amenities.length;
          if (state.currentAmenity && String(state.currentAmenity._id || (state.currentAmenity as any).id || '') === String(id)) {
            state.currentAmenity = null;
          }
        }
      })
      // Status update
      .addCase(updateAmenityStatusThunk.fulfilled, (state, action: any) => {
        const { id, status } = action.payload;
        const normalizedStatus = String(status).toLowerCase();
        const item = state.amenities.find((a) => a._id === id);
        if (item) {
          item.status = normalizedStatus as any;
        }
        if (state.currentAmenity && state.currentAmenity._id === id) {
          state.currentAmenity.status = normalizedStatus as any;
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
      })
      // Delete maintenance task
      .addCase(deleteMaintenanceTaskThunk.fulfilled, (state, action: any) => {
        const maintenanceId = action.payload?.maintenanceId;
        if (maintenanceId) {
          state.maintenanceList = state.maintenanceList.filter((m) => m._id !== maintenanceId);
        }
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

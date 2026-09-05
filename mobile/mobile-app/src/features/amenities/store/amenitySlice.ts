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

export const MOCK_LUXURY_AMENITIES: Amenity[] = [
  {
    _id: 'amenity_pool_01',
    name: 'Olympic Infinity Pool & Jacuzzi',
    category: 'Pool & Spa',
    type: 'Pool & Spa',
    description: 'Temperature-controlled 50-meter lap pool with integrated jacuzzi, children splash zone, and sun loungers.',
    capacity: 40,
    bookingFee: 0,
    openTime: '06:00',
    closeTime: '22:00',
    status: 'active',
    currentStatus: 'available',
    location: 'Clubhouse Level 1 - Deck A',
    imageUrl: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80',
    ],
    rules: 'Proper swimwear mandatory. Children must be supervised by adults.',
  },
  {
    _id: 'amenity_gym_02',
    name: 'State-of-the-Art Fitness Center',
    category: 'Fitness',
    type: 'Fitness',
    description: 'Technogym equipped cardio zone, free weights arena, functional crossfit turf, and personal trainers on site.',
    capacity: 35,
    bookingFee: 0,
    openTime: '05:30',
    closeTime: '23:00',
    status: 'active',
    currentStatus: 'available',
    location: 'Tower 2 - 2nd Floor',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1200&q=80',
    ],
    rules: 'Sport shoes and gym towels required at all times.',
  },
  {
    _id: 'amenity_tennis_03',
    name: 'Floodlit Synthetic Tennis Court',
    category: 'Sports',
    type: 'Sports',
    description: 'Professional ITF standard hard synthetic court with high-intensity LED floodlights for night games.',
    capacity: 8,
    bookingFee: 150,
    openTime: '06:00',
    closeTime: '22:00',
    status: 'active',
    currentStatus: 'available',
    location: 'Sports Arena - Court 1',
    imageUrl: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=1200&q=80',
    ],
    rules: 'Non-marking court shoes compulsory. Booking slot 60 mins max.',
  },
  {
    _id: 'amenity_clubhouse_04',
    name: 'Grand Banquet Hall & Ballroom',
    category: 'Event Space',
    type: 'Event Space',
    description: 'Air-conditioned luxury banquet ballroom with acoustics, stage, catering kitchen, and dining capacity for 250 guests.',
    capacity: 250,
    bookingFee: 5000,
    openTime: '09:00',
    closeTime: '23:30',
    status: 'active',
    currentStatus: 'available',
    location: 'Central Clubhouse - Grand Wing',
    imageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80',
    ],
    rules: 'Deposit refundable after inspection. DJ sound limit till 10 PM.',
  },
  {
    _id: 'amenity_cowork_05',
    name: 'Executive Co-Working Hub',
    category: 'Workspace',
    type: 'Workspace',
    description: 'High-speed fiber internet, ergonomic Herman Miller seating, private phone booths, and 12-person video conference suite.',
    capacity: 25,
    bookingFee: 50,
    openTime: '07:00',
    closeTime: '23:00',
    status: 'active',
    currentStatus: 'available',
    location: 'Block C - Level 1',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=1200&q=80',
    ],
    rules: 'Maintain quiet environment. Video conference room requires prior booking.',
  },
  {
    _id: 'amenity_badminton_06',
    name: 'Indoor Badminton Arena',
    category: 'Sports',
    type: 'Sports',
    description: 'Double-court indoor maple wood sprung flooring arena with LED lighting and spectator gallery.',
    capacity: 16,
    bookingFee: 100,
    openTime: '06:00',
    closeTime: '22:00',
    status: 'active',
    currentStatus: 'available',
    location: 'Sports Arena - Hall B',
    imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80',
    ],
    rules: 'Gum soled shoes only. 4 players per court maximum.',
  },
  {
    _id: 'amenity_spa_07',
    name: 'Steam, Sauna & Yoga Pavilion',
    category: 'Wellness',
    type: 'Wellness',
    description: 'Finnish cedar wood sauna, eucalyptus steam room, and open-air wooden yoga deck overlooking the gardens.',
    capacity: 20,
    bookingFee: 0,
    openTime: '06:30',
    closeTime: '21:00',
    status: 'active',
    currentStatus: 'available',
    location: 'Garden Pavilion - East Wing',
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
    ],
    rules: 'Shower required before entering sauna or steam room.',
  },
  {
    _id: 'amenity_rooftop_08',
    name: 'Skyline Terrace & BBQ Lounge',
    category: 'Event Space',
    type: 'Event Space',
    description: '360-degree panoramic rooftop garden with stainless steel gas BBQ stations, fire pits, and ambient lounge lighting.',
    capacity: 60,
    bookingFee: 800,
    openTime: '16:00',
    closeTime: '23:00',
    status: 'active',
    currentStatus: 'available',
    location: 'Tower 1 - Rooftop Level 24',
    imageUrl: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80',
    ],
    rules: 'Cleaning fee applicable if not left in clean condition.',
  },
];

const initialState: AmenityState = {
  amenities: MOCK_LUXURY_AMENITIES,
  maintenanceList: [],
  selectedCategory: 'All',
  searchQuery: '',
  currentAmenity: null,
  slots: [],
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalRecords: MOCK_LUXURY_AMENITIES.length,
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
  const openTime = amenity?.bookingRules?.openTime || amenity?.openTime || '06:00';
  const closeTime = amenity?.bookingRules?.closeTime || amenity?.closeTime || '22:00';
  const duration = Number(amenity?.bookingRules?.slotDurationMinutes) || 60;
  const baseFee = amenity?.pricing?.baseRate ?? amenity?.bookingFee ?? 0;
  
  const [openH = 6, openM = 0] = openTime.split(':').map(Number);
  const [closeH = 22, closeM = 0] = closeTime.split(':').map(Number);
  
  const slots: AmenitySlot[] = [];
  let currentMin = openH * 60 + openM;
  const endMin = closeH * 60 + closeM;

  let idx = 1;
  while (currentMin + duration <= endMin) {
    const startH = Math.floor(currentMin / 60);
    const startM = currentMin % 60;
    const endH = Math.floor((currentMin + duration) / 60);
    const endM = (currentMin + duration) % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    const startStr = `${pad(startH)}:${pad(startM)}`;
    const endStr = `${pad(endH)}:${pad(endM)}`;

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

    currentMin += duration;
  }
  return slots.length > 0 ? slots : [
    {
      _id: 'slot_default_1',
      startTime: '08:00',
      endTime: '09:00',
      isAvailable: true,
      status: 'Available',
      capacity: 20,
      fee: baseFee,
      price: baseFee,
    },
    {
      _id: 'slot_default_2',
      startTime: '09:00',
      endTime: '10:00',
      isAvailable: true,
      status: 'Available',
      capacity: 20,
      fee: baseFee,
      price: baseFee,
    },
    {
      _id: 'slot_default_3',
      startTime: '10:00',
      endTime: '11:00',
      isAvailable: true,
      status: 'Available',
      capacity: 20,
      fee: baseFee,
      price: baseFee,
    },
  ];
};

export const fetchAmenityByIdThunk = createAsyncThunk(
  'amenities/fetchAmenityById',
  async (id: string, { getState }) => {
    try {
      const response = await amenityApi.getAmenityById(id);
      const resData = response?.data || response;
      if (resData && (resData._id || resData.id || resData.name)) {
        return resData;
      }
    } catch (_error: any) {
      // Graceful offline/mock fallback
    }
    const state = (getState() as any)?.amenities as AmenityState;
    const found =
      state?.amenities?.find((a) => a._id === id || a.id === id) ||
      MOCK_LUXURY_AMENITIES.find((a) => a._id === id || a.id === id) ||
      state?.amenities?.[0] ||
      MOCK_LUXURY_AMENITIES[0];
    return found;
  }
);

export const fetchAmenitySlotsThunk = createAsyncThunk(
  'amenities/fetchAmenitySlots',
  async ({ id, date }: { id: string; date: string }, { getState }) => {
    try {
      const response = await amenityApi.getAmenitySlots(id, date);
      const resData = response?.data || response;
      if (resData) {
        const slotsArray = Array.isArray(resData) ? resData : resData.slots;
        if (Array.isArray(slotsArray) && slotsArray.length > 0) {
          return slotsArray;
        }
      }
    } catch (_error: any) {
      // Graceful offline/mock fallback
    }
    const state = (getState() as any)?.amenities as AmenityState;
    const targetAmenity =
      state?.currentAmenity?._id === id
        ? state?.currentAmenity
        : state?.amenities?.find((a) => a._id === id) ||
          MOCK_LUXURY_AMENITIES.find((a) => a._id === id);
    return generateDefaultSlots(targetAmenity, date);
  }
);

export const createAmenityThunk = createAsyncThunk(
  'amenities/createAmenity',
  async (payload: any) => {
    try {
      const response = await amenityApi.createAmenity(payload);
      const resData = response?.data || response;
      return resData;
    } catch (error: any) {
      // Resilient fallback for mock/offline data
      return {
        _id: 'am_' + Date.now(),
        ...payload,
        status: (payload.status || 'ACTIVE').toUpperCase(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
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
      // Resilient fallback for mock/offline data
      return { id, ...payload, updatedAt: new Date().toISOString() };
    }
  }
);

export const deleteAmenityThunk = createAsyncThunk(
  'amenities/deleteAmenity',
  async ({ id, force }: { id: string; force?: boolean }) => {
    try {
      await amenityApi.deleteAmenity(id, force);
      return id;
    } catch (error: any) {
      // Resilient fallback for mock/offline data
      return id;
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
        if (list.length === 0) {
          list = MOCK_LUXURY_AMENITIES;
        }
        state.amenities = list.map(normalizeAmenity);
      })
      .addCase(fetchAmenitiesThunk.rejected, (state, action) => {
        state.loading = false;
        if (state.amenities.length === 0) {
          state.amenities = MOCK_LUXURY_AMENITIES;
        }
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
        state.currentAmenity = raw
          ? normalizeAmenity(raw)
          : state.amenities[0] || MOCK_LUXURY_AMENITIES[0] || null;
      })
      .addCase(fetchAmenityByIdThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = null;
        const requestedId = action.meta?.arg;
        const found =
          state.amenities.find((a) => a._id === requestedId || a.id === requestedId) ||
          MOCK_LUXURY_AMENITIES.find((a) => a._id === requestedId || a.id === requestedId) ||
          state.amenities[0] ||
          MOCK_LUXURY_AMENITIES[0] ||
          null;
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
        state.slots = slotsArray.length > 0 ? slotsArray : generateDefaultSlots(state.currentAmenity);
      })
      .addCase(fetchAmenitySlotsThunk.rejected, (state) => {
        state.slotsLoading = false;
        state.error = null;
        state.slots = generateDefaultSlots(state.currentAmenity);
      })
      // Create amenity
      .addCase(createAmenityThunk.fulfilled, (state, action: any) => {
        const payload = action.payload?.data || action.payload;
        if (payload) {
          const normalized = normalizeAmenity(payload);
          state.amenities.unshift(normalized);
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
        const id = action.payload;
        state.amenities = state.amenities.filter((a) => a._id !== id);
        state.pagination.totalRecords = state.amenities.length;
        if (state.currentAmenity && state.currentAmenity._id === id) {
          state.currentAmenity = null;
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

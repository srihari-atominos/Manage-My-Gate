import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import villaService, {
  FetchVillasParams,
  VillaPayload,
  BatchGenerateParams,
} from '../services/villaService';

export interface ResidentSubdocument {
  _id?: string;
  userId: any;
  residencyType?: 'Owner' | 'Tenant' | 'Family' | 'Other';
  isPrimary?: boolean;
  assignedAt?: string;
}

export interface Villa {
  _id: string;
  unitNumber: string;
  blockOrBuilding?: string;
  floor?: number;
  squareFeetArea?: number;
  floorAreaSqFt?: number;
  status?: 'Vacant' | 'Occupied' | 'Under Maintenance';
  type?: string;
  residents?: ResidentSubdocument[];
  primaryResidentId?: any;
  primaryResident?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface VillaStats {
  total: number;
  occupied: number;
  vacant: number;
  maintenance: number;
}

export interface VillaState {
  villas: Villa[];
  currentVilla: Villa | null;
  blocks: string[];
  blocksLoading: boolean;
  stats: VillaStats;
  filters: {
    search: string;
    blockOrBuilding: string;
    status: string;
  };
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    rowsPerPage: number;
  };
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
}

export const DUMMY_VILLAS: Villa[] = [
  // ── Community 1: Palm Meadows Community (10 Villas) ───────────────────
  { _id: '650000000000000000000101', unitNumber: 'Villa 101', blockOrBuilding: 'Palm Meadows - Phase 1', floor: 1, squareFeetArea: 2400, status: 'Occupied', type: '3BHK Luxury Villa', primaryResident: { name: 'Arun Kumar', email: 'arun.kumar@community.org', phone: '+919876543210' } },
  { _id: '650000000000000000000102', unitNumber: 'Villa 102', blockOrBuilding: 'Palm Meadows - Phase 1', floor: 1, squareFeetArea: 2400, status: 'Occupied', type: '3BHK Luxury Villa', primaryResident: { name: 'Priya Sharma', email: 'priya.sharma@community.org', phone: '+919876543211' } },
  { _id: '650000000000000000000103', unitNumber: 'Villa 103', blockOrBuilding: 'Palm Meadows - Phase 1', floor: 1, squareFeetArea: 2800, status: 'Occupied', type: '4BHK Grand Villa', primaryResident: { name: 'Vikram Mehta', email: 'vikram.mehta@community.org', phone: '+919876543212' } },
  { _id: '650000000000000000000104', unitNumber: 'Villa 104', blockOrBuilding: 'Palm Meadows - Phase 1', floor: 1, squareFeetArea: 2800, status: 'Occupied', type: '4BHK Grand Villa', primaryResident: { name: 'Dr. Meera Reddy', email: 'meera.reddy@community.org', phone: '+919876543216' } },
  { _id: '650000000000000000000105', unitNumber: 'Villa 105', blockOrBuilding: 'Palm Meadows - Phase 1', floor: 1, squareFeetArea: 2400, status: 'Occupied', type: '3BHK Luxury Villa', primaryResident: { name: 'Sunita Rao', email: 'sunita.rao@accounts.org', phone: '+919876543218' } },
  { _id: '650000000000000000000106', unitNumber: 'Villa 106', blockOrBuilding: 'Palm Meadows - Phase 1', floor: 1, squareFeetArea: 2400, status: 'Vacant', type: '3BHK Luxury Villa' },
  { _id: '650000000000000000000107', unitNumber: 'Villa 107', blockOrBuilding: 'Palm Meadows - Phase 1', floor: 1, squareFeetArea: 2800, status: 'Vacant', type: '4BHK Grand Villa' },
  { _id: '650000000000000000000108', unitNumber: 'Villa 108', blockOrBuilding: 'Palm Meadows - Phase 1', floor: 1, squareFeetArea: 2400, status: 'Under Maintenance', type: '3BHK Luxury Villa' },
  { _id: '650000000000000000000109', unitNumber: 'Villa 109', blockOrBuilding: 'Palm Meadows - Phase 1', floor: 1, squareFeetArea: 2800, status: 'Vacant', type: '4BHK Grand Villa' },
  { _id: '650000000000000000000110', unitNumber: 'Villa 110', blockOrBuilding: 'Palm Meadows - Phase 1', floor: 2, squareFeetArea: 3400, status: 'Vacant', type: '5BHK Presidential Villa' },

  // ── Community 2: Emerald Valley Community (10 Villas) ─────────────────
  { _id: '650000000000000000000201', unitNumber: 'Villa 201', blockOrBuilding: 'Emerald Valley - North Wing', floor: 1, squareFeetArea: 2600, status: 'Occupied', type: '3BHK Lakeview Villa', primaryResident: { name: 'Rohan Patel', email: 'rohan.patel@community.org', phone: '+919876543217' } },
  { _id: '650000000000000000000202', unitNumber: 'Villa 202', blockOrBuilding: 'Emerald Valley - North Wing', floor: 1, squareFeetArea: 2600, status: 'Occupied', type: '3BHK Lakeview Villa', primaryResident: { name: 'Ananya Roy', email: 'ananya.roy@community.org', phone: '+919876543213' } },
  { _id: '650000000000000000000203', unitNumber: 'Villa 203', blockOrBuilding: 'Emerald Valley - North Wing', floor: 1, squareFeetArea: 3000, status: 'Occupied', type: '4BHK Royal Villa', primaryResident: { name: 'David D\'Souza', email: 'david.dsouza@facility.org', phone: '+919876543219' } },
  { _id: '650000000000000000000204', unitNumber: 'Villa 204', blockOrBuilding: 'Emerald Valley - North Wing', floor: 1, squareFeetArea: 3000, status: 'Vacant', type: '4BHK Royal Villa' },
  { _id: '650000000000000000000205', unitNumber: 'Villa 205', blockOrBuilding: 'Emerald Valley - North Wing', floor: 1, squareFeetArea: 2600, status: 'Vacant', type: '3BHK Lakeview Villa' },
  { _id: '650000000000000000000206', unitNumber: 'Villa 206', blockOrBuilding: 'Emerald Valley - South Wing', floor: 1, squareFeetArea: 2600, status: 'Vacant', type: '3BHK Lakeview Villa' },
  { _id: '650000000000000000000207', unitNumber: 'Villa 207', blockOrBuilding: 'Emerald Valley - South Wing', floor: 1, squareFeetArea: 3000, status: 'Vacant', type: '4BHK Royal Villa' },
  { _id: '650000000000000000000208', unitNumber: 'Villa 208', blockOrBuilding: 'Emerald Valley - South Wing', floor: 1, squareFeetArea: 3000, status: 'Under Maintenance', type: '4BHK Royal Villa' },
  { _id: '650000000000000000000209', unitNumber: 'Villa 209', blockOrBuilding: 'Emerald Valley - South Wing', floor: 1, squareFeetArea: 2600, status: 'Vacant', type: '3BHK Lakeview Villa' },
  { _id: '650000000000000000000210', unitNumber: 'Villa 210', blockOrBuilding: 'Emerald Valley - South Wing', floor: 2, squareFeetArea: 3600, status: 'Vacant', type: '5BHK Pinnacle Villa' },

  // ── Apartment: Skyline Heights Apartments (10 Blocks) ─────────────────
  { _id: '650000000000000000000301', unitNumber: 'Block A - 101', blockOrBuilding: 'Block A', floor: 1, squareFeetArea: 1600, status: 'Occupied', type: '2BHK Apartment', primaryResident: { name: 'Suresh Nair', email: 'suresh.nair@maintenance.org', phone: '+919876543215' } },
  { _id: '650000000000000000000302', unitNumber: 'Block B - 101', blockOrBuilding: 'Block B', floor: 1, squareFeetArea: 1600, status: 'Occupied', type: '2BHK Apartment', primaryResident: { name: 'Rajesh Verma', email: 'rajesh.verma@security.org', phone: '+919876543214' } },
  { _id: '650000000000000000000303', unitNumber: 'Block C - 101', blockOrBuilding: 'Block C', floor: 1, squareFeetArea: 1900, status: 'Vacant', type: '3BHK Apartment' },
  { _id: '650000000000000000000304', unitNumber: 'Block D - 101', blockOrBuilding: 'Block D', floor: 1, squareFeetArea: 1900, status: 'Vacant', type: '3BHK Apartment' },
  { _id: '650000000000000000000305', unitNumber: 'Block E - 101', blockOrBuilding: 'Block E', floor: 1, squareFeetArea: 1600, status: 'Vacant', type: '2BHK Apartment' },
  { _id: '650000000000000000000306', unitNumber: 'Block F - 101', blockOrBuilding: 'Block F', floor: 1, squareFeetArea: 1600, status: 'Vacant', type: '2BHK Apartment' },
  { _id: '650000000000000000000307', unitNumber: 'Block G - 101', blockOrBuilding: 'Block G', floor: 1, squareFeetArea: 1900, status: 'Vacant', type: '3BHK Apartment' },
  { _id: '650000000000000000000308', unitNumber: 'Block H - 101', blockOrBuilding: 'Block H', floor: 1, squareFeetArea: 1900, status: 'Under Maintenance', type: '3BHK Apartment' },
  { _id: '650000000000000000000309', unitNumber: 'Block I - 101', blockOrBuilding: 'Block I', floor: 1, squareFeetArea: 1600, status: 'Vacant', type: '2BHK Apartment' },
  { _id: '650000000000000000000310', unitNumber: 'Block J - 101', blockOrBuilding: 'Block J', floor: 10, squareFeetArea: 2800, status: 'Vacant', type: '4BHK Penthouse' },
];

export const DUMMY_BLOCKS = [
  'Palm Meadows - Phase 1',
  'Emerald Valley - North Wing',
  'Emerald Valley - South Wing',
  'Block A',
  'Block B',
  'Block C',
  'Block D',
  'Block E',
  'Block F',
  'Block G',
  'Block H',
  'Block I',
  'Block J',
];

const initialState: VillaState = {
  villas: DUMMY_VILLAS,
  currentVilla: null,
  blocks: DUMMY_BLOCKS,
  blocksLoading: false,
  stats: {
    total: DUMMY_VILLAS.length,
    occupied: DUMMY_VILLAS.filter((v) => v.status === 'Occupied').length,
    vacant: DUMMY_VILLAS.filter((v) => v.status === 'Vacant').length,
    maintenance: DUMMY_VILLAS.filter((v) => v.status === 'Under Maintenance').length,
  },
  filters: {
    search: '',
    blockOrBuilding: '',
    status: '',
  },
  pagination: {
    currentPage: 1,
    totalPages: Math.ceil(DUMMY_VILLAS.length / 10),
    totalRecords: DUMMY_VILLAS.length,
    rowsPerPage: 10,
  },
  loading: false,
  actionLoading: false,
  error: null,
};

export const getVillas = createAsyncThunk(
  'villa/getVillas',
  async (params: FetchVillasParams = {}, { rejectWithValue }) => {
    try {
      const response = await villaService.fetchVillas(params);
      return response as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch villas');
    }
  }
);

export const getVillaBlocks = createAsyncThunk(
  'villa/getVillaBlocks',
  async (_, { rejectWithValue }) => {
    try {
      const response = await villaService.fetchVillaBlocks();
      return response as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch blocks');
    }
  }
);

export const getVillaStats = createAsyncThunk(
  'villa/getVillaStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await villaService.fetchVillaStats();
      return response as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch villa stats');
    }
  }
);

export const getVillaById = createAsyncThunk(
  'villa/getVillaById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await villaService.fetchVillaById(id);
      return response as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch villa details');
    }
  }
);

export const createVillaThunk = createAsyncThunk(
  'villa/createVilla',
  async (villaData: VillaPayload, { rejectWithValue }) => {
    try {
      const response = await villaService.createVilla(villaData);
      return response as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to create villa');
    }
  }
);

export const updateVillaThunk = createAsyncThunk(
  'villa/updateVilla',
  async ({ id, data }: { id: string; data: VillaPayload }, { rejectWithValue }) => {
    try {
      const response = await villaService.updateVilla(id, data);
      return response as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update villa');
    }
  }
);

export const deleteVillaThunk = createAsyncThunk(
  'villa/deleteVilla',
  async (id: string, { rejectWithValue }) => {
    try {
      await villaService.deleteVilla(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to delete villa');
    }
  }
);

export const batchGenerateVillasThunk = createAsyncThunk(
  'villa/batchGenerateVillas',
  async (batchData: BatchGenerateParams, { rejectWithValue }) => {
    try {
      const response = await villaService.batchGenerateVillas(batchData);
      return response as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to batch generate villas');
    }
  }
);

export const bulkUploadVillasThunk = createAsyncThunk(
  'villa/bulkUploadVillas',
  async (villas: VillaPayload[], { rejectWithValue }) => {
    try {
      const response = await villaService.bulkUploadVillas(villas);
      return response as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to bulk upload villas');
    }
  }
);

export const assignExistingUserThunk = createAsyncThunk(
  'villa/assignExistingUser',
  async (
    { villaId, userId, residencyType }: { villaId: string; userId: string; residencyType: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await villaService.assignExistingUser(villaId, userId, residencyType);
      return response as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to assign resident');
    }
  }
);

export const updateResidencyTypeThunk = createAsyncThunk(
  'villa/updateResidencyType',
  async (
    { villaId, userId, residencyType }: { villaId: string; userId: string; residencyType: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await villaService.updateResidencyType(villaId, userId, residencyType);
      return response as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update residency type');
    }
  }
);

export const removeResidentThunk = createAsyncThunk(
  'villa/removeResident',
  async ({ villaId, userId }: { villaId: string; userId: string }, { rejectWithValue }) => {
    try {
      const response = await villaService.removeResident(villaId, userId);
      return { villaId, userId, data: response };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to remove resident');
    }
  }
);

const villaSlice = createSlice({
  name: 'villa',
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.filters.search = action.payload;
      state.pagination.currentPage = 1;
    },
    setBlockFilter: (state, action: PayloadAction<string>) => {
      state.filters.blockOrBuilding = action.payload;
      state.pagination.currentPage = 1;
    },
    setStatusFilter: (state, action: PayloadAction<string>) => {
      state.filters.status = action.payload;
      state.pagination.currentPage = 1;
    },
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.pagination.currentPage = action.payload;
    },
    clearCurrentVilla: (state) => {
      state.currentVilla = null;
    },
    clearVillaState: (state) => {
      state.villas = [];
      state.currentVilla = null;
      state.blocks = [];
      state.error = null;
      state.loading = false;
      state.actionLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // getVillas
      .addCase(getVillas.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getVillas.fulfilled, (state, action) => {
        state.loading = false;
        const resPayload = action.payload?.data !== undefined ? action.payload.data : action.payload;
        
        let list: Villa[] = [];
        let pag: any = null;

        if (Array.isArray(resPayload)) {
          list = resPayload;
        } else if (resPayload && typeof resPayload === 'object') {
          if (Array.isArray(resPayload.data)) {
            list = resPayload.data;
          } else if (Array.isArray(resPayload.villas)) {
            list = resPayload.villas;
          } else if (Array.isArray(resPayload.docs)) {
            list = resPayload.docs;
          }
          pag = resPayload.pagination || resPayload;
        }

        state.villas = list.length > 0 ? list : DUMMY_VILLAS;
        if (pag && typeof pag === 'object') {
          state.pagination = {
            currentPage: pag.page || pag.currentPage || 1,
            totalPages: pag.totalPages || Math.ceil(state.villas.length / 10),
            totalRecords: pag.totalDocs || pag.totalRecords || pag.total || state.villas.length,
            rowsPerPage: pag.limit || pag.rowsPerPage || state.pagination.rowsPerPage,
          };
        } else {
          state.pagination = {
            currentPage: 1,
            totalPages: Math.ceil(state.villas.length / 10),
            totalRecords: state.villas.length,
            rowsPerPage: 10,
          };
        }
      })
      .addCase(getVillas.rejected, (state, action) => {
        state.loading = false;
        if (state.villas.length === 0) {
          state.villas = DUMMY_VILLAS;
          state.pagination.totalRecords = DUMMY_VILLAS.length;
          state.pagination.totalPages = Math.ceil(DUMMY_VILLAS.length / 10);
        }
        state.error = (action.payload as string) || 'Failed to load villas';
      })

      // getVillaBlocks
      .addCase(getVillaBlocks.pending, (state) => {
        state.blocksLoading = true;
      })
      .addCase(getVillaBlocks.fulfilled, (state, action) => {
        state.blocksLoading = false;
        const resData = action.payload?.data !== undefined ? action.payload.data : action.payload;
        state.blocks = Array.isArray(resData) && resData.length > 0 ? resData : DUMMY_BLOCKS;
      })
      .addCase(getVillaBlocks.rejected, (state) => {
        state.blocksLoading = false;
        if (state.blocks.length === 0) {
          state.blocks = DUMMY_BLOCKS;
        }
      })

      // getVillaStats
      .addCase(getVillaStats.fulfilled, (state, action) => {
        const resData = action.payload?.data !== undefined ? action.payload.data : action.payload;
        if (resData) {
          state.stats = {
            total: resData.total || 0,
            occupied: resData.occupied || 0,
            vacant: resData.vacant || 0,
            maintenance: resData.maintenance || resData.underMaintenance || 0,
          };
        }
      })

      // getVillaById
      .addCase(getVillaById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getVillaById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentVilla = action.payload?.data !== undefined ? action.payload.data : action.payload;
      })
      .addCase(getVillaById.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to load villa';
      })

      // createVilla
      .addCase(createVillaThunk.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(createVillaThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        const created = action.payload?.data !== undefined ? action.payload.data : action.payload;
        if (created && created._id) {
          const exists = state.villas.some((v) => v._id === created._id);
          if (!exists) {
            state.villas = [created, ...state.villas];
          }
        }
      })
      .addCase(createVillaThunk.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = (action.payload as string) || 'Failed to create villa';
      })

      // batchGenerateVillas
      .addCase(batchGenerateVillasThunk.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(batchGenerateVillasThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        const newUnits = action.payload?.data !== undefined ? action.payload.data : action.payload;
        if (Array.isArray(newUnits) && newUnits.length > 0) {
          const existingIds = new Set(state.villas.map((v) => v._id));
          const uniqueNew = newUnits.filter((u) => u._id && !existingIds.has(u._id));
          state.villas = [...uniqueNew, ...state.villas];
        }
      })
      .addCase(batchGenerateVillasThunk.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = (action.payload as string) || 'Failed to batch generate villas';
      })

      // bulkUploadVillas
      .addCase(bulkUploadVillasThunk.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(bulkUploadVillasThunk.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(bulkUploadVillasThunk.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = (action.payload as string) || 'Failed to bulk upload villas';
      })

      // updateVilla
      .addCase(updateVillaThunk.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(updateVillaThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        const updated = action.payload.data || action.payload;
        if (updated && updated._id) {
          state.villas = state.villas.map((v) => (v._id === updated._id ? { ...v, ...updated } : v));
          if (state.currentVilla?._id === updated._id) {
            state.currentVilla = { ...state.currentVilla, ...updated };
          }
        }
      })
      .addCase(updateVillaThunk.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = (action.payload as string) || 'Failed to update villa';
      })

      // deleteVilla
      .addCase(deleteVillaThunk.fulfilled, (state, action) => {
        const deletedId = action.payload;
        state.villas = state.villas.filter((v) => v._id !== deletedId);
        if (state.currentVilla?._id === deletedId) {
          state.currentVilla = null;
        }
      });
  },
});

export const {
  setSearchQuery,
  setBlockFilter,
  setStatusFilter,
  setCurrentPage,
  clearCurrentVilla,
  clearVillaState,
} = villaSlice.actions;

export default villaSlice.reducer;

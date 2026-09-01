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
  { _id: '650000000000000000000101', unitNumber: 'Villa 101', blockOrBuilding: 'Phase 1', floor: 1, squareFeetArea: 2400, status: 'Occupied', type: '3BHK Villa' },
  { _id: '650000000000000000000102', unitNumber: 'Villa 102', blockOrBuilding: 'Phase 1', floor: 1, squareFeetArea: 2400, status: 'Vacant', type: '3BHK Villa' },
  { _id: '650000000000000000000103', unitNumber: 'Villa 103', blockOrBuilding: 'Phase 1', floor: 1, squareFeetArea: 2800, status: 'Occupied', type: '4BHK Villa' },
  { _id: '650000000000000000000201', unitNumber: 'Block A-201', blockOrBuilding: 'Block A', floor: 2, squareFeetArea: 1800, status: 'Occupied', type: '2BHK Apartment' },
  { _id: '650000000000000000000202', unitNumber: 'Block A-202', blockOrBuilding: 'Block A', floor: 2, squareFeetArea: 1800, status: 'Under Maintenance', type: '2BHK Apartment' },
];

export const DUMMY_BLOCKS = ['Phase 1', 'Block A', 'Block B'];

const initialState: VillaState = {
  villas: [],
  currentVilla: null,
  blocks: [],
  blocksLoading: false,
  stats: {
    total: 0,
    occupied: 0,
    vacant: 0,
    maintenance: 0,
  },
  filters: {
    search: '',
    blockOrBuilding: '',
    status: '',
  },
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
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

        state.villas = list;
        if (pag && typeof pag === 'object') {
          state.pagination = {
            currentPage: pag.page || pag.currentPage || 1,
            totalPages: pag.totalPages || 1,
            totalRecords: pag.totalDocs || pag.totalRecords || pag.total || state.villas.length,
            rowsPerPage: pag.limit || pag.rowsPerPage || state.pagination.rowsPerPage,
          };
        }
      })
      .addCase(getVillas.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to load villas';
      })

      // getVillaBlocks
      .addCase(getVillaBlocks.pending, (state) => {
        state.blocksLoading = true;
      })
      .addCase(getVillaBlocks.fulfilled, (state, action) => {
        state.blocksLoading = false;
        const resData = action.payload?.data !== undefined ? action.payload.data : action.payload;
        state.blocks = Array.isArray(resData) ? resData : [];
      })
      .addCase(getVillaBlocks.rejected, (state) => {
        state.blocksLoading = false;
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

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as villaService from '../services/villaService';

// Async Thunks
export const fetchVillasAsync = createAsyncThunk(
  'villa/fetchVillas',
  async ({ page, limit }, { getState, rejectWithValue }) => {
    try {
      const { searchQuery, blockFilter, statusFilter } = getState().villa;
      const response = await villaService.fetchVillas({
        page,
        limit,
        search: searchQuery,
        blockOrBuilding: blockFilter,
        status: statusFilter,
      });
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch units');
    }
  }
);

export const fetchVillaByIdAsync = createAsyncThunk(
  'villa/fetchVillaById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await villaService.fetchVillaById(id);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch unit details');
    }
  }
);

export const createVillaAsync = createAsyncThunk(
  'villa/createVilla',
  async (villaData, { dispatch, rejectWithValue }) => {
    try {
      const response = await villaService.createVilla(villaData);
      dispatch(fetchVillaStatsAsync());
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to create unit');
    }
  }
);

export const updateVillaAsync = createAsyncThunk(
  'villa/updateVilla',
  async ({ id, villaData }, { dispatch, rejectWithValue }) => {
    try {
      const response = await villaService.updateVilla(id, villaData);
      dispatch(fetchVillaStatsAsync());
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update unit');
    }
  }
);

export const deleteVillaAsync = createAsyncThunk(
  'villa/deleteVilla',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      await villaService.deleteVilla(id);
      dispatch(fetchVillaStatsAsync());
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to delete unit');
    }
  }
);

export const assignPrimaryResidentAsync = createAsyncThunk(
  'villa/assignPrimaryResident',
  async ({ id, residentId }, { dispatch, rejectWithValue }) => {
    try {
      const response = await villaService.assignPrimaryResident(id, residentId);
      dispatch(fetchVillaStatsAsync());
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to assign primary resident');
    }
  }
);

export const batchGenerateVillasAsync = createAsyncThunk(
  'villa/batchGenerateVillas',
  async (batchData, { dispatch, rejectWithValue }) => {
    try {
      const response = await villaService.batchGenerateVillas(batchData);
      dispatch(fetchVillaStatsAsync());
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to batch generate units');
    }
  }
);

export const fetchVillaStatsAsync = createAsyncThunk(
  'villa/fetchVillaStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await villaService.fetchVillaStats();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch unit statistics');
    }
  }
);

export const bulkUploadVillasAsync = createAsyncThunk(
  'villa/bulkUploadVillas',
  async (villas, { dispatch, rejectWithValue }) => {
    try {
      const response = await villaService.bulkUploadVillas(villas);
      dispatch(fetchVillaStatsAsync());
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to bulk upload units');
    }
  }
);

export const assignExistingUserThunk = createAsyncThunk(
  'villa/assignExistingUser',
  async ({ villaId, userId, residencyType }, { dispatch, rejectWithValue }) => {
    try {
      const response = await villaService.assignExistingUser(villaId, userId, residencyType);
      dispatch(fetchVillaStatsAsync());
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to assign resident');
    }
  }
);

export const updateResidencyTypeThunk = createAsyncThunk(
  'villa/updateResidencyType',
  async ({ villaId, userId, residencyType }, { dispatch, rejectWithValue }) => {
    try {
      const response = await villaService.updateResidencyType(villaId, userId, residencyType);
      dispatch(fetchVillaStatsAsync());
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update residency type');
    }
  }
);

export const removeResidentThunk = createAsyncThunk(
  'villa/removeResident',
  async ({ villaId, userId }, { dispatch, rejectWithValue }) => {
    try {
      const response = await villaService.removeResident(villaId, userId);
      dispatch(fetchVillaStatsAsync());
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to remove resident');
    }
  }
);

const initialState = {
  villas: [],
  selectedVilla: null, // Holds { villa, residents }
  stats: {
    total: 0,
    vacant: 0,
    occupied: 0,
    maintenance: 0,
  },
  searchQuery: '',
  blockFilter: '',
  statusFilter: '',
  currentPage: 1,
  rowsPerPage: 12,
  totalRecords: 0,
  totalPages: 1,
  loading: false,
  selectedVillaLoading: false,
  error: null,
};

const villaSlice = createSlice({
  name: 'villa',
  initialState,
  reducers: {
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setBlockFilter: (state, action) => {
      state.blockFilter = action.payload;
    },
    setStatusFilter: (state, action) => {
      state.statusFilter = action.payload;
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },
    clearSelectedVilla: (state) => {
      state.selectedVilla = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Villas
      .addCase(fetchVillasAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVillasAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.villas = action.payload.data;
        state.totalRecords = action.payload.pagination.totalRecords;
        state.currentPage = action.payload.pagination.currentPage;
        state.totalPages = action.payload.pagination.totalPages;
      })
      .addCase(fetchVillasAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch units';
      })
      // Fetch Villa By ID
      .addCase(fetchVillaByIdAsync.pending, (state) => {
        state.selectedVillaLoading = true;
        state.error = null;
      })
      .addCase(fetchVillaByIdAsync.fulfilled, (state, action) => {
        state.selectedVillaLoading = false;
        state.selectedVilla = action.payload;
      })
      .addCase(fetchVillaByIdAsync.rejected, (state, action) => {
        state.selectedVillaLoading = false;
        state.error = action.payload || 'Failed to fetch unit details';
      })
      // Fetch Stats
      .addCase(fetchVillaStatsAsync.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      // Create/Batch generate/Update/Delete/Assign states updates
      .addCase(createVillaAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createVillaAsync.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createVillaAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to create unit';
      })
      .addCase(batchGenerateVillasAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(batchGenerateVillasAsync.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(batchGenerateVillasAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to batch generate units';
      })
      .addCase(assignPrimaryResidentAsync.fulfilled, (state, action) => {
        // Update selected villa if it's the one being modified
        if (state.selectedVilla && state.selectedVilla.villa._id === action.payload._id) {
          state.selectedVilla.villa = action.payload;
        }
      })
      .addCase(assignExistingUserThunk.fulfilled, (state, action) => {
        if (state.selectedVilla && state.selectedVilla.villa._id === action.payload._id) {
          state.selectedVilla.villa = action.payload;
        }
      })
      .addCase(updateResidencyTypeThunk.fulfilled, (state, action) => {
        if (state.selectedVilla && state.selectedVilla.villa._id === action.payload._id) {
          state.selectedVilla.villa = action.payload;
        }
      })
      .addCase(removeResidentThunk.fulfilled, (state, action) => {
        if (state.selectedVilla && state.selectedVilla.villa._id === action.payload._id) {
          state.selectedVilla.villa = action.payload;
        }
      });
  },
});

export const {
  setSearchQuery,
  setBlockFilter,
  setStatusFilter,
  setCurrentPage,
  clearSelectedVilla,
} = villaSlice.actions;

export default villaSlice.reducer;

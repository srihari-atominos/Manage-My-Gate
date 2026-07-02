import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as villaApi from '../services/villaApi';

// Async Thunks
export const fetchVillasAsync = createAsyncThunk(
  'villa/fetchVillas',
  async ({ page, limit }, { getState, rejectWithValue }) => {
    try {
      const { searchQuery, blockFilter, statusFilter } = getState().villa;
      const response = await villaApi.fetchVillas({
        page,
        limit,
        search: searchQuery,
        block: blockFilter,
        occupancyStatus: statusFilter,
      });
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch villas');
    }
  }
);

export const fetchVillaByIdAsync = createAsyncThunk(
  'villa/fetchVillaById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await villaApi.fetchVillaById(id);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch villa details');
    }
  }
);

export const createVillaAsync = createAsyncThunk(
  'villa/createVilla',
  async (villaData, { dispatch, rejectWithValue }) => {
    try {
      const response = await villaApi.createVilla(villaData);
      dispatch(fetchVillaStatsAsync());
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to create villa');
    }
  }
);

export const updateVillaAsync = createAsyncThunk(
  'villa/updateVilla',
  async ({ id, villaData }, { dispatch, rejectWithValue }) => {
    try {
      const response = await villaApi.updateVilla(id, villaData);
      dispatch(fetchVillaStatsAsync());
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update villa');
    }
  }
);

export const deleteVillaAsync = createAsyncThunk(
  'villa/deleteVilla',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      await villaApi.deleteVilla(id);
      dispatch(fetchVillaStatsAsync());
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to delete villa');
    }
  }
);

export const batchGenerateVillasAsync = createAsyncThunk(
  'villa/batchGenerateVillas',
  async (batchData, { dispatch, rejectWithValue }) => {
    try {
      const response = await villaApi.batchGenerateVillas(batchData);
      dispatch(fetchVillaStatsAsync());
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to batch generate villas');
    }
  }
);

export const fetchVillaStatsAsync = createAsyncThunk(
  'villa/fetchVillaStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await villaApi.fetchVillaStats();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch villa statistics');
    }
  }
);

const initialState = {
  villas: [],
  selectedVilla: null, // Holds { villa, residents }
  stats: {
    total: 0,
    vacant: 0,
    ownerOccupied: 0,
    tenantOccupied: 0,
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
        state.error = action.payload || 'Failed to fetch villas';
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
        state.error = action.payload || 'Failed to fetch villa details';
      })
      // Fetch Stats
      .addCase(fetchVillaStatsAsync.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      // Create/Batch generate/Update/Delete (standard states updates)
      .addCase(createVillaAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createVillaAsync.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createVillaAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to create villa';
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
        state.error = action.payload || 'Failed to batch generate villas';
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

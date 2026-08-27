import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import villaService, { FetchVillasParams } from '../services/villaService';

export interface Villa {
  _id: string;
  unitNumber: string;
  blockOrBuilding?: string;
  status?: string;
  type?: string;
  residents?: any[];
  primaryResident?: any;
}

export interface VillaState {
  villas: Villa[];
  currentVilla: Villa | null;
  blocks: string[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
  };
  loading: boolean;
  error: string | null;
}

const initialState: VillaState = {
  villas: [],
  currentVilla: null,
  blocks: [],
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
  },
  loading: false,
  error: null,
};

export const getVillas = createAsyncThunk(
  'villa/getVillas',
  async (params: FetchVillasParams = {}, { rejectWithValue }) => {
    try {
      const response = await villaService.fetchVillas(params);
      return response as any;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch villas');
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
      return rejectWithValue(error.message || 'Failed to fetch villa details');
    }
  }
);

const villaSlice = createSlice({
  name: 'villa',
  initialState,
  reducers: {
    clearVillaState: (state) => {
      state.villas = [];
      state.currentVilla = null;
      state.error = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getVillas.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getVillas.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload.data || action.payload;
        state.villas = payload.villas || payload.docs || [];
        state.pagination = {
          currentPage: payload.page || payload.currentPage || 1,
          totalPages: payload.totalPages || 1,
          totalRecords: payload.totalDocs || payload.totalRecords || 0,
        };
      })
      .addCase(getVillas.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to load villas';
      })
      .addCase(getVillaById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getVillaById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentVilla = action.payload.data || action.payload;
      })
      .addCase(getVillaById.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to load villa';
      });
  },
});

export const { clearVillaState } = villaSlice.actions;
export default villaSlice.reducer;

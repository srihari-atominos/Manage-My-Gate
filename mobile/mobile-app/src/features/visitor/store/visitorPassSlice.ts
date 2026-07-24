import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import visitorService from '../services/visitorService';

export interface VisitorPass {
  _id: string;
  visitorName: string;
  phone: string;
  purpose?: string;
  validFrom?: string;
  validUntil?: string;
  status: 'PENDING' | 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  code?: string;
}

interface VisitorPassState {
  passes: VisitorPass[];
  activePass: VisitorPass | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    limit: number;
  };
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  actionStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: VisitorPassState = {
  passes: [],
  activePass: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 10,
  },
  status: 'idle',
  actionStatus: 'idle',
  error: null,
};

export const createPass = createAsyncThunk(
  'visitorPass/createPass',
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await visitorService.createPass(payload);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      return (body?.data || body) as any;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create visitor pass');
    }
  }
);

export const getPassDetails = createAsyncThunk(
  'visitorPass/getPassDetails',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await visitorService.getPassDetails(id);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      return (body?.data || body) as any;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch pass details');
    }
  }
);

export const fetchPassByCode = createAsyncThunk(
  'visitorPass/fetchPassByCode',
  async (code: string, { rejectWithValue }) => {
    try {
      const response = await visitorService.getPassByCode(code);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      return (body?.data || body) as any;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch pass details by key code');
    }
  }
);

export const updatePassStatus = createAsyncThunk(
  'visitorPass/updatePassStatus',
  async ({ id, status }: { id: string; status: string }, { rejectWithValue }) => {
    try {
      const response = await visitorService.updatePassStatus(id, status);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      return (body?.data || body) as any;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update pass status');
    }
  }
);

export const getPasses = createAsyncThunk(
  'visitorPass/getPasses',
  async ({ orgId, params }: { orgId: string; params?: any }, { rejectWithValue }) => {
    try {
      const response = await visitorService.getPasses(orgId, params);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      const innerData = body?.data || body;
      return {
        data: (Array.isArray(innerData) ? innerData : (innerData?.data || [])) as VisitorPass[],
        totalRecords: innerData?.totalRecords || 0,
        page: params?.page || 1,
        limit: params?.limit || 10,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch passes');
    }
  }
);

export const visitorPassSlice = createSlice({
  name: 'visitorPass',
  initialState,
  reducers: {
    clearPassStatus: (state) => {
      state.status = 'idle';
      state.actionStatus = 'idle';
      state.error = null;
    },
    setActivePass: (state, action: PayloadAction<VisitorPass | null>) => {
      state.activePass = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // getPasses
      .addCase(getPasses.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(getPasses.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.passes = action.payload.data || [];
        state.pagination.totalRecords = action.payload.totalRecords || 0;
        state.pagination.limit = action.payload.limit;
        state.pagination.currentPage = action.payload.page;
        state.pagination.totalPages = Math.ceil((action.payload.totalRecords || 0) / action.payload.limit);
      })
      .addCase(getPasses.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || 'Failed to fetch passes';
      })

      // getPassDetails
      .addCase(getPassDetails.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(getPassDetails.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.activePass = action.payload;
        const index = state.passes.findIndex((pass) => pass._id === action.payload._id);
        if (index !== -1) {
          state.passes[index] = action.payload;
        } else {
          state.passes.unshift(action.payload);
        }
      })
      .addCase(getPassDetails.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || 'Failed to fetch pass details';
      })

      // fetchPassByCode
      .addCase(fetchPassByCode.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPassByCode.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.activePass = action.payload;
        const index = state.passes.findIndex((pass) => pass._id === action.payload._id);
        if (index !== -1) {
          state.passes[index] = action.payload;
        } else {
          state.passes.unshift(action.payload);
        }
      })
      .addCase(fetchPassByCode.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || 'Failed to fetch pass details by key code';
      })

      // createPass
      .addCase(createPass.pending, (state) => {
        state.actionStatus = 'loading';
        state.error = null;
      })
      .addCase(createPass.fulfilled, (state, action) => {
        state.actionStatus = 'succeeded';
        state.passes.unshift(action.payload);
        state.activePass = action.payload;
      })
      .addCase(createPass.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.error = (action.payload as string) || 'Failed to create visitor pass';
      })

      // updatePassStatus
      .addCase(updatePassStatus.pending, (state) => {
        state.actionStatus = 'loading';
        state.error = null;
      })
      .addCase(updatePassStatus.fulfilled, (state, action) => {
        state.actionStatus = 'succeeded';
        const index = state.passes.findIndex((pass) => pass._id === action.payload._id);
        if (index !== -1) {
          state.passes[index] = action.payload;
        }
        if (state.activePass && state.activePass._id === action.payload._id) {
          state.activePass = action.payload;
        }
      })
      .addCase(updatePassStatus.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.error = (action.payload as string) || 'Failed to update pass status';
      });
  },
});

export const { clearPassStatus, setActivePass } = visitorPassSlice.actions;
export default visitorPassSlice.reducer;

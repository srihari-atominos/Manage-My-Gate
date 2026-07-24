import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import complaintService from '../services/complaintService';

export interface ComplaintComment {
  _id: string;
  comment: string;
  senderName: string;
  createdAt: string;
}

export interface Complaint {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: 'Open' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  comments: ComplaintComment[];
  attachments?: string[];
  createdAt: string;
}

interface ComplaintState {
  list: Complaint[];
  pagination: {
    totalRecords: number;
    currentPage: number;
    totalPages: number;
    limit: number;
  };
  currentComplaint: Complaint | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: ComplaintState = {
  list: [],
  pagination: {
    totalRecords: 0,
    currentPage: 1,
    totalPages: 1,
    limit: 10,
  },
  currentComplaint: null,
  status: 'idle',
  error: null,
};

// Thunks
export const fetchComplaints = createAsyncThunk(
  'complaints/fetchComplaints',
  async (params: any, { rejectWithValue }) => {
    try {
      const response = await complaintService.getAll(params);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      return (body?.data || body) as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch complaints');
    }
  }
);

export const fetchComplaintDetails = createAsyncThunk(
  'complaints/fetchDetails',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await complaintService.getById(id);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      return (body?.data || body) as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch complaint details');
    }
  }
);

export const createComplaint = createAsyncThunk(
  'complaints/create',
  async (data: any, { rejectWithValue }) => {
    try {
      const response = await complaintService.create(data);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      return (body?.data || body) as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create complaint');
    }
  }
);

export const addComplaintComment = createAsyncThunk(
  'complaints/addComment',
  async ({ id, data }: { id: string; data: any }, { rejectWithValue }) => {
    try {
      const response = await complaintService.addComment(id, data);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      return (body?.data || body) as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add comment');
    }
  }
);

export const addFeedback = createAsyncThunk(
  'complaints/addFeedback',
  async ({ id, data }: { id: string; data: any }, { rejectWithValue }) => {
    try {
      const response = await complaintService.addFeedback(id, data);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      return (body?.data || body) as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to submit feedback');
    }
  }
);

export const complaintSlice = createSlice({
  name: 'complaints',
  initialState,
  reducers: {
    clearComplaintErrors: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchComplaints
      .addCase(fetchComplaints.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchComplaints.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload.complaints || action.payload || [];
        state.pagination = action.payload.pagination || state.pagination;
      })
      .addCase(fetchComplaints.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || 'Failed to fetch complaints';
      })

      // fetchComplaintDetails
      .addCase(fetchComplaintDetails.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchComplaintDetails.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentComplaint = action.payload;
      })
      .addCase(fetchComplaintDetails.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || 'Failed to fetch complaint details';
      })

      // createComplaint
      .addCase(createComplaint.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
        state.pagination.totalRecords += 1;
      })

      // addComplaintComment
      .addCase(addComplaintComment.fulfilled, (state, action) => {
        const index = state.list.findIndex((c) => c._id === action.payload._id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (state.currentComplaint && state.currentComplaint._id === action.payload._id) {
          state.currentComplaint = action.payload;
        }
      })

      // addFeedback
      .addCase(addFeedback.fulfilled, (state, action) => {
        const index = state.list.findIndex((c) => c._id === action.payload._id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (state.currentComplaint && state.currentComplaint._id === action.payload._id) {
          state.currentComplaint = action.payload;
        }
      });
  },
});

export const { clearComplaintErrors } = complaintSlice.actions;
export default complaintSlice.reducer;

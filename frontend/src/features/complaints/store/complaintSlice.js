import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { complaintService } from '../services/complaint.service';
import { technicianService } from '../services/technician.service';

export const fetchComplaints = createAsyncThunk(
  'complaints/fetchComplaints',
  async (params, { rejectWithValue }) => {
    try {
      const response = await complaintService.getAll(params);
      return response.data; // { complaints, pagination }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch complaints');
    }
  }
);

export const fetchComplaintDetails = createAsyncThunk(
  'complaints/fetchDetails',
  async (id, { rejectWithValue }) => {
    try {
      const response = await complaintService.getById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch complaint details');
    }
  }
);

export const fetchDashboardAnalytics = createAsyncThunk(
  'complaints/fetchDashboardAnalytics',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const response = await complaintService.getDashboardAnalytics(filters);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dashboard analytics');
    }
  }
);

export const fetchCalendarEvents = createAsyncThunk(
  'complaints/fetchCalendarEvents',
  async (params, { rejectWithValue }) => {
    try {
      const response = await complaintService.getCalendarEvents(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch calendar events');
    }
  }
);

export const fetchStaffVendorsAnalytics = createAsyncThunk(
  'complaints/fetchStaffVendorsAnalytics',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await technicianService.getAnalytics(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch staff/vendors analytics');
    }
  }
);

export const fetchTechnicians = createAsyncThunk(
  'complaints/fetchTechnicians',
  async (params, { rejectWithValue }) => {
    try {
      const response = await technicianService.getAll(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch technicians');
    }
  }
);

export const createTechnician = createAsyncThunk(
  'complaints/createTechnician',
  async (data, { rejectWithValue }) => {
    try {
      const response = await technicianService.create(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create technician');
    }
  }
);

export const updateTechnician = createAsyncThunk(
  'complaints/updateTechnician',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await technicianService.update(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update technician');
    }
  }
);

export const deleteTechnician = createAsyncThunk(
  'complaints/deleteTechnician',
  async (id, { rejectWithValue }) => {
    try {
      await technicianService.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete technician');
    }
  }
);

export const createComplaint = createAsyncThunk(
  'complaints/create',
  async (data, { rejectWithValue }) => {
    try {
      const response = await complaintService.create(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create complaint');
    }
  }
);

export const uploadComplaintAttachments = createAsyncThunk(
  'complaints/upload',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await complaintService.uploadAttachments(formData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to upload attachments');
    }
  }
);

export const updateComplaintStatus = createAsyncThunk(
  'complaints/updateStatus',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await complaintService.updateStatus(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update complaint status');
    }
  }
);

export const assignComplaint = createAsyncThunk(
  'complaints/assign',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await complaintService.assignTechnician(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to assign complaint');
    }
  }
);

export const addComplaintComment = createAsyncThunk(
  'complaints/addComment',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await complaintService.addComment(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add comment');
    }
  }
);

// Assignee Workflow Thunks
export const acceptAssignment = createAsyncThunk(
  'complaints/acceptAssignment',
  async (id, { rejectWithValue }) => {
    try {
      const response = await complaintService.acceptAssignment(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to accept assignment');
    }
  }
);

export const rejectAssignment = createAsyncThunk(
  'complaints/rejectAssignment',
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const response = await complaintService.rejectAssignment(id, reason);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reject assignment');
    }
  }
);

export const startWork = createAsyncThunk(
  'complaints/startWork',
  async (id, { rejectWithValue }) => {
    try {
      const response = await complaintService.startWork(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to start work');
    }
  }
);

export const pauseWork = createAsyncThunk(
  'complaints/pauseWork',
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const response = await complaintService.pauseWork(id, reason);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to pause work');
    }
  }
);

export const resumeWork = createAsyncThunk(
  'complaints/resumeWork',
  async (id, { rejectWithValue }) => {
    try {
      const response = await complaintService.resumeWork(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to resume work');
    }
  }
);

export const markWorkCompleted = createAsyncThunk(
  'complaints/markWorkCompleted',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await complaintService.markCompleted(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark work completed');
    }
  }
);

export const uploadWorkAttachments = createAsyncThunk(
  'complaints/uploadWorkAttachments',
  async ({ id, attachments }, { rejectWithValue }) => {
    try {
      const response = await complaintService.uploadWorkAttachments(id, { attachments });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to upload attachments');
    }
  }
);

export const addWorkNotes = createAsyncThunk(
  'complaints/addWorkNotes',
  async ({ id, notes }, { rejectWithValue }) => {
    try {
      const response = await complaintService.addWorkNotes(id, { notes });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add notes');
    }
  }
);

export const confirmCompletion = createAsyncThunk(
  'complaints/confirmCompletion',
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      const response = await complaintService.confirmCompletion(id, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to confirm completion');
    }
  }
);

const complaintSlice = createSlice({
  name: 'complaints',
  initialState: {
    list: [],
    pagination: {
      totalRecords: 0,
      currentPage: 1,
      totalPages: 1
    },
    currentComplaint: null,
    isDetailsLoading: false,
    dashboardAnalytics: null,
    calendarEvents: [],
    staffVendors: null,
    technicians: [],
    status: 'idle',
    error: null
  },
  reducers: {
    updateComplaintInList: (state, action) => {
      const index = state.list.findIndex(c => c._id === action.payload._id);
      if (index !== -1) {
        state.list[index] = action.payload;
      }
    },
    addComplaintToList: (state, action) => {
      state.list.unshift(action.payload);
      state.pagination.totalRecords += 1;
    },
    updateCurrentComplaint: (state, action) => {
      if (state.currentComplaint && state.currentComplaint._id === action.payload._id) {
        state.currentComplaint = action.payload;
      }
    },
    clearErrors: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchComplaints.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createComplaint.fulfilled, (state, action) => {
        if (!state.list) {
          state.list = [];
        }
        state.list.unshift(action.payload);
      })
      .addCase(fetchComplaints.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload.complaints;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchComplaints.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchComplaintDetails.pending, (state) => {
        state.isDetailsLoading = true;
      })
      .addCase(fetchComplaintDetails.fulfilled, (state, action) => {
        state.isDetailsLoading = false;
        state.currentComplaint = action.payload;
      })
      .addCase(fetchComplaintDetails.rejected, (state, action) => {
        state.isDetailsLoading = false;
        state.error = action.payload;
      })
      .addCase(updateComplaintStatus.fulfilled, (state, action) => {
        const index = state.list.findIndex(c => c._id === action.payload._id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (state.currentComplaint && state.currentComplaint._id === action.payload._id) {
          state.currentComplaint = action.payload;
        }
      })
      .addCase(addComplaintComment.fulfilled, (state, action) => {
        const index = state.list.findIndex(c => c._id === action.payload._id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (state.currentComplaint && state.currentComplaint._id === action.payload._id) {
          state.currentComplaint = action.payload;
        }
      })
      .addCase(assignComplaint.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(assignComplaint.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.list.findIndex(c => c._id === action.payload._id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (state.currentComplaint && state.currentComplaint._id === action.payload._id) {
          state.currentComplaint = action.payload;
        }
      })
      .addCase(assignComplaint.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchDashboardAnalytics.fulfilled, (state, action) => {
        state.dashboardAnalytics = action.payload;
      })
      .addCase(fetchCalendarEvents.fulfilled, (state, action) => {
        state.calendarEvents = action.payload;
      })
      .addCase(fetchStaffVendorsAnalytics.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchStaffVendorsAnalytics.fulfilled, (state, action) => {
        // Expected payload: { technicians, summary }
        state.staffVendors = action.payload;
        state.status = 'succeeded';
      })
      .addCase(fetchStaffVendorsAnalytics.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchTechnicians.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchTechnicians.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.technicians = action.payload;
      })
      .addCase(fetchTechnicians.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(createTechnician.fulfilled, (state, action) => {
        if (!state.technicians) state.technicians = [];
        state.technicians.unshift(action.payload);
      })
      .addCase(updateTechnician.fulfilled, (state, action) => {
        const updatedTech = action.payload;
        const index = state.technicians.findIndex(t => t._id === updatedTech._id);
        if (index !== -1) {
          state.technicians[index] = updatedTech;
        }
      })
      .addCase(deleteTechnician.fulfilled, (state, action) => {
        state.technicians = state.technicians.filter(t => t._id !== action.payload);
      });
  }
});

export const { updateComplaintInList, addComplaintToList, updateCurrentComplaint, clearErrors } = complaintSlice.actions;
export default complaintSlice.reducer;

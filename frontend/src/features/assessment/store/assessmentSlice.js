import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import assessmentService from '../services/assessment.service.js';

// Thunks
export const fetchAssessments = createAsyncThunk(
  'assessment/fetchAssessments',
  async (params, { rejectWithValue }) => {
    try {
      const response = await assessmentService.getAssessments(params);
      const body = response?.success !== undefined ? response : response?.data;
      return body?.data || body;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch assessments');
    }
  }
);

export const createNewAssessment = createAsyncThunk(
  'assessment/createNewAssessment',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await assessmentService.createAssessment(payload);
      const body = response?.success !== undefined ? response : response?.data;
      return body?.data || body;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to create assessment template');
    }
  }
);

export const modifyAssessment = createAsyncThunk(
  'assessment/modifyAssessment',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await assessmentService.updateAssessment(id, payload);
      const body = response?.success !== undefined ? response : response?.data;
      return body?.data || body;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update assessment template');
    }
  }
);

const initialState = {
  assessmentsList: [],
  activeTemplate: null,
  loading: false,
  error: null,
};

export const assessmentSlice = createSlice({
  name: 'assessment',
  initialState,
  reducers: {
    clearAssessmentError: (state) => {
      state.error = null;
    },
    setActiveTemplate: (state, action) => {
      state.activeTemplate = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchAssessments
      .addCase(fetchAssessments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAssessments.fulfilled, (state, action) => {
        state.loading = false;
        state.assessmentsList = Array.isArray(action.payload)
          ? action.payload
          : (action.payload?.data || []);
      })
      .addCase(fetchAssessments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // createNewAssessment
      .addCase(createNewAssessment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createNewAssessment.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.assessmentsList.push(action.payload);
        }
      })
      .addCase(createNewAssessment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // modifyAssessment
      .addCase(modifyAssessment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(modifyAssessment.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          const index = state.assessmentsList.findIndex((item) => item._id === action.payload._id);
          if (index !== -1) {
            state.assessmentsList[index] = action.payload;
          }
        }
      })
      .addCase(modifyAssessment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearAssessmentError, setActiveTemplate } = assessmentSlice.actions;
export default assessmentSlice.reducer;

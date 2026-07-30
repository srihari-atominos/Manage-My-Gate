import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import assessmentService from '../services/assessment.service.js'

// Thunks
export const fetchAssessments = createAsyncThunk(
  'assessment/fetchAssessments',
  async (params, { rejectWithValue }) => {
    try {
      const response = await assessmentService.getAssessments(params)
      const body = response?.success !== undefined ? response : response?.data
      return body?.data || body
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch assessments')
    }
  },
)

export const createNewAssessment = createAsyncThunk(
  'assessment/createNewAssessment',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await assessmentService.createAssessment(payload)
      const body = response?.success !== undefined ? response : response?.data
      return body?.data || body
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to create assessment template')
    }
  },
)

export const modifyAssessment = createAsyncThunk(
  'assessment/modifyAssessment',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await assessmentService.updateAssessment(id, payload)
      const body = response?.success !== undefined ? response : response?.data
      return body?.data || body
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update assessment template')
    }
  },
)

export const deleteAssessmentTemplate = createAsyncThunk(
  'assessment/deleteAssessmentTemplate',
  async (id, { rejectWithValue }) => {
    try {
      const response = await assessmentService.deleteAssessment(id)
      const body = response?.success !== undefined ? response : response?.data
      // return deleted/archived template id so we can filter state
      return { id, data: body?.data || body }
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete assessment template')
    }
  },
)

export const runBillingCycle = createAsyncThunk(
  'assessment/runBillingCycle',
  async (id, { rejectWithValue }) => {
    try {
      const response = await assessmentService.runAssessment(id)
      const body = response?.success !== undefined ? response : response?.data
      return body?.data || body
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to trigger manual billing run')
    }
  },
)

const initialState = {
  assessmentsList: [],
  activeTemplate: null,
  pagination: { currentPage: 1, totalPages: 1, totalRecords: 0, limit: 10 },
  loading: false,
  error: null,
}

export const assessmentSlice = createSlice({
  name: 'assessment',
  initialState,
  reducers: {
    clearAssessmentError: (state) => {
      state.error = null
    },
    setActiveTemplate: (state, action) => {
      state.activeTemplate = action.payload
    },
    clearAssessments: (state) => {
      state.assessmentsList = []
      state.activeTemplate = null
      state.pagination = { ...initialState.pagination }
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchAssessments
      .addCase(fetchAssessments.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchAssessments.fulfilled, (state, action) => {
        state.loading = false
        if (Array.isArray(action.payload)) {
          state.assessmentsList = action.payload
          state.pagination = {
            currentPage: 1,
            totalPages: 1,
            totalRecords: action.payload.length,
            limit: 10,
          }
        } else {
          state.assessmentsList = action.payload?.data || []
          state.pagination = action.payload?.pagination || {
            currentPage: 1,
            totalPages: 1,
            totalRecords: 0,
            limit: 10,
          }
        }
      })
      .addCase(fetchAssessments.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

      // createNewAssessment
      .addCase(createNewAssessment.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createNewAssessment.fulfilled, (state, action) => {
        state.loading = false
        if (action.payload) {
          state.assessmentsList.push(action.payload)
        }
      })
      .addCase(createNewAssessment.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

      // modifyAssessment
      .addCase(modifyAssessment.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(modifyAssessment.fulfilled, (state, action) => {
        state.loading = false
        if (action.payload) {
          const index = state.assessmentsList.findIndex((item) => item._id === action.payload._id)
          if (index !== -1) {
            state.assessmentsList[index] = action.payload
          }
        }
      })
      .addCase(modifyAssessment.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

      // deleteAssessmentTemplate
      .addCase(deleteAssessmentTemplate.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteAssessmentTemplate.fulfilled, (state, action) => {
        state.loading = false
        if (action.payload) {
          state.assessmentsList = state.assessmentsList.filter(
            (item) => item._id !== action.payload.id,
          )
          if (state.activeTemplate?._id === action.payload.id) {
            state.activeTemplate = null
          }
        }
      })
      .addCase(deleteAssessmentTemplate.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

      // runBillingCycle
      .addCase(runBillingCycle.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(runBillingCycle.fulfilled, (state) => {
        state.loading = false
      })
      .addCase(runBillingCycle.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  },
})

export const { clearAssessmentError, setActiveTemplate, clearAssessments } = assessmentSlice.actions
export default assessmentSlice.reducer

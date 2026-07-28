import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import onboardingApi from '../services/onboardingApi.js'

// Async Thunks
export const validateFile = createAsyncThunk(
  'onboardingWizard/validateFile',
  async (file, { rejectWithValue }) => {
    try {
      const response = await onboardingApi.uploadAndValidate(file)
      return response.data?.data || response.data
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'File validation failed'
      return rejectWithValue(message)
    }
  },
)

export const executeImport = createAsyncThunk(
  'onboardingWizard/executeImport',
  async (validDataArray, { rejectWithValue }) => {
    try {
      const response = await onboardingApi.executeImport(validDataArray)
      return response.data?.data || response.data
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Import execution failed'
      return rejectWithValue(message)
    }
  },
)

const initialState = {
  step: 1, // 1: Upload, 2: Preview/Errors, 3: Success
  file: null,
  validationResults: {
    valid: [],
    invalid: [],
    totalRows: 0,
    isValid: false,
  },
  isImporting: false,
  loading: false,
  error: null,
  importResult: null,
}

export const onboardingSlice = createSlice({
  name: 'onboardingWizard',
  initialState,
  reducers: {
    setStep: (state, action) => {
      state.step = action.payload
    },
    setFile: (state, action) => {
      state.file = action.payload
    },
    resetWizard: (state) => {
      state.step = 1
      state.file = null
      state.validationResults = {
        valid: [],
        invalid: [],
        totalRows: 0,
        isValid: false,
      }
      state.isImporting = false
      state.loading = false
      state.error = null
      state.importResult = null
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // validateFile
      .addCase(validateFile.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(validateFile.fulfilled, (state, action) => {
        state.loading = false
        const payload = action.payload || {}
        state.validationResults = {
          valid: payload.validRows || payload.valid || [],
          invalid: payload.invalidRows || payload.invalid || [],
          totalRows: payload.totalRows || 0,
          isValid: payload.isValid ?? (payload.invalidRows || payload.invalid || []).length === 0,
        }
        state.step = 2
      })
      .addCase(validateFile.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

      // executeImport
      .addCase(executeImport.pending, (state) => {
        state.isImporting = true
        state.error = null
      })
      .addCase(executeImport.fulfilled, (state, action) => {
        state.isImporting = false
        state.importResult = action.payload
        state.step = 3
      })
      .addCase(executeImport.rejected, (state, action) => {
        state.isImporting = false
        state.error = action.payload
      })
  },
})

export const { setStep, setFile, resetWizard, clearError } = onboardingSlice.actions
export default onboardingSlice.reducer

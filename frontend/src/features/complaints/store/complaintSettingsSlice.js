import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { complaintSettingsService } from '../services/complaintSettings.service'

export const fetchComplaintSettings = createAsyncThunk(
  'complaintSettings/fetchSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await complaintSettingsService.getSettings()
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch settings')
    }
  },
)

export const updateComplaintSettings = createAsyncThunk(
  'complaintSettings/updateSettings',
  async (data, { rejectWithValue }) => {
    try {
      const response = await complaintSettingsService.updateSettings(data)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update settings')
    }
  },
)

const complaintSettingsSlice = createSlice({
  name: 'complaintSettings',
  initialState: {
    data: null,
    status: 'idle',
    error: null,
  },
  reducers: {
    updateSettingsLocally: (state, action) => {
      state.data = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchComplaintSettings.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchComplaintSettings.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.data = action.payload
      })
      .addCase(fetchComplaintSettings.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })
  },
})

export const { updateSettingsLocally } = complaintSettingsSlice.actions
export default complaintSettingsSlice.reducer

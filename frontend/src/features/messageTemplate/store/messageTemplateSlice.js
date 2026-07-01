import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import messageTemplateApi from '../services/messageTemplateApi'

// Async Thunks
export const getTemplatesAsync = createAsyncThunk(
  'messageTemplate/getTemplates',
  async (_, { rejectWithValue }) => {
    try {
      const response = await messageTemplateApi.fetchTemplates()
      return response.data
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch templates'
      )
    }
  }
)

export const createTemplateAsync = createAsyncThunk(
  'messageTemplate/createTemplate',
  async (templateData, { rejectWithValue }) => {
    try {
      const response = await messageTemplateApi.createTemplate(templateData)
      return response.data
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to create template'
      )
    }
  }
)

export const updateTemplateAsync = createAsyncThunk(
  'messageTemplate/updateTemplate',
  async ({ id, templateData }, { rejectWithValue }) => {
    try {
      const response = await messageTemplateApi.updateTemplate(id, templateData)
      return response.data
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to update template'
      )
    }
  }
)

export const deleteTemplateAsync = createAsyncThunk(
  'messageTemplate/deleteTemplate',
  async (id, { rejectWithValue }) => {
    try {
      await messageTemplateApi.deleteTemplate(id)
      return id
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to delete template'
      )
    }
  }
)

const initialState = {
  templates: [],
  isLoading: false,
  error: null,
}

export const messageTemplateSlice = createSlice({
  name: 'messageTemplate',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // getTemplates
      .addCase(getTemplatesAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(getTemplatesAsync.fulfilled, (state, action) => {
        state.isLoading = false
        state.templates = action.payload || []
      })
      .addCase(getTemplatesAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })

      // createTemplate
      .addCase(createTemplateAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createTemplateAsync.fulfilled, (state, action) => {
        state.isLoading = false
        state.templates.unshift(action.payload)
      })
      .addCase(createTemplateAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })

      // updateTemplate
      .addCase(updateTemplateAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateTemplateAsync.fulfilled, (state, action) => {
        state.isLoading = false
        const index = state.templates.findIndex((t) => t._id === action.payload._id)
        if (index !== -1) {
          state.templates[index] = action.payload
        }
      })
      .addCase(updateTemplateAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })

      // deleteTemplate
      .addCase(deleteTemplateAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(deleteTemplateAsync.fulfilled, (state, action) => {
        state.isLoading = false
        state.templates = state.templates.filter((t) => t._id !== action.payload)
      })
      .addCase(deleteTemplateAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
  },
})

export const { clearError } = messageTemplateSlice.actions
export default messageTemplateSlice.reducer

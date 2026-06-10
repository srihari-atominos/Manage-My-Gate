import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import apiClient from '../../../utils/apiClient.js'

// Async Thunks as consumed by LoginForm and RegisterForm
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/auth/login', credentials)
      return response
    } catch (error) {
      return rejectWithValue(error.message || 'Login failed')
    }
  }
)

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/auth/register', userData)
      return response
    } catch (error) {
      return rejectWithValue(error.message || 'Registration failed')
    }
  }
)

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await apiClient.put('/users/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response
    } catch (error) {
      return rejectWithValue(error.message || 'Profile update failed')
    }
  }
)

// Initial authentication setup from localStorage persistent cache
export const acceptInvitation = createAsyncThunk(
  'auth/acceptInvitation',
  async ({ token, password }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/auth/accept-invite', { token, password })
      return response
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to accept invitation')
    }
  }
)

const token = localStorage.getItem('token')
const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null

const initialState = {
  isAuthenticated: !!token,
  user: user,
  token: token,
  loading: false,
  error: null,
  successMsg: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      state.isAuthenticated = false
      state.user = null
      state.token = null
      state.error = null
      state.successMsg = null
    },
    clearStatus: (state) => {
      state.error = null
      state.successMsg = null
      state.loading = false
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true
        state.error = null
        state.successMsg = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.token = action.payload.data?.token
        state.user = action.payload.data?.user
        state.successMsg = action.payload.message || 'Login successful!'
        
        if (action.payload.data?.token) {
          localStorage.setItem('token', action.payload.data.token)
        }
        if (action.payload.data?.user) {
          localStorage.setItem('user', JSON.stringify(action.payload.data.user))
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Login failed'
      })
      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true
        state.error = null
        state.successMsg = null
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false
        state.successMsg = action.payload.message || 'Registration successful!'
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Registration failed'
      })
      // Update Profile
      .addCase(updateProfile.pending, (state) => {
        state.loading = true
        state.error = null
        state.successMsg = null
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false
        state.user = {
          ...state.user,
          ...action.payload.data,
        }
        state.successMsg = action.payload.message || 'Profile updated successfully!'
        
        if (state.user) {
          localStorage.setItem('user', JSON.stringify(state.user))
        }
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Profile update failed'
      })
      // Accept Invitation
      .addCase(acceptInvitation.pending, (state) => {
        state.loading = true
        state.error = null
        state.successMsg = null
      })
      .addCase(acceptInvitation.fulfilled, (state, action) => {
        state.loading = false
        state.successMsg = action.payload.message || 'Password set successfully. Please log in.'
      })
      .addCase(acceptInvitation.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to accept invitation'
      })
  },
})

export const { logout, clearStatus } = authSlice.actions
export default authSlice.reducer

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import apiClient from '../../utils/apiClient.js'

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

// Initial authentication setup from localStorage persistent cache
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
  },
})

export const { logout, clearStatus } = authSlice.actions
export default authSlice.reducer

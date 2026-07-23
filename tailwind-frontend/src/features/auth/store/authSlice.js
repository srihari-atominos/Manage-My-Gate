import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import apiClient from '../../../services/apiClient.js'
import authService from '../services/authService.js'
import { setActiveWorkspace, fetchCurrentWorkspace } from '../../workspace/store/workspaceSlice.js'

// Async Thunks
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { dispatch, rejectWithValue }) => {
    try {
      const response = await authService.login(credentials)
      
      const user = response.data?.user
      const availableWorkspaces = response.data?.availableWorkspaces || []
      
      if (user) {
        dispatch(
          setActiveWorkspace({
            activeOrganizationId: user.orgId,
            activeRole: user.role,
            allowedFeatures: user.permissions || [],
            isPlatform: user.isPlatform || false,
            availableWorkspaces: availableWorkspaces,
          })
        )
        dispatch(fetchCurrentWorkspace())
      }
      
      return response
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Login failed')
    }
  }
)

export const loginWithGoogle = createAsyncThunk(
  'auth/loginWithGoogle',
  async (token, { dispatch, rejectWithValue }) => {
    try {
      const response = await authService.verifyGoogleToken(token)
      
      const user = response.data?.user
      const availableWorkspaces = response.data?.availableWorkspaces || []
      
      if (user) {
        dispatch(
          setActiveWorkspace({
            activeOrganizationId: user.orgId,
            activeRole: user.role,
            allowedFeatures: user.permissions || [],
            isPlatform: user.isPlatform || false,
            availableWorkspaces: availableWorkspaces,
          })
        )
        dispatch(fetchCurrentWorkspace())
      }
      
      return response
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Google login failed')
    }
  }
)

export const loginWithMicrosoft = createAsyncThunk(
  'auth/loginWithMicrosoft',
  async (token, { dispatch, rejectWithValue }) => {
    try {
      const response = await authService.verifyMicrosoftToken(token)
      
      const user = response.data?.user
      const availableWorkspaces = response.data?.availableWorkspaces || []
      
      if (user) {
        dispatch(
          setActiveWorkspace({
            activeOrganizationId: user.orgId,
            activeRole: user.role,
            allowedFeatures: user.permissions || [],
            isPlatform: user.isPlatform || false,
            availableWorkspaces: availableWorkspaces,
          })
        )
        dispatch(fetchCurrentWorkspace())
      }
      
      return response
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Microsoft login failed')
    }
  }
)

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData, { dispatch, rejectWithValue }) => {
    try {
      const response = await authService.register(userData)
      
      const user = response.data?.user
      const availableWorkspaces = response.data?.availableWorkspaces || []
      
      if (user) {
        dispatch(
          setActiveWorkspace({
            activeOrganizationId: user.orgId,
            activeRole: user.role,
            allowedFeatures: user.permissions || [],
            isPlatform: user.isPlatform || false,
            availableWorkspaces: availableWorkspaces,
          })
        )
      }
      
      return response
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Registration failed')
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
      return rejectWithValue(error.response?.data?.message || error.message || 'Profile update failed')
    }
  }
)

export const acceptInvitation = createAsyncThunk(
  'auth/acceptInvitation',
  async ({ token, password }, { rejectWithValue }) => {
    try {
      const response = await authService.acceptInvite({ token, password })
      return response
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to accept invitation')
    }
  }
)

export const switchWorkspaceContext = createAsyncThunk(
  'auth/switchWorkspaceContext',
  async (arg, { dispatch, rejectWithValue }) => {
    try {
      const payload = typeof arg === 'string' ? { targetOrgId: arg } : arg
      const response = await apiClient.post('/auth/switch-context', payload)
      
      const token = response.data?.token
      const user = response.data?.user
      
      dispatch(updateTokenAndUser({ token, user }))
      
      if (user) {
        dispatch(
          setActiveWorkspace({
            activeOrganizationId: user.orgId,
            activeRole: user.role,
            allowedFeatures: user.permissions || [],
            isPlatform: user.isPlatform || false,
          })
        )
        dispatch(fetchCurrentWorkspace())
      }
      
      return response
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to switch workspace context')
    }
  }
)

export const createWorkspace = createAsyncThunk(
  'auth/createWorkspace',
  async ({ name }, { dispatch, rejectWithValue }) => {
    try {
      const response = await authService.createWorkspace({ name })
      
      const token = response.data?.token
      const user = response.data?.user
      const availableWorkspaces = response.data?.availableWorkspaces || []
      
      dispatch(updateTokenAndUser({ token, user }))
      
      if (user) {
        dispatch(
          setActiveWorkspace({
            activeOrganizationId: user.orgId,
            activeRole: user.role,
            allowedFeatures: user.permissions || [],
            isPlatform: user.isPlatform || false,
            availableWorkspaces: availableWorkspaces,
          })
        )
      }
      
      return response
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to create workspace')
    }
  }
)

const rawToken = localStorage.getItem('token')
const token = (rawToken === 'undefined' || rawToken === 'null' || !rawToken) ? null : rawToken

const rawUser = localStorage.getItem('user')
const user = (rawUser === 'undefined' || rawUser === 'null' || !rawUser) ? null : JSON.parse(rawUser)

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
      localStorage.removeItem('availableWorkspaces')
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
    updateTokenAndUser: (state, action) => {
      const { token, user } = action.payload || {};
      if (token) {
        state.token = token;
        localStorage.setItem('token', token);
      }
      if (user) {
        state.user = user;
        localStorage.setItem('user', JSON.stringify(user));
      }
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
        if (action.payload.data?.availableWorkspaces) {
          localStorage.setItem('availableWorkspaces', JSON.stringify(action.payload.data.availableWorkspaces))
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Login failed'
      })
      // Google Login
      .addCase(loginWithGoogle.pending, (state) => {
        state.loading = true
        state.error = null
        state.successMsg = null
      })
      .addCase(loginWithGoogle.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.token = action.payload.data?.token
        state.user = action.payload.data?.user
        state.successMsg = action.payload.message || 'Google login successful!'
        
        if (action.payload.data?.token) {
          localStorage.setItem('token', action.payload.data.token)
        }
        if (action.payload.data?.user) {
          localStorage.setItem('user', JSON.stringify(action.payload.data.user))
        }
        if (action.payload.data?.availableWorkspaces) {
          localStorage.setItem('availableWorkspaces', JSON.stringify(action.payload.data.availableWorkspaces))
        }
      })
      .addCase(loginWithGoogle.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Google login failed'
      })
      // Microsoft Login
      .addCase(loginWithMicrosoft.pending, (state) => {
        state.loading = true
        state.error = null
        state.successMsg = null
      })
      .addCase(loginWithMicrosoft.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.token = action.payload.data?.token
        state.user = action.payload.data?.user
        state.successMsg = action.payload.message || 'Microsoft login successful!'
        
        if (action.payload.data?.token) {
          localStorage.setItem('token', action.payload.data.token)
        }
        if (action.payload.data?.user) {
          localStorage.setItem('user', JSON.stringify(action.payload.data.user))
        }
        if (action.payload.data?.availableWorkspaces) {
          localStorage.setItem('availableWorkspaces', JSON.stringify(action.payload.data.availableWorkspaces))
        }
      })
      .addCase(loginWithMicrosoft.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Microsoft login failed'
      })
      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true
        state.error = null
        state.successMsg = null
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.token = action.payload.data?.token
        state.user = action.payload.data?.user
        state.successMsg = action.payload.message || 'Registration successful!'
        
        if (action.payload.data?.token) {
          localStorage.setItem('token', action.payload.data.token)
        }
        if (action.payload.data?.user) {
          localStorage.setItem('user', JSON.stringify(action.payload.data.user))
        }
        if (action.payload.data?.availableWorkspaces) {
          localStorage.setItem('availableWorkspaces', JSON.stringify(action.payload.data.availableWorkspaces))
        }
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
      // Switch Workspace Context
      .addCase(switchWorkspaceContext.pending, (state) => {
        state.loading = true
        state.error = null
        state.successMsg = null
      })
      .addCase(switchWorkspaceContext.fulfilled, (state, action) => {
        state.loading = false
        state.successMsg = action.payload.message || 'Switched workspace context successfully!'
      })
      .addCase(switchWorkspaceContext.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Workspace context switch failed'
      })
      // Create Workspace
      .addCase(createWorkspace.pending, (state) => {
        state.loading = true
        state.error = null
        state.successMsg = null
      })
      .addCase(createWorkspace.fulfilled, (state, action) => {
        state.loading = false
        state.token = action.payload.data?.token
        state.user = action.payload.data?.user
        state.successMsg = action.payload.message || 'Workspace created successfully!'
        
        if (action.payload.data?.token) {
          localStorage.setItem('token', action.payload.data.token)
        }
        if (action.payload.data?.user) {
          localStorage.setItem('user', JSON.stringify(action.payload.data.user))
        }
        if (action.payload.data?.availableWorkspaces) {
          localStorage.setItem('availableWorkspaces', JSON.stringify(action.payload.data.availableWorkspaces))
        }
      })
      .addCase(createWorkspace.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Workspace creation failed'
      })
  },
})

export const { logout, clearStatus, updateTokenAndUser } = authSlice.actions
export default authSlice.reducer

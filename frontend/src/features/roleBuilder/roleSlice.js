import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import * as roleApi from './services/roleApi'
import apiClient from '../../services/apiClient'

// Async Thunks
export const fetchRolesAsync = createAsyncThunk(
  'roleBuilder/fetchRoles',
  async ({ page, limit }, { rejectWithValue }) => {
    try {
      const response = await roleApi.fetchRoles({ page, limit })
      return response
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch roles')
    }
  },
)

export const fetchPermissions = createAsyncThunk(
  'roleBuilder/fetchPermissions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/roles/permissions')
      return response.data
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch permissions')
    }
  },
)

export const createRoleAsync = createAsyncThunk(
  'roleBuilder/createRole',
  async (roleData, { rejectWithValue }) => {
    try {
      const response = await roleApi.createRole(roleData)
      return response
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to create role')
    }
  },
)

export const updateRoleAsync = createAsyncThunk(
  'roleBuilder/updateRole',
  async ({ roleId, roleData }, { rejectWithValue }) => {
    try {
      const response = await roleApi.updateRole(roleId, roleData)
      return response
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update role')
    }
  },
)

export const deleteRoleAsync = createAsyncThunk(
  'roleBuilder/deleteRole',
  async (roleId, { rejectWithValue }) => {
    try {
      const response = await roleApi.deleteRole(roleId)
      return response
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete role')
    }
  },
)

const initialState = {
  roles: [],
  isLoading: false,
  error: null,
  permissionsList: [],
  isPermissionsLoading: false,
  totalRecords: 0,
  currentPage: 1,
  totalPages: 1,
  rowsPerPage: 10,
}

const roleSlice = createSlice({
  name: 'roleBuilder',
  initialState,
  reducers: {
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload
    },
    setRowsPerPage: (state, action) => {
      state.rowsPerPage = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Roles
      .addCase(fetchRolesAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchRolesAsync.fulfilled, (state, action) => {
        state.isLoading = false
        state.roles = action.payload.data
        state.totalRecords = action.payload.pagination.totalRecords
        state.currentPage = action.payload.pagination.currentPage
        state.totalPages = action.payload.pagination.totalPages
      })
      .addCase(fetchRolesAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload || 'Failed to fetch roles'
      })
      // Fetch Permissions
      .addCase(fetchPermissions.pending, (state) => {
        state.isPermissionsLoading = true
        state.error = null
      })
      .addCase(fetchPermissions.fulfilled, (state, action) => {
        state.isPermissionsLoading = false
        state.permissionsList = action.payload
      })
      .addCase(fetchPermissions.rejected, (state, action) => {
        state.isPermissionsLoading = false
        state.error = action.payload || 'Failed to fetch permissions'
      })
      // Create Role
      .addCase(createRoleAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createRoleAsync.fulfilled, (state, action) => {
        state.isLoading = false
        state.roles.push(action.payload)
        state.totalRecords += 1
      })
      .addCase(createRoleAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload || 'Failed to create role'
      })
      // Update Role
      .addCase(updateRoleAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateRoleAsync.fulfilled, (state, action) => {
        state.isLoading = false
        const updatedRole = action.payload
        state.roles = state.roles.map((r) => (r.id === updatedRole.id ? updatedRole : r))
      })
      .addCase(updateRoleAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload || 'Failed to update role'
      })
      // Delete Role
      .addCase(deleteRoleAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(deleteRoleAsync.fulfilled, (state, action) => {
        state.isLoading = false
        const initialLength = state.roles.length
        state.roles = state.roles.filter((r) => r.id !== action.payload)
        const diff = initialLength - state.roles.length
        state.totalRecords = Math.max(0, state.totalRecords - diff)
      })
      .addCase(deleteRoleAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload || 'Failed to delete role'
      })
  },
})

export const { setCurrentPage, setRowsPerPage } = roleSlice.actions

export default roleSlice.reducer

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import * as userApi from './services/userApi'

export const ROLES = ['Super Admin', 'Branch Manager', 'System Auditor']
export const STATUS_OPTIONS = ['Active', 'Inactive', 'Pending']

// Async Thunks
export const fetchUsersAsync = createAsyncThunk(
  'userManagement/fetchUsers',
  async ({ page, limit }, { rejectWithValue }) => {
    try {
      const response = await userApi.fetchUsers({ page, limit })
      return response
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch users')
    }
  }
)

export const inviteUserAsync = createAsyncThunk(
  'userManagement/inviteUser',
  async (email, { rejectWithValue }) => {
    try {
      const response = await userApi.inviteUser(email)
      return response
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to invite user')
    }
  }
)

export const deleteUserAsync = createAsyncThunk(
  'userManagement/deleteUser',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await userApi.deleteUser(userId)
      return response
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete user')
    }
  }
)

export const updateUserRolesAsync = createAsyncThunk(
  'userManagement/updateUserRoles',
  async ({ userId, newRoles }, { rejectWithValue }) => {
    try {
      const response = await userApi.updateUserRoles(userId, newRoles)
      return response
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update user roles')
    }
  }
)

const initialState = {
  users: [],
  searchQuery: '',
  selectedRoles: [],
  statusFilter: ['Active', 'Inactive', 'Pending'],
  currentPage: 1,
  rowsPerPage: 10,
  totalRecords: 0,
  totalPages: 1,
  loading: false,
  error: null,
}

const userSlice = createSlice({
  name: 'userManagement',
  initialState,
  reducers: {
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload
    },
    toggleRole: (state, action) => {
      const role = action.payload
      if (state.selectedRoles.includes(role)) {
        state.selectedRoles = state.selectedRoles.filter((r) => r !== role)
      } else {
        state.selectedRoles.push(role)
      }
    },
    toggleStatus: (state, action) => {
      const status = action.payload
      if (state.statusFilter.includes(status)) {
        state.statusFilter = state.statusFilter.filter((s) => s !== status)
      } else {
        state.statusFilter.push(status)
      }
    },
    clearRoleFilter: (state) => {
      state.selectedRoles = []
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload
    },
    setRowsPerPage: (state, action) => {
      state.rowsPerPage = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Users
      .addCase(fetchUsersAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchUsersAsync.fulfilled, (state, action) => {
        state.loading = false
        state.users = action.payload.data
        state.totalRecords = action.payload.pagination.totalRecords
        state.currentPage = action.payload.pagination.currentPage
        state.totalPages = action.payload.pagination.totalPages
      })
      .addCase(fetchUsersAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to fetch users'
      })
      // Invite User
      .addCase(inviteUserAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(inviteUserAsync.fulfilled, (state, action) => {
        state.loading = false
        state.users.push(action.payload)
      })
      .addCase(inviteUserAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to invite user'
      })
      // Delete User
      .addCase(deleteUserAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteUserAsync.fulfilled, (state, action) => {
        state.loading = false
        state.users = state.users.filter((u) => u.id !== action.payload)
      })
      .addCase(deleteUserAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to delete user'
      })
      // Update User Roles
      .addCase(updateUserRolesAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateUserRolesAsync.fulfilled, (state, action) => {
        state.loading = false
        const { userId, roles } = action.payload
        const user = state.users.find((u) => u.id === userId)
        if (user) {
          user.role = roles.join(', ')
        }
      })
      .addCase(updateUserRolesAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to update user roles'
      })
  },
})

export const {
  setSearchQuery,
  toggleRole,
  toggleStatus,
  clearRoleFilter,
  setCurrentPage,
  setRowsPerPage,
} = userSlice.actions

export default userSlice.reducer

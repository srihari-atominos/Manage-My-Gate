import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import * as userApi from '../services/userApi'

export const ROLES = ['Super Admin', 'Branch Manager', 'System Auditor']
export const STATUS_OPTIONS = ['Active', 'Inactive', 'Pending']

// Async Thunks
export const fetchUsersAsync = createAsyncThunk(
  'userManagement/fetchUsers',
  async ({ page, limit }, { getState, rejectWithValue }) => {
    try {
      const { searchQuery, selectedRoles, statusFilter } = getState().userManagement
      const response = await userApi.fetchUsers({
        page,
        limit,
        search: searchQuery,
        roles: selectedRoles,
        status: statusFilter,
      })
      return response
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch users')
    }
  },
)

export const inviteUserAsync = createAsyncThunk(
  'userManagement/inviteUser',
  async (inviteData, { rejectWithValue }) => {
    try {
      const response = await userApi.inviteUser(inviteData)
      return response
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to invite user')
    }
  },
)

export const bulkInviteUsersAsync = createAsyncThunk(
  'userManagement/bulkInviteUsers',
  async (invitations, { dispatch, rejectWithValue }) => {
    try {
      const response = await userApi.bulkInviteUsers(invitations)
      return response
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to bulk invite users')
    }
  },
)

export const deleteUserAsync = createAsyncThunk(
  'userManagement/deleteUser',
  async ({ userId, villaId = null }, { rejectWithValue }) => {
    try {
      const response = await userApi.deleteUser(userId, villaId)
      return response
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete user')
    }
  },
)

export const updateUserRolesAsync = createAsyncThunk(
  'userManagement/updateUserRoles',
  async ({ userId, roles, villaId = null }, { rejectWithValue }) => {
    try {
      const response = await userApi.updateUserRoles(userId, roles, villaId)
      return response
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update user roles')
    }
  },
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
    clearUsers: (state) => {
      state.users = []
      state.totalRecords = 0
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
      // Bulk Invite Users
      .addCase(bulkInviteUsersAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(bulkInviteUsersAsync.fulfilled, (state, action) => {
        state.loading = false
      })
      .addCase(bulkInviteUsersAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to bulk invite users'
      })
      // Delete User
      .addCase(deleteUserAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteUserAsync.fulfilled, (state, action) => {
        state.loading = false
        // We rely on fetchUsersAsync to update the list if villaId was passed.
        // If not, we remove the user.
        if (!action.payload.villaId) {
          state.users = state.users.filter((u) => u.id !== action.payload.userId)
        }
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
        // We rely on fetchUsersAsync (dispatched by useUserList) to get the latest accurate 
        // assignedUnits array and role mappings from the backend.
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
  clearUsers,
} = userSlice.actions

export default userSlice.reducer

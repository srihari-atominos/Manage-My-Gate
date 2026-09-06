import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as userService from '../services/userService';
import { UserData, InviteUserData } from '../services/userService';

export const STATUS_OPTIONS = ['Active', 'Inactive', 'Pending'];

export interface UserManagementState {
  users: UserData[];
  searchQuery: string;
  selectedRoles: string[];
  statusFilter: string[];
  currentPage: number;
  rowsPerPage: number;
  totalRecords: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
}

export const DUMMY_USERS: UserData[] = [
  {
    id: 'u-1',
    _id: 'u-1',
    name: 'Arun Kumar',
    email: 'arun.kumar@community.org',
    role: 'Admin',
    status: 'Active',
    assignedUnits: [{ villaId: '650000000000000000000101', villaNumber: 'Villa 101', villaBlock: 'Palm Meadows - Phase 1', residentType: 'Owner', role: 'Owner' }],
  },
  {
    id: 'u-2',
    _id: 'u-2',
    name: 'Priya Sharma',
    email: 'priya.sharma@community.org',
    role: 'Tenant/Owner',
    status: 'Active',
    assignedUnits: [{ villaId: '650000000000000000000102', villaNumber: 'Villa 102', villaBlock: 'Palm Meadows - Phase 1', residentType: 'Owner', role: 'Owner' }],
  },
  {
    id: 'u-3',
    _id: 'u-3',
    name: 'Vikram Mehta',
    email: 'vikram.mehta@community.org',
    role: 'Tenant/Owner',
    status: 'Active',
    assignedUnits: [{ villaId: '650000000000000000000103', villaNumber: 'Villa 103', villaBlock: 'Palm Meadows - Phase 1', residentType: 'Owner', role: 'Owner' }],
  },
  {
    id: 'u-4',
    _id: 'u-4',
    name: 'Ananya Roy',
    email: 'ananya.roy@community.org',
    role: 'Tenant/Owner',
    status: 'Active',
    assignedUnits: [{ villaId: '650000000000000000000202', villaNumber: 'Villa 202', villaBlock: 'Emerald Valley - North Wing', residentType: 'Tenant', role: 'Tenant' }],
  },
  {
    id: 'u-5',
    _id: 'u-5',
    name: 'Rajesh Verma',
    email: 'rajesh.verma@security.org',
    role: 'Security',
    status: 'Active',
    assignedUnits: [{ villaId: '650000000000000000000302', villaNumber: 'Block B - 101', villaBlock: 'Block B', residentType: 'Resident', role: 'Resident' }],
  },
  {
    id: 'u-6',
    _id: 'u-6',
    name: 'Suresh Nair',
    email: 'suresh.nair@maintenance.org',
    role: 'Tenant/Owner',
    status: 'Active',
    assignedUnits: [{ villaId: '650000000000000000000301', villaNumber: 'Block A - 101', villaBlock: 'Block A', residentType: 'Tenant', role: 'Tenant' }],
  },
  {
    id: 'u-7',
    _id: 'u-7',
    name: 'Dr. Meera Reddy',
    email: 'meera.reddy@community.org',
    role: 'Tenant/Owner',
    status: 'Active',
    assignedUnits: [{ villaId: '650000000000000000000104', villaNumber: 'Villa 104', villaBlock: 'Palm Meadows - Phase 1', residentType: 'Owner', role: 'Owner' }],
  },
  {
    id: 'u-8',
    _id: 'u-8',
    name: 'Rohan Patel',
    email: 'rohan.patel@community.org',
    role: 'Tenant/Owner',
    status: 'Pending',
    assignedUnits: [{ villaId: '650000000000000000000201', villaNumber: 'Villa 201', villaBlock: 'Emerald Valley - North Wing', residentType: 'Tenant', role: 'Tenant' }],
  },
  {
    id: 'u-9',
    _id: 'u-9',
    name: 'Sunita Rao',
    email: 'sunita.rao@accounts.org',
    role: 'Tenant/Owner',
    status: 'Active',
    assignedUnits: [{ villaId: '650000000000000000000105', villaNumber: 'Villa 105', villaBlock: 'Palm Meadows - Phase 1', residentType: 'Owner', role: 'Owner' }],
  },
  {
    id: 'u-10',
    _id: 'u-10',
    name: 'David D\'Souza',
    email: 'david.dsouza@facility.org',
    role: 'Admin',
    status: 'Active',
    assignedUnits: [{ villaId: '650000000000000000000203', villaNumber: 'Villa 203', villaBlock: 'Emerald Valley - North Wing', residentType: 'Owner', role: 'Owner' }],
  },
];

const initialState: UserManagementState = {
  users: DUMMY_USERS,
  searchQuery: '',
  selectedRoles: [],
  statusFilter: ['Active', 'Inactive', 'Pending'],
  currentPage: 1,
  rowsPerPage: 10,
  totalRecords: DUMMY_USERS.length,
  totalPages: 1,
  loading: false,
  error: null,
};

// Async Thunks
export const fetchUsersAsync = createAsyncThunk(
  'userManagement/fetchUsers',
  async (params: { page: number; limit: number } | undefined, { getState, rejectWithValue }) => {
    try {
      const state = (getState() as any).userManagement as UserManagementState;
      const page = params?.page || state.currentPage || 1;
      const limit = params?.limit || state.rowsPerPage || 10;

      const response = await userService.fetchUsers({
        page,
        limit,
        search: state.searchQuery,
        roles: state.selectedRoles,
        status: state.statusFilter,
      });
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch users');
    }
  }
);

export const fetchUsersThunk = fetchUsersAsync;

export const inviteUserAsync = createAsyncThunk(
  'userManagement/inviteUser',
  async (inviteData: InviteUserData, { rejectWithValue }) => {
    try {
      const response = await userService.inviteUser(inviteData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to invite user');
    }
  }
);

export const bulkInviteUsersAsync = createAsyncThunk(
  'userManagement/bulkInviteUsers',
  async (invitations: InviteUserData[], { rejectWithValue }) => {
    try {
      const response = await userService.bulkInviteUsers(invitations);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to bulk invite users');
    }
  }
);

export const deleteUserAsync = createAsyncThunk(
  'userManagement/deleteUser',
  async (payload: { userId: string; villaId?: string | null }, { rejectWithValue }) => {
    try {
      const response = await userService.deleteUser(payload.userId, payload.villaId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete user');
    }
  }
);

export const updateUserRolesAsync = createAsyncThunk(
  'userManagement/updateUserRoles',
  async (payload: { userId: string; roles: string[]; villaId?: string | null }, { rejectWithValue }) => {
    try {
      const response = await userService.updateUserRoles(payload.userId, payload.roles, payload.villaId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update user roles');
    }
  }
);

const userSlice = createSlice({
  name: 'userManagement',
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    toggleRole: (state, action: PayloadAction<string>) => {
      const role = action.payload;
      if (state.selectedRoles.includes(role)) {
        state.selectedRoles = [];
      } else {
        state.selectedRoles = [role];
      }
    },
    toggleStatus: (state, action: PayloadAction<string>) => {
      const status = action.payload;
      if (state.statusFilter.includes(status)) {
        state.statusFilter = state.statusFilter.filter((s) => s !== status);
      } else {
        state.statusFilter.push(status);
      }
    },
    clearRoleFilter: (state) => {
      state.selectedRoles = [];
    },
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    setRowsPerPage: (state, action: PayloadAction<number>) => {
      state.rowsPerPage = action.payload;
    },
    clearUsers: (state) => {
      state.users = [];
      state.totalRecords = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Users
      .addCase(fetchUsersAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsersAsync.fulfilled, (state, action: any) => {
        state.loading = false;
        const fetchedData = action.payload?.data || [];
        state.users = fetchedData.length > 0 ? fetchedData : DUMMY_USERS;
        state.totalRecords = action.payload?.pagination?.totalRecords || state.users.length;
        state.currentPage = action.payload?.pagination?.currentPage || 1;
        state.totalPages = action.payload?.pagination?.totalPages || 1;
      })
      .addCase(fetchUsersAsync.rejected, (state, action: any) => {
        state.loading = false;
        if (state.users.length === 0) {
          state.users = DUMMY_USERS;
          state.totalRecords = DUMMY_USERS.length;
        }
        state.error = action.payload || 'Failed to fetch users';
      })
      // Invite User
      .addCase(inviteUserAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(inviteUserAsync.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(inviteUserAsync.rejected, (state, action: any) => {
        state.loading = false;
        state.error = action.payload || 'Failed to invite user';
      })
      // Bulk Invite Users
      .addCase(bulkInviteUsersAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkInviteUsersAsync.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(bulkInviteUsersAsync.rejected, (state, action: any) => {
        state.loading = false;
        state.error = action.payload || 'Failed to bulk invite users';
      })
      // Delete User
      .addCase(deleteUserAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteUserAsync.fulfilled, (state, action: any) => {
        state.loading = false;
        if (!action.payload.villaId) {
          state.users = state.users.filter((u) => u.id !== action.payload.userId && u._id !== action.payload.userId);
        }
      })
      .addCase(deleteUserAsync.rejected, (state, action: any) => {
        state.loading = false;
        state.error = action.payload || 'Failed to delete user';
      })
      // Update User Roles
      .addCase(updateUserRolesAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserRolesAsync.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateUserRolesAsync.rejected, (state, action: any) => {
        state.loading = false;
        state.error = action.payload || 'Failed to update user roles';
      });
  },
});

export const {
  setSearchQuery,
  toggleRole,
  toggleStatus,
  clearRoleFilter,
  setCurrentPage,
  setRowsPerPage,
  clearUsers,
} = userSlice.actions;

export default userSlice.reducer;

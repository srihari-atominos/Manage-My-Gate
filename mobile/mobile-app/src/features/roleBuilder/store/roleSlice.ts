import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as roleService from '../services/roleService';

export interface PermissionItem {
  _id?: string;
  code?: string;
  name?: string;
  category?: string;
}

export type PermissionGroupMap = Record<string, PermissionItem[]>;

export interface RoleState {
  roles: roleService.RoleData[];
  isLoading: boolean;
  isPermissionsLoading: boolean;
  error: string | null;
  permissionsList: PermissionGroupMap;
  totalRecords: number;
  currentPage: number;
  totalPages: number;
  rowsPerPage: number;
}

export const DUMMY_ROLES: roleService.RoleData[] = [
  {
    id: 'role-1',
    _id: 'role-1',
    name: 'Admin',
    description: 'Full administrative control over community settings, users, villas/blocks, and financial suite.',
    isTenantRole: false,
    permissions: [
      'users:read',
      'users:write',
      'villas:read',
      'villas:write',
      'roles:read',
      'roles:write',
      'workspaces:read',
      'visitor:admin',
      'billing:dashboard',
      'billing:assessment_manager',
      'billing:action_center',
      'amenities:dashboard',
      'amenities:amenities',
      'amenities:admin_calander',
      'amenities:ledgers',
      'amenities:maintenance',
      'notices:dashboard',
      'notices:manage_notices',
      'complaints:dashboard',
      'complaints:complaint_management',
      'complaints:staff',
    ],
  },
  {
    id: 'role-2',
    _id: 'role-2',
    name: 'Tenant/Owner',
    description: 'Resident property owner or tenant with access to digital passes, amenities booking, dues payment, and helpdesk.',
    isTenantRole: true,
    permissions: [
      'visitor:resident',
      'amenities:discover',
      'amenities:my_booking',
      'amenities:wallet',
      'billing:action_center',
      'notices:active_board',
      'notices:polls',
      'complaints:raise_ticket',
      'complaints:track_requests',
      'villas:read',
    ],
  },
  {
    id: 'role-3',
    _id: 'role-3',
    name: 'Security',
    description: 'Gate security personnel for visitor check-ins, vehicle activity logs, and digital pass verification.',
    isTenantRole: false,
    permissions: [
      'visitor:guard',
      'visitor:admin',
      'amenities:scanner',
      'amenities:security_logs',
      'notices:active_board',
      'complaints:track_requests',
      'villas:read',
    ],
  },
];

const initialState: RoleState = {
  roles: DUMMY_ROLES,
  isLoading: false,
  isPermissionsLoading: false,
  error: null,
  permissionsList: {},
  totalRecords: DUMMY_ROLES.length,
  currentPage: 1,
  totalPages: 1,
  rowsPerPage: 10,
};

export const fetchRolesAsync = createAsyncThunk(
  'roleBuilder/fetchRoles',
  async (params: roleService.FetchRolesParams | undefined, { rejectWithValue }) => {
    try {
      const response = await roleService.fetchRoles(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch roles');
    }
  }
);

export const fetchPermissionsAsync = createAsyncThunk(
  'roleBuilder/fetchPermissions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await roleService.fetchPermissions();
      return response.data || response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch permissions');
    }
  }
);

export const createRoleAsync = createAsyncThunk(
  'roleBuilder/createRole',
  async (roleData: roleService.RoleData, { rejectWithValue }) => {
    try {
      const response = await roleService.createRole(roleData);
      return response.data || response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create role');
    }
  }
);

export const updateRoleAsync = createAsyncThunk(
  'roleBuilder/updateRole',
  async ({ roleId, roleData }: { roleId: string; roleData: roleService.RoleData }, { rejectWithValue }) => {
    try {
      const response = await roleService.updateRole(roleId, roleData);
      return response.data || response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update role');
    }
  }
);

export const deleteRoleAsync = createAsyncThunk(
  'roleBuilder/deleteRole',
  async (roleId: string, { rejectWithValue }) => {
    try {
      await roleService.deleteRole(roleId);
      return roleId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete role');
    }
  }
);

export const syncRolePermissionsAsync = createAsyncThunk(
  'roleBuilder/syncRolePermissions',
  async ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }, { rejectWithValue }) => {
    try {
      const response = await roleService.syncRolePermissions(roleId, permissionIds);
      return response.data || response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to sync permissions');
    }
  }
);

const roleSlice = createSlice({
  name: 'roleBuilder',
  initialState,
  reducers: {
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    setRowsPerPage: (state, action: PayloadAction<number>) => {
      state.rowsPerPage = action.payload;
    },
    clearRoleError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Roles
      .addCase(fetchRolesAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRolesAsync.fulfilled, (state, action: any) => {
        state.isLoading = false;
        const payloadData = action.payload?.data || action.payload;
        let list: roleService.RoleData[] = [];
        if (Array.isArray(payloadData)) {
          list = payloadData;
        } else if (Array.isArray(payloadData?.data)) {
          list = payloadData.data;
        }

        state.roles = list.length > 0 ? list : DUMMY_ROLES;

        const pagination = action.payload?.pagination || payloadData?.pagination;
        state.totalRecords = pagination?.totalRecords || state.roles.length;
        state.currentPage = pagination?.currentPage || state.currentPage;
        state.totalPages = pagination?.totalPages || Math.ceil(state.totalRecords / state.rowsPerPage) || 1;
      })
      .addCase(fetchRolesAsync.rejected, (state, action: any) => {
        state.isLoading = false;
        if (state.roles.length === 0) {
          state.roles = DUMMY_ROLES;
          state.totalRecords = DUMMY_ROLES.length;
        }
        state.error = action.payload || 'Failed to fetch roles';
      })
      // Fetch Permissions
      .addCase(fetchPermissionsAsync.pending, (state) => {
        state.isPermissionsLoading = true;
        state.error = null;
      })
      .addCase(fetchPermissionsAsync.fulfilled, (state, action: any) => {
        state.isPermissionsLoading = false;
        state.permissionsList = action.payload || {};
      })
      .addCase(fetchPermissionsAsync.rejected, (state, action: any) => {
        state.isPermissionsLoading = false;
        state.error = action.payload || 'Failed to fetch permissions';
      })
      // Create Role
      .addCase(createRoleAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createRoleAsync.fulfilled, (state, action: any) => {
        state.isLoading = false;
        if (action.payload) {
          state.roles.unshift(action.payload);
          state.totalRecords += 1;
        }
      })
      .addCase(createRoleAsync.rejected, (state, action: any) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to create role';
      })
      // Update Role
      .addCase(updateRoleAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateRoleAsync.fulfilled, (state, action: any) => {
        state.isLoading = false;
        const updated = action.payload;
        if (updated) {
          const targetId = updated.id || updated._id;
          state.roles = state.roles.map((r) => ((r.id || r._id) === targetId ? updated : r));
        }
      })
      .addCase(updateRoleAsync.rejected, (state, action: any) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to update role';
      })
      // Delete Role
      .addCase(deleteRoleAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteRoleAsync.fulfilled, (state, action: PayloadAction<string>) => {
        state.isLoading = false;
        state.roles = state.roles.filter((r) => (r.id || r._id) !== action.payload);
        state.totalRecords = Math.max(0, state.totalRecords - 1);
      })
      .addCase(deleteRoleAsync.rejected, (state, action: any) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to delete role';
      });
  },
});

export const { setCurrentPage, setRowsPerPage, clearRoleError } = roleSlice.actions;

export default roleSlice.reducer;

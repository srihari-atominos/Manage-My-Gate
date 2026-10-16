import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import staffService, {
  StaffMember,
  CreateStaffPayload,
  UpdateStaffPayload,
  GetStaffParams,
  AuthorizedUnit,
  EligibleStaff,
  StaffUnitAssociation,
  CreateStaffAssociationPayload,
  StaffAttendanceRecord,
  StaffAttendanceStats,
} from '../services/staffService';
import { isConnectivityErrorMessage } from '@/src/services/networkStatus';

// Connectivity is communicated once by the global network banner. Keeping it out of feature state
// prevents every staff screen from duplicating it as a destructive (red) form/list error.
const visibleStaffError = (payload: unknown): string | null => {
  const message = typeof payload === 'string' ? payload : '';
  return message && !isConnectivityErrorMessage(message) ? message : null;
};

export interface StaffState {
  staffList: StaffMember[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  selectedStaff: StaffMember | null;
  currentOrgId: string | null;
  myProfile: StaffMember | null;
  isProfileLoading: boolean;
  profileError: string | null;
  // Resident Staff Associations
  myUnits: AuthorizedUnit[];
  eligibleStaff: EligibleStaff[];
  associations: StaffUnitAssociation[];
  isAssociationsLoading: boolean;
  isAssociationSubmitting: boolean;
  associationError: string | null;
  // Staff Personal Allocated Units & Household Requests
  myAllocations: StaffUnitAssociation[];
  isAllocationsLoading: boolean;
  allocationsError: string | null;
  // Attendance & Reporting
  attendanceStats: StaffAttendanceStats | null;
  attendanceRecords: StaffAttendanceRecord[];
  attendancePagination: any;
  isAttendanceLoading: boolean;
  attendanceError: string | null;
  myAttendanceRecords: StaffAttendanceRecord[];
  isMyAttendanceLoading: boolean;
  myAttendanceError: string | null;
}

const initialState: StaffState = {
  staffList: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
  selectedStaff: null,
  currentOrgId: null,
  myProfile: null,
  isProfileLoading: false,
  profileError: null,
  myUnits: [],
  eligibleStaff: [],
  associations: [],
  isAssociationsLoading: false,
  isAssociationSubmitting: false,
  associationError: null,
  myAllocations: [],
  isAllocationsLoading: false,
  allocationsError: null,
  attendanceStats: null,
  attendanceRecords: [],
  attendancePagination: {},
  isAttendanceLoading: false,
  attendanceError: null,
  myAttendanceRecords: [],
  isMyAttendanceLoading: false,
  myAttendanceError: null,
};

export const fetchStaffThunk = createAsyncThunk(
  'staff/fetchStaff',
  async (params: GetStaffParams | undefined, { rejectWithValue }) => {
    try {
      const data = await staffService.getStaffList(params);
      return data;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to fetch staff');
    }
  }
);

export const createStaffThunk = createAsyncThunk(
  'staff/createStaff',
  async (payload: CreateStaffPayload, { rejectWithValue }) => {
    try {
      const created = await staffService.createStaff(payload);
      return created;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to create staff member');
    }
  }
);

export const updateStaffThunk = createAsyncThunk(
  'staff/updateStaff',
  async ({ id, payload }: { id: string; payload: UpdateStaffPayload }, { rejectWithValue }) => {
    try {
      const updated = await staffService.updateStaff(id, payload);
      return updated;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to update staff member');
    }
  }
);

export const deleteStaffThunk = createAsyncThunk(
  'staff/deleteStaff',
  async (id: string, { rejectWithValue }) => {
    try {
      await staffService.deleteStaff(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to deactivate staff member');
    }
  }
);

export const fetchMyProfileThunk = createAsyncThunk(
  'staff/fetchMyProfile',
  async (_, { rejectWithValue }) => {
    try {
      const data = await staffService.getMyProfile();
      return data;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to fetch personal staff profile');
    }
  }
);

export const fetchMyUnitsThunk = createAsyncThunk(
  'staff/fetchMyUnits',
  async (_, { rejectWithValue }) => {
    try {
      return await staffService.getMyAuthorizedUnits();
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to fetch authorized units');
    }
  }
);

export const fetchEligibleStaffThunk = createAsyncThunk(
  'staff/fetchEligibleStaff',
  async (_, { rejectWithValue }) => {
    try {
      return await staffService.getEligibleStaff();
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to fetch eligible staff');
    }
  }
);

export const fetchAssociationsThunk = createAsyncThunk(
  'staff/fetchAssociations',
  async (params: { villaId?: string; status?: string } | string | undefined, { rejectWithValue }) => {
    try {
      return await staffService.getUnitAssociations(params);
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to fetch staff associations');
    }
  }
);

export const createAssociationThunk = createAsyncThunk(
  'staff/createAssociation',
  async (payload: CreateStaffAssociationPayload, { rejectWithValue }) => {
    try {
      return await staffService.createAssociation(payload);
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to associate staff with unit');
    }
  }
);

export const removeAssociationThunk = createAsyncThunk(
  'staff/removeAssociation',
  async ({ id, reason }: { id: string; reason?: string }, { rejectWithValue }) => {
    try {
      return await staffService.removeAssociation(id, reason);
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to remove staff association');
    }
  }
);

export const fetchMyAllocationsThunk = createAsyncThunk(
  'staff/fetchMyAllocations',
  async (_, { rejectWithValue }) => {
    try {
      return await staffService.getMyAllocatedUnits();
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to fetch allocated units');
    }
  }
);

export const acceptAssociationThunk = createAsyncThunk(
  'staff/acceptAssociation',
  async (id: string, { rejectWithValue }) => {
    try {
      return await staffService.acceptAssociation(id);
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to accept allocation request');
    }
  }
);

export const rejectAssociationThunk = createAsyncThunk(
  'staff/rejectAssociation',
  async ({ id, reason }: { id: string; reason?: string }, { rejectWithValue }) => {
    try {
      return await staffService.rejectAssociation(id, reason);
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to decline allocation request');
    }
  }
);

export const fetchAttendanceStatsThunk = createAsyncThunk<
  StaffAttendanceStats,
  void | Record<string, any>
>(
  'staff/fetchAttendanceStats',
  async (params, { rejectWithValue }) => {
    try {
      return await staffService.getAttendanceStats(params || undefined);
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to fetch attendance stats');
    }
  }
);

export const fetchAttendanceHistoryThunk = createAsyncThunk<
  { records: StaffAttendanceRecord[]; pagination: any },
  void | Record<string, any>
>(
  'staff/fetchAttendanceHistory',
  async (params, { rejectWithValue }) => {
    try {
      return await staffService.getAttendanceHistory(params || undefined);
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to fetch attendance history');
    }
  }
);

export const fetchMyAttendanceThunk = createAsyncThunk<
  { records: StaffAttendanceRecord[]; pagination: any },
  void | Record<string, any>
>(
  'staff/fetchMyAttendance',
  async (params, { rejectWithValue }) => {
    try {
      return await staffService.getMyAttendance(params || undefined);
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to fetch personal attendance');
    }
  }
);

export const staffSlice = createSlice({
  name: 'staff',
  initialState,
  reducers: {
    setSelectedStaff: (state, action: PayloadAction<StaffMember | null>) => {
      state.selectedStaff = action.payload;
    },
    clearStaffError: (state) => {
      state.error = null;
      state.profileError = null;
      state.associationError = null;
      state.attendanceError = null;
      state.myAttendanceError = null;
    },
    setCurrentOrgId: (state, action: PayloadAction<string | null>) => {
      state.currentOrgId = action.payload;
    },
    resetStaffState: (state) => {
      state.staffList = [];
      state.isLoading = false;
      state.isSubmitting = false;
      state.error = null;
      state.selectedStaff = null;
      state.currentOrgId = null;
      state.myProfile = null;
      state.isProfileLoading = false;
      state.profileError = null;
      state.myUnits = [];
      state.eligibleStaff = [];
      state.associations = [];
      state.isAssociationsLoading = false;
      state.isAssociationSubmitting = false;
      state.associationError = null;
      state.attendanceStats = null;
      state.attendanceRecords = [];
      state.attendancePagination = {};
      state.isAttendanceLoading = false;
      state.attendanceError = null;
      state.myAttendanceRecords = [];
      state.isMyAttendanceLoading = false;
      state.myAttendanceError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchStaffThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStaffThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.staffList = action.payload;
      })
      .addCase(fetchStaffThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = visibleStaffError(action.payload);
      })
      // Fetch My Profile (Self-Service)
      .addCase(fetchMyProfileThunk.pending, (state) => {
        state.isProfileLoading = true;
        state.profileError = null;
      })
      .addCase(fetchMyProfileThunk.fulfilled, (state, action) => {
        state.isProfileLoading = false;
        state.myProfile = action.payload;
      })
      .addCase(fetchMyProfileThunk.rejected, (state, action) => {
        state.isProfileLoading = false;
        state.profileError = visibleStaffError(action.payload);
      })
      // Create
      .addCase(createStaffThunk.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(createStaffThunk.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const index = state.staffList.findIndex((s) => s._id === action.payload._id);
        if (index >= 0) {
          state.staffList[index] = action.payload;
        } else {
          state.staffList.unshift(action.payload);
        }
      })
      .addCase(createStaffThunk.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = visibleStaffError(action.payload);
      })
      // Update
      .addCase(updateStaffThunk.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(updateStaffThunk.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const index = state.staffList.findIndex((s) => s._id === action.payload._id);
        if (index >= 0) {
          state.staffList[index] = action.payload;
        }
        if (state.selectedStaff?._id === action.payload._id) {
          state.selectedStaff = action.payload;
        }
        if (state.myProfile?._id === action.payload._id) {
          state.myProfile = action.payload;
        }
      })
      .addCase(updateStaffThunk.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = visibleStaffError(action.payload);
      })
      // Delete
      .addCase(deleteStaffThunk.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(deleteStaffThunk.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.staffList = state.staffList.filter((s) => s._id !== action.payload);
        if (state.selectedStaff?._id === action.payload) {
          state.selectedStaff = null;
        }
        if (state.myProfile?._id === action.payload) {
          state.myProfile = null;
        }
      })
      .addCase(deleteStaffThunk.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = visibleStaffError(action.payload);
      })
      // My Units
      .addCase(fetchMyUnitsThunk.fulfilled, (state, action) => {
        state.myUnits = action.payload;
      })
      // Eligible Staff
      .addCase(fetchEligibleStaffThunk.fulfilled, (state, action) => {
        state.eligibleStaff = action.payload;
      })
      // Fetch Associations
      .addCase(fetchAssociationsThunk.pending, (state) => {
        state.isAssociationsLoading = true;
        state.associationError = null;
      })
      .addCase(fetchAssociationsThunk.fulfilled, (state, action) => {
        state.isAssociationsLoading = false;
        state.associations = action.payload;
      })
      .addCase(fetchAssociationsThunk.rejected, (state, action) => {
        state.isAssociationsLoading = false;
        state.associationError = visibleStaffError(action.payload);
      })
      // Create Association
      .addCase(createAssociationThunk.pending, (state) => {
        state.isAssociationSubmitting = true;
        state.associationError = null;
      })
      .addCase(createAssociationThunk.fulfilled, (state, action) => {
        state.isAssociationSubmitting = false;
        state.associations.unshift(action.payload);
      })
      .addCase(createAssociationThunk.rejected, (state, action) => {
        state.isAssociationSubmitting = false;
        state.associationError = visibleStaffError(action.payload);
      })
      // Remove Association
      .addCase(removeAssociationThunk.pending, (state) => {
        state.isAssociationSubmitting = true;
        state.associationError = null;
      })
      .addCase(removeAssociationThunk.fulfilled, (state, action) => {
        state.isAssociationSubmitting = false;
        state.associations = (state.associations || []).filter((a) => a._id !== action.payload._id);
        state.myAllocations = (state.myAllocations || []).filter((a) => a._id !== action.payload._id);
      })
      .addCase(removeAssociationThunk.rejected, (state, action) => {
        state.isAssociationSubmitting = false;
        state.associationError = visibleStaffError(action.payload);
      })
      // My Allocations (Self-Service)
      .addCase(fetchMyAllocationsThunk.pending, (state) => {
        state.isAllocationsLoading = true;
        state.allocationsError = null;
      })
      .addCase(fetchMyAllocationsThunk.fulfilled, (state, action) => {
        state.isAllocationsLoading = false;
        state.myAllocations = action.payload;
      })
      .addCase(fetchMyAllocationsThunk.rejected, (state, action) => {
        state.isAllocationsLoading = false;
        state.allocationsError = visibleStaffError(action.payload);
      })
      // Accept Allocation
      .addCase(acceptAssociationThunk.fulfilled, (state, action) => {
        const index = state.myAllocations.findIndex((a) => a._id === action.payload._id);
        if (index >= 0) {
          state.myAllocations[index] = action.payload;
        } else {
          state.myAllocations.unshift(action.payload);
        }
      })
      // Reject Allocation
      .addCase(rejectAssociationThunk.fulfilled, (state, action) => {
        const index = state.myAllocations.findIndex((a) => a._id === action.payload._id);
        if (index >= 0) {
          state.myAllocations[index] = action.payload;
        }
      })
      // Attendance Stats
      .addCase(fetchAttendanceStatsThunk.pending, (state) => {
        state.isAttendanceLoading = true;
        state.attendanceError = null;
      })
      .addCase(fetchAttendanceStatsThunk.fulfilled, (state, action) => {
        state.isAttendanceLoading = false;
        state.attendanceStats = action.payload;
      })
      .addCase(fetchAttendanceStatsThunk.rejected, (state, action) => {
        state.isAttendanceLoading = false;
        state.attendanceError = visibleStaffError(action.payload);
      })
      // Attendance History
      .addCase(fetchAttendanceHistoryThunk.pending, (state) => {
        state.isAttendanceLoading = true;
        state.attendanceError = null;
      })
      .addCase(fetchAttendanceHistoryThunk.fulfilled, (state, action) => {
        state.isAttendanceLoading = false;
        state.attendanceRecords = action.payload.records || [];
        state.attendancePagination = action.payload.pagination || {};
      })
      .addCase(fetchAttendanceHistoryThunk.rejected, (state, action) => {
        state.isAttendanceLoading = false;
        state.attendanceError = visibleStaffError(action.payload);
      })
      // My Attendance (Self-Service)
      .addCase(fetchMyAttendanceThunk.pending, (state) => {
        state.isMyAttendanceLoading = true;
        state.myAttendanceError = null;
      })
      .addCase(fetchMyAttendanceThunk.fulfilled, (state, action) => {
        state.isMyAttendanceLoading = false;
        state.myAttendanceRecords = action.payload.records || [];
      })
      .addCase(fetchMyAttendanceThunk.rejected, (state, action) => {
        state.isMyAttendanceLoading = false;
        state.myAttendanceError = visibleStaffError(action.payload);
      });
  },
});

export const {
  setSelectedStaff,
  clearStaffError,
  setCurrentOrgId,
  resetStaffState,
} = staffSlice.actions;

export default staffSlice.reducer;

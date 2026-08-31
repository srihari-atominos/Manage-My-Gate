import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import directoryApi from '../services/directoryApi';
import { DirectoryMember, DirectoryPagination } from '../types/directoryTypes';

export interface DirectoryState {
  members: DirectoryMember[];
  pagination: DirectoryPagination;
  searchQuery: string;
  activeTab: string;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

export const DUMMY_MEMBERS: DirectoryMember[] = [
  {
    id: 'dummy-1',
    userId: 'user-dummy-1',
    name: 'Arun Kumar',
    role: 'resident',
    designation: 'Villa Resident',
    unitNumber: 'Villa 104',
    phone: '+919876543210',
    email: 'arun.kumar@community.org',
    intercomNumber: '104',
    avatarUrl: null,
    isOnline: true,
    allowDirectoryMessages: true,
    showPhoneInDirectory: true,
    allowIntercomCalls: true,
    interests: ['Badminton 🏸', 'Coffee & Chat ☕', 'Fitness 🏋️'],
  },
  {
    id: 'dummy-2',
    userId: 'user-dummy-2',
    name: 'Priya Sharma',
    role: 'resident',
    designation: 'Block B Resident',
    unitNumber: 'Block B - 202',
    phone: '+919876543211',
    email: 'priya.sharma@community.org',
    intercomNumber: '202',
    avatarUrl: null,
    isOnline: true,
    allowDirectoryMessages: true,
    showPhoneInDirectory: true,
    allowIntercomCalls: true,
    interests: ['Book Club 📚', 'Gardening 🌱', 'Coffee & Chat ☕'],
  },
  {
    id: 'dummy-3',
    userId: 'user-dummy-3',
    name: 'Raj Kumar',
    role: 'security',
    designation: 'Main Gate Security Supervisor',
    unitNumber: '',
    phone: '+919876543212',
    email: 'security.main@community.org',
    intercomNumber: '99',
    avatarUrl: null,
    isOnline: true,
    allowDirectoryMessages: true,
    showPhoneInDirectory: true,
    allowIntercomCalls: true,
  },
  {
    id: 'dummy-4',
    userId: 'user-dummy-4',
    name: 'Suresh',
    role: 'maintenance',
    designation: 'Lead Electrician & Plumbing',
    unitNumber: '',
    phone: '+919876543213',
    email: 'maintenance.suresh@community.org',
    intercomNumber: '98',
    avatarUrl: null,
    isOnline: true,
    allowDirectoryMessages: true,
    showPhoneInDirectory: true,
    allowIntercomCalls: true,
  },
  {
    id: 'dummy-5',
    userId: 'user-dummy-5',
    name: 'Vikram Mehta',
    role: 'management',
    designation: 'Community General Manager',
    unitNumber: 'Management Office',
    phone: '+919876543214',
    email: 'manager@community.org',
    intercomNumber: '100',
    avatarUrl: null,
    isOnline: true,
    allowDirectoryMessages: true,
    showPhoneInDirectory: true,
    allowIntercomCalls: true,
  },
];

const initialState: DirectoryState = {
  members: DUMMY_MEMBERS,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalRecords: DUMMY_MEMBERS.length,
    limit: 50,
  },
  searchQuery: '',
  activeTab: 'all',
  loading: false,
  refreshing: false,
  error: null,
};

export const fetchDirectory = createAsyncThunk(
  'directory/fetchDirectory',
  async (
    params: { role?: string; search?: string; page?: number; limit?: number; refreshing?: boolean } | undefined,
    { rejectWithValue }
  ) => {
    try {
      const response = await directoryApi.fetchDirectory({
        role: params?.role,
        search: params?.search,
        page: params?.page || 1,
        limit: params?.limit || 50,
      });
      return {
        ...response,
        page: params?.page || 1,
        refreshing: params?.refreshing || false,
      };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to fetch directory');
    }
  }
);

const directorySlice = createSlice({
  name: 'directory',
  initialState,
  reducers: {
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setActiveTab(state, action: PayloadAction<string>) {
      state.activeTab = action.payload;
      state.pagination.currentPage = 1;
    },
    resetDirectoryState(state) {
      state.members = DUMMY_MEMBERS;
      state.pagination = initialState.pagination;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDirectory.pending, (state, action) => {
        if (action.meta.arg?.refreshing) {
          state.refreshing = true;
        } else {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchDirectory.fulfilled, (state, action) => {
        state.loading = false;
        state.refreshing = false;

        const payload = action.payload || {};
        const safeData = Array.isArray(payload.data) && payload.data.length > 0 ? payload.data : DUMMY_MEMBERS;
        const page = payload.page || 1;

        if (page === 1) {
          state.members = safeData;
        } else {
          // Append new items avoiding duplicates
          const existingMembers = Array.isArray(state.members) ? state.members : [];
          const existingIds = new Set(existingMembers.map((m) => m.id || m.userId));
          const newItems = safeData.filter((m) => !existingIds.has(m.id || m.userId));
          state.members = [...existingMembers, ...newItems];
        }

        state.pagination = payload.pagination || {
          currentPage: page,
          totalPages: 1,
          totalRecords: safeData.length,
          limit: 50,
        };
      })
      .addCase(fetchDirectory.rejected, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.members = DUMMY_MEMBERS;
        state.error = action.payload as string;
      });
  },
});

export const { setSearchQuery, setActiveTab, resetDirectoryState } = directorySlice.actions;
export default directorySlice.reducer;

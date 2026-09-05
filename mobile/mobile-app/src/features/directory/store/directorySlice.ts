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
    role: 'management',
    designation: 'Admin (Palm Meadows)',
    unitNumber: 'Villa 101',
    phone: '+919876543210',
    email: 'arun.kumar@community.org',
    intercomNumber: '101',
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
    designation: 'Tenant/Owner (Palm Meadows)',
    unitNumber: 'Villa 102',
    phone: '+919876543211',
    email: 'priya.sharma@community.org',
    intercomNumber: '102',
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
    name: 'Vikram Mehta',
    role: 'resident',
    designation: 'Tenant/Owner (Palm Meadows)',
    unitNumber: 'Villa 103',
    phone: '+919876543212',
    email: 'vikram.mehta@community.org',
    intercomNumber: '103',
    avatarUrl: null,
    isOnline: false,
    allowDirectoryMessages: true,
    showPhoneInDirectory: true,
    allowIntercomCalls: true,
    interests: ['Tennis 🎾', 'Swimming 🏊', 'Finance 📈'],
  },
  {
    id: 'dummy-4',
    userId: 'user-dummy-4',
    name: 'Dr. Meera Reddy',
    role: 'resident',
    designation: 'Tenant/Owner (Palm Meadows)',
    unitNumber: 'Villa 104',
    phone: '+919876543216',
    email: 'meera.reddy@community.org',
    intercomNumber: '104',
    avatarUrl: null,
    isOnline: true,
    allowDirectoryMessages: true,
    showPhoneInDirectory: true,
    allowIntercomCalls: true,
    interests: ['Healthcare 🩺', 'Running 🏃‍♀️', 'Volunteering 🤝'],
  },
  {
    id: 'dummy-5',
    userId: 'user-dummy-5',
    name: 'Sunita Rao',
    role: 'resident',
    designation: 'Tenant/Owner (Palm Meadows)',
    unitNumber: 'Villa 105',
    phone: '+919876543218',
    email: 'sunita.rao@accounts.org',
    intercomNumber: '105',
    avatarUrl: null,
    isOnline: true,
    allowDirectoryMessages: true,
    showPhoneInDirectory: true,
    allowIntercomCalls: true,
    interests: ['Auditing 📊', 'Badminton 🏸', 'Baking 🧁'],
  },
  {
    id: 'dummy-6',
    userId: 'user-dummy-6',
    name: 'Rohan Patel',
    role: 'resident',
    designation: 'Tenant/Owner (Emerald Valley)',
    unitNumber: 'Villa 201',
    phone: '+919876543217',
    email: 'rohan.patel@community.org',
    intercomNumber: '201',
    avatarUrl: null,
    isOnline: false,
    allowDirectoryMessages: true,
    showPhoneInDirectory: false,
    allowIntercomCalls: true,
    interests: ['Cycling 🚴', 'Tech & Coding 💻'],
  },
  {
    id: 'dummy-7',
    userId: 'user-dummy-7',
    name: 'Ananya Roy',
    role: 'resident',
    designation: 'Tenant/Owner (Emerald Valley)',
    unitNumber: 'Villa 202',
    phone: '+919876543213',
    email: 'ananya.roy@community.org',
    intercomNumber: '202',
    avatarUrl: null,
    isOnline: true,
    allowDirectoryMessages: true,
    showPhoneInDirectory: true,
    allowIntercomCalls: true,
    interests: ['Yoga 🧘', 'Music 🎵', 'Art & Craft 🎨'],
  },
  {
    id: 'dummy-8',
    userId: 'user-dummy-8',
    name: 'David D\'Souza',
    role: 'management',
    designation: 'Admin (Emerald Valley)',
    unitNumber: 'Villa 203',
    phone: '+919876543219',
    email: 'david.dsouza@facility.org',
    intercomNumber: '203',
    avatarUrl: null,
    isOnline: true,
    allowDirectoryMessages: true,
    showPhoneInDirectory: true,
    allowIntercomCalls: true,
  },
  {
    id: 'dummy-9',
    userId: 'user-dummy-9',
    name: 'Suresh Nair',
    role: 'resident',
    designation: 'Tenant/Owner (Skyline Heights)',
    unitNumber: 'Block A - 101',
    phone: '+919876543215',
    email: 'suresh.nair@maintenance.org',
    intercomNumber: '301',
    avatarUrl: null,
    isOnline: true,
    allowDirectoryMessages: true,
    showPhoneInDirectory: true,
    allowIntercomCalls: true,
  },
  {
    id: 'dummy-10',
    userId: 'user-dummy-10',
    name: 'Rajesh Verma',
    role: 'security',
    designation: 'Security (Skyline Heights & Gate)',
    unitNumber: 'Block B - 101',
    phone: '+919876543214',
    email: 'rajesh.verma@security.org',
    intercomNumber: '99',
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

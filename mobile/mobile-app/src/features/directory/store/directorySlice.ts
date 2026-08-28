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

const initialState: DirectoryState = {
  members: [],
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
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
      state.members = [];
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
        const safeData = Array.isArray(payload.data) ? payload.data : [];
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
        state.error = action.payload as string;
      });
  },
});

export const { setSearchQuery, setActiveTab, resetDirectoryState } = directorySlice.actions;
export default directorySlice.reducer;

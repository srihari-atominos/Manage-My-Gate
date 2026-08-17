import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getNotices,
  getNoticeById,
  createNotice as apiCreateNotice,
  updateNotice as apiUpdateNotice,
  deleteNotice as apiDeleteNotice,
  togglePin as apiTogglePin,
  markAsRead as apiMarkAsRead,
  bookmarkNotice as apiBookmarkNotice,
  getNoticeStats as apiGetNoticeStats,
} from '../services/noticeBoardService';

// Async Thunks
export const fetchNotices = createAsyncThunk(
  'noticeBoard/fetchNotices',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { noticeBoard } = getState();
      const params = {
        search: noticeBoard.search,
        page: noticeBoard.pagination.currentPage,
        limit: noticeBoard.pagination.limit,
        sortBy: noticeBoard.sort.sortBy,
        sortOrder: noticeBoard.sort.sortOrder,
        ...noticeBoard.filters,
      };
      
      // Inject KPI card filter override if active
      if (noticeBoard.activeKpiCard) {
        if (noticeBoard.activeKpiCard === 'High') {
          params.priority = 'High';
        } else {
          params.status = noticeBoard.activeKpiCard;
        }
      }

      // Clean up empty params
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await getNotices(params);
      try {
        const { default: storage } = await import('../../../utils/storage');
        const notices = response.data?.data?.data || response.data?.data || [];
        if (notices && notices.length > 0) {
          await storage.setItem('cached_notices', JSON.stringify(notices));
        }
      } catch (cacheErr) {
        console.warn('Failed to cache notices:', cacheErr);
      }
      return response.data; // Aligned to API envelope unwrapping
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch notices');
    }
  }
);

export const fetchNoticeById = createAsyncThunk(
  'noticeBoard/fetchNoticeById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await getNoticeById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch notice');
    }
  }
);

export const createNotice = createAsyncThunk(
  'noticeBoard/createNotice',
  async (formData, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiCreateNotice(formData);
      dispatch(fetchNotices());
      dispatch(fetchNoticeStats());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create notice');
    }
  }
);

export const updateNotice = createAsyncThunk(
  'noticeBoard/updateNotice',
  async ({ id, formData }, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiUpdateNotice(id, formData);
      dispatch(fetchNotices());
      dispatch(fetchNoticeStats());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update notice');
    }
  }
);

export const deleteNotice = createAsyncThunk(
  'noticeBoard/deleteNotice',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiDeleteNotice(id);
      dispatch(fetchNotices());
      dispatch(fetchNoticeStats());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete notice');
    }
  }
);

export const togglePinNotice = createAsyncThunk(
  'noticeBoard/togglePinNotice',
  async ({ id, isPinned }, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiTogglePin(id, isPinned);
      dispatch(fetchNoticeStats());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to pin/unpin notice');
    }
  }
);

export const markNoticeAsRead = createAsyncThunk(
  'noticeBoard/markNoticeAsRead',
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiMarkAsRead(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark notice as read');
    }
  }
);

export const bookmarkNotice = createAsyncThunk(
  'noticeBoard/bookmarkNotice',
  async ({ id, isBookmarked }, { rejectWithValue }) => {
    try {
      const response = await apiBookmarkNotice(id, isBookmarked);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to bookmark notice');
    }
  }
);

export const fetchNoticeStats = createAsyncThunk(
  'noticeBoard/fetchNoticeStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiGetNoticeStats();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch notice statistics');
    }
  }
);

export const loadCachedNotices = createAsyncThunk(
  'noticeBoard/loadCachedNotices',
  async (_, { rejectWithValue }) => {
    try {
      const { default: storage } = await import('../../../utils/storage');
      const cached = await storage.getItem('cached_notices');
      if (cached) {
        return JSON.parse(cached);
      }
      return [];
    } catch (error) {
      return rejectWithValue('Failed to load cached notices');
    }
  }
);

// Initial Redux State
const initialState = {
  notices: [],
  selectedNotice: null,
  loading: false,
  error: null,
  success: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 10,
  },
  search: '',
  filters: {
    category: '',
    priority: '',
    status: '',
    isPinned: '',
    isBookmarked: '',
    readStatus: '',
  },
  activeKpiCard: null, // 'Published' | 'Draft' | 'High' | 'Expired' | null
  sort: {
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
  dashboardStats: {
    kpis: {
      activeNotices: 0,
      draftNotices: 0,
      expiredNotices: 0,
      scheduledNotices: 0,
      archivedNotices: 0,
      urgentNotices: 0,
    },
    categories: {
      General: 0,
      Maintenance: 0,
      Events: 0,
      Emergency: 0,
      Meetings: 0,
    },
    recentActivity: [],
    trends: [],
  },
  dashboardLoading: false,
  dashboardError: null,
};

// Redux Slice
export const noticeBoardSlice = createSlice({
  name: 'noticeBoard',
  initialState,
  reducers: {
    setSearch: (state, action) => {
      state.search = action.payload;
      state.pagination.currentPage = 1;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      state.activeKpiCard = null; // Clear KPI card filter when manual filters change
      state.pagination.currentPage = 1;
    },
    setActiveKpiCard: (state, action) => {
      state.activeKpiCard = action.payload;
      state.pagination.currentPage = 1;
    },
    setSort: (state, action) => {
      state.sort = { ...state.sort, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
      state.activeKpiCard = null;
      state.search = '';
      state.sort = { ...initialState.sort };
      state.pagination.currentPage = 1;
    },
    setCurrentPage: (state, action) => {
      state.pagination.currentPage = action.payload;
    },
    setLimit: (state, action) => {
      state.pagination.limit = action.payload;
      state.pagination.currentPage = 1;
    },
    selectNotice: (state, action) => {
      state.selectedNotice = action.payload;
    },
    clearNoticeErrors: (state) => {
      state.error = null;
      state.dashboardError = null;
    },
    clearNoticeSuccess: (state) => {
      state.success = null;
    },
    clearNotices: (state) => {
      state.notices = [];
      state.pagination = initialState.pagination;
    },
  },
  extraReducers: (builder) => {
    builder
      // Load Cached Notices
      .addCase(loadCachedNotices.fulfilled, (state, action) => {
        if (state.notices.length === 0 && action.payload && action.payload.length > 0) {
          state.notices = action.payload;
        }
      })
      // Fetch Notices List
      .addCase(fetchNotices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotices.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload || {};
        
        // Handle nested data envelope: payload.data might be { data: [], pagination: {} }
        const dataEnvelope = payload.data || {};
        const noticesData = dataEnvelope.data || (Array.isArray(dataEnvelope) ? dataEnvelope : []);
        const pagination = dataEnvelope.pagination || payload.pagination || null;
        
        state.notices = noticesData;
        if (pagination) {
          state.pagination = { ...state.pagination, ...pagination };
        }
      })
      .addCase(fetchNotices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Notice by ID
      .addCase(fetchNoticeById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNoticeById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedNotice = action.payload.data || action.payload;
      })
      .addCase(fetchNoticeById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Create Notice
      .addCase(createNotice.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(createNotice.fulfilled, (state, action) => {
        state.loading = false;
        state.success = 'createSuccess';
      })
      .addCase(createNotice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update Notice
      .addCase(updateNotice.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(updateNotice.fulfilled, (state) => {
        state.loading = false;
        state.success = 'updateSuccess';
      })
      .addCase(updateNotice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Delete Notice
      .addCase(deleteNotice.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(deleteNotice.fulfilled, (state) => {
        state.loading = false;
        state.success = 'deleteSuccess';
      })
      .addCase(deleteNotice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Toggle Pin
      .addCase(togglePinNotice.fulfilled, (state, action) => {
        const updatedNotice = action.payload.data || action.payload;
        if (updatedNotice) {
          // Optimistically update pinned flag across list
          state.notices = state.notices.map((n) => {
            if (n._id === updatedNotice._id) {
              return { ...n, isPinned: updatedNotice.isPinned };
            }
            // A pin policy allows maximum 1 pin per organization.
            // If updatedNotice is pinned, unpin all other notices.
            return updatedNotice.isPinned ? { ...n, isPinned: false } : n;
          });
          if (state.selectedNotice?._id === updatedNotice._id) {
            state.selectedNotice.isPinned = updatedNotice.isPinned;
          }
        }
      })

      // Mark Notice as Read
      .addCase(markNoticeAsRead.fulfilled, (state, action) => {
        const updatedNotice = action.payload.data || action.payload;
        if (updatedNotice) {
          state.notices = state.notices.map((n) =>
            n._id === updatedNotice._id ? { ...n, isReadByUser: true, readerCount: updatedNotice.readerCount } : n
          );
          if (state.selectedNotice?._id === updatedNotice._id) {
            state.selectedNotice.isReadByUser = true;
            state.selectedNotice.readerCount = updatedNotice.readerCount;
          }
        }
      })

      // Toggle Bookmark
      .addCase(bookmarkNotice.fulfilled, (state, action) => {
        const updatedNotice = action.payload.data || action.payload;
        if (updatedNotice) {
          state.notices = state.notices.map((n) =>
            n._id === updatedNotice._id ? { ...n, isBookmarkedByUser: updatedNotice.isBookmarkedByUser } : n
          );
          if (state.selectedNotice?._id === updatedNotice._id) {
            state.selectedNotice.isBookmarkedByUser = updatedNotice.isBookmarkedByUser;
          }
        }
      })

      // Fetch Stats
      .addCase(fetchNoticeStats.pending, (state) => {
        state.dashboardLoading = true;
        state.dashboardError = null;
      })
      .addCase(fetchNoticeStats.fulfilled, (state, action) => {
        state.dashboardLoading = false;
        state.dashboardStats = action.payload.data || action.payload;
      })
      .addCase(fetchNoticeStats.rejected, (state, action) => {
        state.dashboardLoading = false;
        state.dashboardError = action.payload;
      });
  },
});

export const {
  setSearch,
  setFilters,
  setActiveKpiCard,
  setSort,
  resetFilters,
  setCurrentPage,
  setLimit,
  selectNotice,
  clearNoticeErrors,
  clearNoticeSuccess,
  clearNotices,
} = noticeBoardSlice.actions;

export default noticeBoardSlice.reducer;

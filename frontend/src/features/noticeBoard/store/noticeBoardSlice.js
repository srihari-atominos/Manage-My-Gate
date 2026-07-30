import { createSlice } from '@reduxjs/toolkit'
import {
  fetchNotices,
  fetchNoticeById,
  createNotice,
  updateNotice,
  deleteNotice,
  togglePin,
  fetchNoticeStats,
  markAsRead,
  bookmarkNotice,
} from './noticeBoardThunk.js'

// Feature-level Constants defined directly inside the slice
export const CATEGORIES = {
  GENERAL: 'General',
  MAINTENANCE: 'Maintenance',
  EVENTS: 'Events',
  EMERGENCY: 'Emergency',
  MEETINGS: 'Meetings',
}

export const PRIORITIES = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
}

export const STATUSES = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  SCHEDULED: 'Scheduled',
  ARCHIVED: 'Archived',
  EXPIRED: 'Expired',
}

const initialState = {
  notices: [],
  selectedNotice: null,
  loading: false,
  error: null,
  success: null, // For tracking success types
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
  sort: {
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
  totalRecords: 0,
  totalPages: 1,
  currentPage: 1,
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
}

const noticeBoardSlice = createSlice({
  name: 'noticeBoard',
  initialState,
  reducers: {
    setSearch: (state, action) => {
      state.search = action.payload
      state.pagination.currentPage = 1
      state.currentPage = 1
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload }
      state.pagination.currentPage = 1
      state.currentPage = 1
    },
    setSort: (state, action) => {
      state.sort = { ...state.sort, ...action.payload }
    },
    resetFilters: (state) => {
      state.search = ''
      state.filters = {
        category: '',
        priority: '',
        status: '',
        isPinned: '',
        isBookmarked: '',
        readStatus: '',
      }
      state.sort = {
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }
      state.pagination.currentPage = 1
      state.currentPage = 1
    },
    setCurrentPage: (state, action) => {
      state.pagination.currentPage = action.payload
      state.currentPage = action.payload
    },
    setLimit: (state, action) => {
      state.pagination.limit = action.payload
      state.pagination.currentPage = 1
      state.currentPage = 1
    },
    selectNotice: (state, action) => {
      state.selectedNotice = action.payload
    },
    clearNoticeErrors: (state) => {
      state.error = null
    },
    clearNoticeSuccess: (state) => {
      state.success = null
    },
    clearNotices: (state) => {
      state.notices = []
      state.totalRecords = 0
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchNotices
      .addCase(fetchNotices.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchNotices.fulfilled, (state, action) => {
        state.loading = false
        state.notices = action.payload.notices || []
        state.pagination.currentPage = action.payload.pagination?.currentPage || 1
        state.pagination.totalPages = action.payload.pagination?.totalPages || 1
        state.pagination.totalRecords = action.payload.pagination?.totalRecords || 0
        state.currentPage = action.payload.pagination?.currentPage || 1
        state.totalPages = action.payload.pagination?.totalPages || 1
        state.totalRecords = action.payload.pagination?.totalRecords || 0
      })
      .addCase(fetchNotices.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to load notices'
      })

      // fetchNoticeById
      .addCase(fetchNoticeById.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchNoticeById.fulfilled, (state, action) => {
        state.loading = false
        state.selectedNotice = action.payload
      })
      .addCase(fetchNoticeById.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to load notice details'
      })

      // createNotice
      .addCase(createNotice.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createNotice.fulfilled, (state) => {
        state.loading = false
        state.success = 'createSuccess'
      })
      .addCase(createNotice.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to create notice'
      })

      // updateNotice
      .addCase(updateNotice.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateNotice.fulfilled, (state) => {
        state.loading = false
        state.success = 'updateSuccess'
      })
      .addCase(updateNotice.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to update notice'
      })

      // deleteNotice
      .addCase(deleteNotice.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteNotice.fulfilled, (state) => {
        state.loading = false
        state.success = 'deleteSuccess'
      })
      .addCase(deleteNotice.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to delete notice'
      })

      // togglePin
      .addCase(togglePin.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(togglePin.fulfilled, (state, action) => {
        state.loading = false
        state.success = 'pinSuccess'

        // Direct local state sync to avoid immediate refresh flashes
        const updatedNotice = action.payload.notice || action.payload
        if (updatedNotice) {
          // If a notice was pinned, we must unpin other local notices
          if (updatedNotice.isPinned) {
            state.notices = state.notices.map((n) => ({
              ...n,
              isPinned: n._id === updatedNotice._id,
            }))
          } else {
            state.notices = state.notices.map((n) =>
              n._id === updatedNotice._id ? { ...n, isPinned: false } : n,
            )
          }
          if (state.selectedNotice && state.selectedNotice._id === updatedNotice._id) {
            state.selectedNotice = { ...state.selectedNotice, ...updatedNotice }
          }
        }
      })
      .addCase(togglePin.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to update notice pinned status'
      })

      // markAsRead
      .addCase(markAsRead.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        state.loading = false
        state.success = 'readSuccess'

        const updatedNotice = action.payload.notice || action.payload
        if (updatedNotice) {
          state.notices = state.notices.map((n) =>
            n._id === updatedNotice._id
              ? { ...n, isReadByUser: true, readerCount: updatedNotice.readerCount }
              : n,
          )
          if (state.selectedNotice && state.selectedNotice._id === updatedNotice._id) {
            state.selectedNotice = {
              ...state.selectedNotice,
              isReadByUser: true,
              readerCount: updatedNotice.readerCount,
            }
          }
        }
      })
      .addCase(markAsRead.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to mark notice as read'
      })

      // bookmarkNotice
      .addCase(bookmarkNotice.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(bookmarkNotice.fulfilled, (state, action) => {
        state.loading = false
        state.success = 'bookmarkSuccess'

        const updatedNotice = action.payload.notice || action.payload
        if (updatedNotice) {
          state.notices = state.notices.map((n) =>
            n._id === updatedNotice._id
              ? { ...n, isBookmarkedByUser: updatedNotice.isBookmarkedByUser }
              : n,
          )
          if (state.selectedNotice && state.selectedNotice._id === updatedNotice._id) {
            state.selectedNotice = {
              ...state.selectedNotice,
              isBookmarkedByUser: updatedNotice.isBookmarkedByUser,
            }
          }
        }
      })
      .addCase(bookmarkNotice.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to update bookmark'
      })

      // fetchNoticeStats
      .addCase(fetchNoticeStats.pending, (state) => {
        state.dashboardLoading = true
        state.dashboardError = null
      })
      .addCase(fetchNoticeStats.fulfilled, (state, action) => {
        state.dashboardLoading = false
        state.dashboardStats = action.payload
      })
      .addCase(fetchNoticeStats.rejected, (state, action) => {
        state.dashboardLoading = false
        state.dashboardError = action.payload || 'Failed to load notice statistics'
      })
  },
})

export const {
  setSearch,
  setFilters,
  setSort,
  resetFilters,
  setCurrentPage,
  setLimit,
  selectNotice,
  clearNoticeErrors,
  clearNoticeSuccess,
  clearNotices,
} = noticeBoardSlice.actions

export default noticeBoardSlice.reducer

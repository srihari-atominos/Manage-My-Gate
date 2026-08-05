import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import noticeBoardService from '../services/noticeBoardService';

export interface Notice {
  _id: string;
  title: string;
  content: string;
  category: string;
  priority: string;
  status: string;
  isPinned: boolean;
  isReadByUser?: boolean;
  isBookmarkedByUser?: boolean;
  readerCount: number;
  createdAt: string;
}

interface NoticeBoardState {
  notices: Notice[];
  selectedNotice: Notice | null;
  loading: boolean;
  error: string | null;
  success: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    limit: number;
  };
  search: string;
  filters: {
    category: string;
    priority: string;
    status: string;
    isPinned: string;
    isBookmarked: string;
    readStatus: string;
  };
  sort: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
}

const initialState: NoticeBoardState = {
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
  sort: {
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
};

// Thunks
export const fetchNotices = createAsyncThunk(
  'noticeBoard/fetchNotices',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const { search, filters, pagination, sort } = state.noticeBoard;
      const response = await noticeBoardService.getNotices(search, filters, pagination, sort);
      return response as any;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load notices');
    }
  }
);

export const fetchNoticeById = createAsyncThunk(
  'noticeBoard/fetchNoticeById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await noticeBoardService.getNoticeById(id);
      return response as any;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load notice details');
    }
  }
);

export const createNotice = createAsyncThunk(
  'noticeBoard/createNotice',
  async (noticeData: any, { rejectWithValue }) => {
    try {
      const response = await noticeBoardService.createNotice(noticeData);
      return response as any;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create notice');
    }
  }
);

export const updateNotice = createAsyncThunk(
  'noticeBoard/updateNotice',
  async ({ id, noticeData }: { id: string; noticeData: any }, { rejectWithValue }) => {
    try {
      const response = await noticeBoardService.updateNotice(id, noticeData);
      return response as any;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update notice');
    }
  }
);

export const deleteNotice = createAsyncThunk(
  'noticeBoard/deleteNotice',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await noticeBoardService.deleteNotice(id);
      return response as any;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete notice');
    }
  }
);

export const togglePin = createAsyncThunk(
  'noticeBoard/togglePin',
  async ({ id, isPinned }: { id: string; isPinned: boolean }, { rejectWithValue }) => {
    try {
      const response = await noticeBoardService.togglePin(id, isPinned);
      return response as any;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update notice pinned status');
    }
  }
);

export const markAsRead = createAsyncThunk(
  'noticeBoard/markAsRead',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await noticeBoardService.markAsRead(id);
      return response as any;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to mark notice as read');
    }
  }
);

export const bookmarkNotice = createAsyncThunk(
  'noticeBoard/bookmarkNotice',
  async ({ id, isBookmarked }: { id: string; isBookmarked: boolean }, { rejectWithValue }) => {
    try {
      const response = await noticeBoardService.bookmarkNotice(id, isBookmarked);
      return response as any;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update bookmark');
    }
  }
);

const noticeBoardSlice = createSlice({
  name: 'noticeBoard',
  initialState,
  reducers: {
    setSearch: (state, action: PayloadAction<string>) => {
      state.search = action.payload;
      state.pagination.currentPage = 1;
    },
    setFilters: (state, action: PayloadAction<Partial<NoticeBoardState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.currentPage = 1;
    },
    setSort: (state, action: PayloadAction<Partial<NoticeBoardState['sort']>>) => {
      state.sort = { ...state.sort, ...action.payload };
    },
    resetFilters: (state) => {
      state.search = '';
      state.filters = {
        category: '',
        priority: '',
        status: '',
        isPinned: '',
        isBookmarked: '',
        readStatus: '',
      };
      state.sort = {
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      state.pagination.currentPage = 1;
    },
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.pagination.currentPage = action.payload;
    },
    setLimit: (state, action: PayloadAction<number>) => {
      state.pagination.limit = action.payload;
      state.pagination.currentPage = 1;
    },
    selectNotice: (state, action: PayloadAction<Notice | null>) => {
      state.selectedNotice = action.payload;
    },
    clearNoticeErrors: (state) => {
      state.error = null;
    },
    clearNoticeSuccess: (state) => {
      state.success = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchNotices
      .addCase(fetchNotices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotices.fulfilled, (state, action) => {
        state.loading = false;
        state.notices = action.payload.notices || [];
        state.pagination.currentPage = action.payload.pagination?.currentPage || 1;
        state.pagination.totalPages = action.payload.pagination?.totalPages || 1;
        state.pagination.totalRecords = action.payload.pagination?.totalRecords || 0;
      })
      .addCase(fetchNotices.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to load notices';
      })

      // fetchNoticeById
      .addCase(fetchNoticeById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNoticeById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedNotice = action.payload;
      })
      .addCase(fetchNoticeById.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to load notice details';
      })

      // createNotice
      .addCase(createNotice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createNotice.fulfilled, (state) => {
        state.loading = false;
        state.success = 'createSuccess';
      })
      .addCase(createNotice.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to create notice';
      })

      // updateNotice
      .addCase(updateNotice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateNotice.fulfilled, (state) => {
        state.loading = false;
        state.success = 'updateSuccess';
      })
      .addCase(updateNotice.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to update notice';
      })

      // deleteNotice
      .addCase(deleteNotice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteNotice.fulfilled, (state) => {
        state.loading = false;
        state.success = 'deleteSuccess';
      })
      .addCase(deleteNotice.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to delete notice';
      })

      // togglePin
      .addCase(togglePin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(togglePin.fulfilled, (state, action) => {
        state.loading = false;
        state.success = 'pinSuccess';
        const updatedNotice = action.payload.notice || action.payload;
        if (updatedNotice) {
          if (updatedNotice.isPinned) {
            state.notices = state.notices.map((n) => ({
              ...n,
              isPinned: n._id === updatedNotice._id,
            }));
          } else {
            state.notices = state.notices.map((n) =>
              n._id === updatedNotice._id ? { ...n, isPinned: false } : n
            );
          }
          if (state.selectedNotice && state.selectedNotice._id === updatedNotice._id) {
            state.selectedNotice = { ...state.selectedNotice, ...updatedNotice };
          }
        }
      })
      .addCase(togglePin.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to update notice pinned status';
      })

      // markAsRead
      .addCase(markAsRead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        state.loading = false;
        state.success = 'readSuccess';
        const updatedNotice = action.payload.notice || action.payload;
        if (updatedNotice) {
          state.notices = state.notices.map((n) =>
            n._id === updatedNotice._id
              ? { ...n, isReadByUser: true, readerCount: updatedNotice.readerCount }
              : n
          );
          if (state.selectedNotice && state.selectedNotice._id === updatedNotice._id) {
            state.selectedNotice = {
              ...state.selectedNotice,
              isReadByUser: true,
              readerCount: updatedNotice.readerCount,
            };
          }
        }
      })
      .addCase(markAsRead.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to mark notice as read';
      })

      // bookmarkNotice
      .addCase(bookmarkNotice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bookmarkNotice.fulfilled, (state, action) => {
        state.loading = false;
        state.success = 'bookmarkSuccess';
        const updatedNotice = action.payload.notice || action.payload;
        if (updatedNotice) {
          state.notices = state.notices.map((n) =>
            n._id === updatedNotice._id
              ? { ...n, isBookmarkedByUser: updatedNotice.isBookmarkedByUser }
              : n
          );
          if (state.selectedNotice && state.selectedNotice._id === updatedNotice._id) {
            state.selectedNotice = {
              ...state.selectedNotice,
              isBookmarkedByUser: updatedNotice.isBookmarkedByUser,
            };
          }
        }
      })
      .addCase(bookmarkNotice.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to update bookmark';
      });
  },
});

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
} = noticeBoardSlice.actions;

export default noticeBoardSlice.reducer;

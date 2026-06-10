import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import notificationService from '../services/notification.service.js';

// Async Thunks
export const getNotifications = createAsyncThunk(
  'notifications/getNotifications',
  async ({ page, limit } = {}, { rejectWithValue }) => {
    try {
      const data = await notificationService.getNotifications(page, limit);
      return data; // contains { notifications, pagination }
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch notifications');
    }
  }
);

export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (id, { rejectWithValue }) => {
    try {
      const data = await notificationService.markAsRead(id);
      return data; // contains the updated notification
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to mark notification as read');
    }
  }
);

export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      const data = await notificationService.markAllAsRead();
      return data; // contains update summary
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to mark all notifications as read');
    }
  }
);

export const deleteNotification = createAsyncThunk(
  'notifications/deleteNotification',
  async (id, { rejectWithValue }) => {
    try {
      const data = await notificationService.deleteNotification(id);
      return { id, data }; // Return the ID so the reducer knows which one to remove
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete notification');
    }
  }
);

const initialState = {
  items: [],
  unreadCount: 0,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
  },
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addRealTimeNotification: (state, action) => {
      // Prevent duplicates in case the user pulls the notification list concurrently
      const exists = state.items.some(
        (item) => (item.id || item._id) === (action.payload.id || action.payload._id)
      );
      if (!exists) {
        state.items.unshift(action.payload);
        state.unreadCount += 1;
        state.pagination.totalRecords += 1;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // getNotifications
      .addCase(getNotifications.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(getNotifications.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const page = action.meta.arg?.page || 1;
        
        if (page === 1) {
          state.items = action.payload.notifications;
        } else {
          // Append to items for pagination (infinite scroll / load more)
          state.items.push(...action.payload.notifications);
        }
        
        state.pagination.currentPage = action.payload.pagination.currentPage;
        state.pagination.totalPages = action.payload.pagination.totalPages;
        state.pagination.totalRecords = action.payload.pagination.totalRecords;
        state.unreadCount = action.payload.pagination.unreadRecords;
      })
      .addCase(getNotifications.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Failed to fetch notifications';
      })
      
      // markAsRead
      .addCase(markAsRead.fulfilled, (state, action) => {
        const updatedNotification = action.payload;
        const targetId = updatedNotification.id || updatedNotification._id;
        
        const item = state.items.find((i) => (i.id || i._id) === targetId);
        if (item && !item.isRead) {
          item.isRead = true;
          item.readAt = updatedNotification.readAt;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      
      // markAllAsRead
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.items.forEach((item) => {
          if (!item.isRead) {
            item.isRead = true;
            item.readAt = new Date().toISOString();
          }
        });
        state.unreadCount = 0;
      })
      
      // deleteNotification
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const deletedId = action.payload.id;
        const index = state.items.findIndex((i) => (i.id || i._id) === deletedId);
        if (index !== -1) {
          const item = state.items[index];
          if (!item.isRead) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
          state.items.splice(index, 1);
          state.pagination.totalRecords = Math.max(0, state.pagination.totalRecords - 1);
        }
      });
  },
});

export const { addRealTimeNotification } = notificationSlice.actions;
export default notificationSlice.reducer;

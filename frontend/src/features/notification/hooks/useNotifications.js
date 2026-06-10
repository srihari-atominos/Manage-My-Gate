import { useDispatch, useSelector } from 'react-redux';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../store/notificationSlice.js';

/**
 * Custom hook acting as the Controller/Bridge for the notification feature.
 * Connects visual components to Redux state selectors and action dispatchers.
 */
export const useNotifications = () => {
  const dispatch = useDispatch();

  const notifications = useSelector((state) => state.notifications.items);
  const unreadCount = useSelector((state) => state.notifications.unreadCount);
  const status = useSelector((state) => state.notifications.status);
  const pagination = useSelector((state) => state.notifications.pagination);
  const error = useSelector((state) => state.notifications.error);

  // Derive hasMore from the current pagination state
  const hasMore = pagination.currentPage < pagination.totalPages;

  /**
   * Fetches the initial or specific page of notifications.
   * @param {number} page
   * @param {number} limit
   */
  const fetchNotifications = (page = 1, limit = 10) => {
    return dispatch(getNotifications({ page, limit }));
  };

  /**
   * Fetches the next page of notifications if available.
   * @param {number} limit
   */
  const fetchNextPage = (limit = 10) => {
    if (status === 'loading' || !hasMore) {
      return;
    }
    return dispatch(getNotifications({ page: pagination.currentPage + 1, limit }));
  };

  /**
   * Dispatches markAsRead thunk.
   * @param {string} id
   */
  const handleMarkAsRead = (id) => {
    return dispatch(markAsRead(id));
  };

  /**
   * Dispatches markAllAsRead thunk.
   */
  const handleMarkAllAsRead = () => {
    return dispatch(markAllAsRead());
  };

  /**
   * Dispatches deleteNotification thunk.
   * @param {string} id
   */
  const handleDelete = (id) => {
    return dispatch(deleteNotification(id));
  };

  return {
    notifications,
    unreadCount,
    status,
    hasMore,
    pagination,
    error,
    fetchNotifications,
    fetchNextPage,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleDelete,
  };
};

export default useNotifications;

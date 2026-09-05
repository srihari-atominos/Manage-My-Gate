import { useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store/store';
import { useAppSocket } from '../../../hooks/useAppSocket';
import {
  fetchNotificationsThunk,
  markAsReadThunk,
  markAllAsReadThunk,
  deleteNotificationThunk,
  addRealTimeNotification,
} from '../store/notificationSlice';

export const useNotifications = () => {
  const dispatch = useDispatch<AppDispatch>();
  const notificationState = useSelector((state: RootState) => state.notification);
  const initialFetchedRef = useRef(false);
  const { socket } = useAppSocket();

  const fetchNotifications = useCallback(
    (page = 1, limit = 10) => {
      dispatch(fetchNotificationsThunk({ page, limit }));
    },
    [dispatch]
  );

  const markAsRead = useCallback(
    (id: string) => {
      dispatch(markAsReadThunk(id));
    },
    [dispatch]
  );

  const markAllAsRead = useCallback(() => {
    dispatch(markAllAsReadThunk());
  }, [dispatch]);

  const deleteNotification = useCallback(
    (id: string) => {
      dispatch(deleteNotificationThunk(id));
    },
    [dispatch]
  );

  useEffect(() => {
    if (!initialFetchedRef.current) {
      initialFetchedRef.current = true;
      fetchNotifications(1, 10);
    }
  }, [fetchNotifications]);

  useEffect(() => {
    if (!socket) return;

    const handleIncomingNotification = (notification: any) => {
      console.log('[Socket] INCOMING_NOTIFICATION received', notification);
      if (notification) {
        dispatch(addRealTimeNotification(notification));
      }
    };

    socket.on('INCOMING_NOTIFICATION', handleIncomingNotification);

    return () => {
      socket.off('INCOMING_NOTIFICATION', handleIncomingNotification);
    };
  }, [socket, dispatch]);

  return {
    items: notificationState.items,
    unreadCount: notificationState.unreadCount,
    pagination: notificationState.pagination,
    loading: notificationState.loading,
    error: notificationState.error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
};

export default useNotifications;

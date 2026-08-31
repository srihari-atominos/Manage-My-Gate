import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { RootState, AppDispatch } from '../../../store/store';
import { fetchRolesAsync } from '../store/roleSlice';

const DEFAULT_SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:5002';

/**
 * Custom Hook: useRoleSocket
 *
 * Listens for real-time ROLE_UPDATED events from Socket.io.
 * Refetches roles list when updates occur in the active organization context.
 */
export const useRoleSocket = () => {
  const dispatch = useDispatch<AppDispatch>();
  const activeOrgId = useSelector((state: any) => state.auth?.user?.activeOrgId || state.auth?.user?.orgId);
  const token = useSelector((state: RootState) => state.auth?.token);

  useEffect(() => {
    if (!activeOrgId || !token) {
      return;
    }

    const socket = io(DEFAULT_SOCKET_URL, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      socket.emit('join_room', `org:${activeOrgId}`);
    });

    socket.on('ROLE_UPDATED', () => {
      dispatch(fetchRolesAsync({ page: 1, limit: 20 }));
    });

    return () => {
      socket.off('ROLE_UPDATED');
      socket.disconnect();
    };
  }, [activeOrgId, token, dispatch]);
};

export default useRoleSocket;

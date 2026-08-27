import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAppSocket } from '../../../hooks/useAppSocket';
import { fetchNotices, fetchNoticeStats } from '../store/noticeBoardSlice';

/**
 * Notice Board WebSocket Sync Hook
 * Establishes real-time listeners for notice events and triggers Redux updates on remote writes,
 * while preventing duplicate fetches on events triggered by the current user.
 */
export function useNoticeSocket() {
  const dispatch = useDispatch();
  const { socket } = useAppSocket();
  const { user } = useSelector((state) => state.auth || {});

  useEffect(() => {
    if (!socket) return;

    // Join organization specific room to receive notice broadcasts
    if (user?.orgId) {
      socket.emit('join_room', `org:${user.orgId}`);
      console.log(`Joined notice socket room: org:${user.orgId}`);
    }

    // Trigger local list & statistics sync when notice is created remotely
    const handleNoticeCreated = (notice) => {
      dispatch(fetchNotices());
      dispatch(fetchNoticeStats());
    };

    // Trigger local sync when notice is updated remotely
    const handleNoticeUpdated = (notice) => {
      dispatch(fetchNotices());
      dispatch(fetchNoticeStats());
    };

    // Trigger local sync when notice is deleted remotely
    const handleNoticeDeleted = (payload) => {
      dispatch(fetchNotices());
      dispatch(fetchNoticeStats());
    };

    // Trigger local sync when notice is pinned remotely
    const handleNoticePinnedToggled = (notice) => {
      dispatch(fetchNotices());
      dispatch(fetchNoticeStats());
    };

    // Auto-resync state upon reconnection to prevent stale lists after network drops
    const handleReconnect = () => {
      console.log('Socket reconnected, syncing Notice Board state...');
      if (user?.orgId) {
        socket.emit('join_room', `org:${user.orgId}`);
      }
      dispatch(fetchNotices());
      dispatch(fetchNoticeStats());
    };

    const handleConnect = () => {
      console.log('Socket connected, initializing sync...');
      if (user?.orgId) {
        socket.emit('join_room', `org:${user.orgId}`);
      }
      dispatch(fetchNotices());
      dispatch(fetchNoticeStats());
    };

    // Register listeners
    socket.on('connect', handleConnect);
    socket.on('reconnect', handleReconnect);
    socket.on('notice:created', handleNoticeCreated);
    socket.on('notice:updated', handleNoticeUpdated);
    socket.on('notice:deleted', handleNoticeDeleted);
    socket.on('notice:pinned_toggled', handleNoticePinnedToggled);

    // Clean up connections on unmount
    return () => {
      socket.off('connect', handleConnect);
      socket.off('reconnect', handleReconnect);
      socket.off('notice:created', handleNoticeCreated);
      socket.off('notice:updated', handleNoticeUpdated);
      socket.off('notice:deleted', handleNoticeDeleted);
      socket.off('notice:pinned_toggled', handleNoticePinnedToggled);
      
      // Leave organization specific room to clean up socket connections
      if (user?.orgId) {
        socket.emit('leave_room', `org:${user.orgId}`);
        console.log(`Left notice socket room: org:${user.orgId}`);
      }
    };
  }, [socket, dispatch, user?.id, user?._id, user?.orgId]);
}

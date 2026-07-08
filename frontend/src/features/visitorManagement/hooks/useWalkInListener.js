import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { addPendingApproval, resolveWalkIn } from '../store/visitorLogSlice.js';

/**
 * Custom Hook: useWalkInListener
 * 
 * Manages the Socket.io connection for incoming gate approval requests (walk-ins)
 * and bridges it to the Redux store, following the lifecycle cleanup rules.
 */
export const useWalkInListener = () => {
  const dispatch = useDispatch();

  // 1. Selector mapping
  const pendingApprovals = useSelector((state) => state.visitorLog.pendingApprovals);
  const { user } = useSelector((state) => state.auth || {});
  const userId = user?._id || user?.id;

  // 2. Setup Socket Connection inside useEffect
  useEffect(() => {
    if (!userId) {
      return;
    }

    // Resolve Socket URL from environment
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      socket.emit('join_room', `user:${userId}`);
    });

    // Capture incoming approval request from socket emission
    socket.on('GATE_APPROVAL_REQUEST', (payload) => {
      dispatch(addPendingApproval(payload));
    });

    // Cleanup: Remove listeners and disconnect socket on component unmount
    return () => {
      socket.off('GATE_APPROVAL_REQUEST');
      socket.disconnect();
    };
  }, [userId, dispatch]);

  // 3. Expose request resolver action
  const resolveWalkInRequest = useCallback(
    (logId, status) => {
      return dispatch(resolveWalkIn({ id: logId, status }));
    },
    [dispatch]
  );

  return {
    pendingApprovals,
    resolveWalkInRequest
  };
};

export default useWalkInListener;

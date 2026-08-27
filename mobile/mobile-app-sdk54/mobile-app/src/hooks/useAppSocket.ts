import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../features/auth/hooks/useAuth';

export const useAppSocket = () => {
  const { isAuthenticated, user, token } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect only if authenticated and a token is present
    if (!isAuthenticated || !user || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        console.log('Socket disconnected due to unauthenticated state');
      }
      return;
    }

    const socketUrl =
      process.env.EXPO_PUBLIC_SOCKET_URL ||
      (process.env.EXPO_PUBLIC_API_URL ? process.env.EXPO_PUBLIC_API_URL.replace(/\/api.*$/, '') : 'http://localhost:5002');
    console.log(`Connecting socket to: ${socketUrl}`);

    // Create the Socket.io client
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnectionAttempts: 5,
      auth: {
        token: token,
      },
      query: {
        userId: user.id || (user as any)._id,
      },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(`Socket connected successfully: ${socket.id}`);
      
      // Join user specific room for personal real-time gate rings/alerts
      const userId = user.id || (user as any)._id;
      if (userId) {
        socket.emit('join_room', `user:${userId}`);
      }
      
      if (user.role) {
        // Join role specific room for group broadcasts (e.g., Security, Resident)
        socket.emit('join_room', `role:${user.role}`);
      }
    });

    socket.on('connect_error', (error) => {
      console.warn('Socket connection error (backend server may be offline):', error.message || error);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    // Clean up on component unmount or state changes
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        console.log('Socket connection cleaned up');
      }
    };
  }, [isAuthenticated, user, token]);

  const emitEvent = (eventName: string, payload: any) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(eventName, payload);
    } else {
      console.warn('Cannot emit event, socket is not connected');
    }
  };

  return {
    socket: socketRef.current,
    emit: emitEvent,
  };
};

export default useAppSocket;

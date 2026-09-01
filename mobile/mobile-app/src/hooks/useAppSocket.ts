import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../features/auth/hooks/useAuth';

// Module-level singleton socket instance
let sharedSocket: Socket | null = null;
let lastLoggedErrorTime = 0;

export const useAppSocket = () => {
  const { isAuthenticated, user, token } = useAuth();
  const [activeSocket, setActiveSocket] = useState<Socket | null>(sharedSocket);

  const userId = user?.id || (user as any)?._id;
  const userRole = user?.role;
  const uAny = user as any;
  const orgId =
    uAny?.orgId ||
    uAny?.organizationId ||
    uAny?.activeOrgId ||
    (typeof uAny?.org === 'object' ? uAny?.org?._id || uAny?.org?.id : uAny?.org);

  useEffect(() => {
    // Connect only if authenticated and primitive user tokens exist
    if (!isAuthenticated || !userId || !token) {
      if (sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
        setActiveSocket(null);
        console.log('[Socket] Disconnected due to unauthenticated state');
      }
      return;
    }

    let socketUrl =
      process.env.EXPO_PUBLIC_SOCKET_URL ||
      (process.env.EXPO_PUBLIC_API_URL ? process.env.EXPO_PUBLIC_API_URL.replace(/\/api.*$/, '') : 'http://localhost:5002');

    if (Platform.OS === 'android' && socketUrl.includes('localhost')) {
      socketUrl = socketUrl.replace('localhost', '10.0.2.2');
    }

    // Helper to join rooms
    const joinUserRooms = (sock: Socket) => {
      if (userId) {
        sock.emit('join_room', `user:${userId}`);
      }
      if (userRole) {
        sock.emit('join_room', `role:${userRole}`);
        sock.emit('join_room', `role:${userRole.toLowerCase()}`);
      }
      if (orgId) {
        sock.emit('join_room', `org:${orgId}`);
        if (userRole) {
          sock.emit('join_room', `org:${orgId}:role:${userRole.toLowerCase()}`);
          sock.emit('join_room', `org:${orgId}:role:${userRole}`);
        }
      }
    };

    // Create singleton instance if it doesn't exist
    if (!sharedSocket) {
      console.log(`[Socket] Initializing shared connection to: ${socketUrl}`);

      sharedSocket = io(socketUrl, {
        transports: ['polling', 'websocket'],
        timeout: 10000,
        reconnectionAttempts: 5,
        reconnectionDelay: 5000,
        auth: {
          token: token,
        },
        query: {
          userId: userId,
        },
      });

      sharedSocket.on('connect', () => {
        console.log(`[Socket] Connected successfully: ${sharedSocket?.id}`);
        if (sharedSocket) {
          setActiveSocket(sharedSocket);
          joinUserRooms(sharedSocket);
        }
      });

      sharedSocket.on('connect_error', (error) => {
        const now = Date.now();
        // Throttle connection error warnings to avoid spamming terminal (log once every 30s)
        if (now - lastLoggedErrorTime > 30000) {
          console.warn('[Socket] Connection error (backend server may be offline):', error.message || error);
          lastLoggedErrorTime = now;
        }
      });

      sharedSocket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
      });

      setActiveSocket(sharedSocket);
    } else {
      // Sync state if sharedSocket exists and ensure rooms are joined
      if (activeSocket !== sharedSocket) {
        setActiveSocket(sharedSocket);
      }
      if (sharedSocket.connected) {
        joinUserRooms(sharedSocket);
      }
    }
  }, [isAuthenticated, userId, token, userRole, orgId]);

  const emitEvent = (eventName: string, payload: any) => {
    const sock = activeSocket || sharedSocket;
    if (sock && sock.connected) {
      sock.emit(eventName, payload);
    } else {
      console.warn('[Socket] Cannot emit event, socket is not connected');
    }
  };

  return {
    socket: activeSocket || sharedSocket,
    emit: emitEvent,
  };
};

export default useAppSocket;


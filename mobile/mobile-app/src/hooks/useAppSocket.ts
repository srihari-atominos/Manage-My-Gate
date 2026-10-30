import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../features/auth/hooks/useAuth';
import { getSocketBaseUrl } from '../services/apiClient';

// Module-level singleton socket instance
let sharedSocket: Socket | null = null;
let lastLoggedErrorTime = 0;
let appStateBound = false;
// Tenant/identity the shared socket was opened for; a change forces a reconnect so rooms of the previous tenant are left
let currentSocketOrgId: string | null = null;
let currentSocketUserId: string | null = null;
let currentSocketToken: string | null = null;

// Latest room-membership inputs. The socket's 'connect' handler is registered once, so it must read the
// current values from here; otherwise automatic reconnects re-join rooms using stale role/permission data.
type JoinContext = { userId?: string; userRole?: string; orgId?: string; isGateStaff: boolean };
let joinContext: JoinContext = { isGateStaff: false };

const joinRooms = (sock: Socket) => {
  const { userId, userRole, orgId, isGateStaff } = joinContext;
  if (userId) {
    sock.emit('join_room', `user:${userId}`);
  }
  if (userRole) {
    sock.emit('join_room', `role:${userRole}`);
    sock.emit('join_room', `role:${userRole.toLowerCase()}`);
  }
  if (orgId) {
    // The server derives the member's role and gate rooms from this root room join.
    sock.emit('join_room', `org:${orgId}`);
    if (userRole) {
      sock.emit('join_room', `org:${orgId}:role:${userRole.toLowerCase()}`);
      sock.emit('join_room', `org:${orgId}:role:${userRole}`);
    }
    if (isGateStaff) {
      sock.emit('join_room', `org:${orgId}:guards`);
    }
  }
};

export const useAppSocket = () => {
  const { isAuthenticated, user, token } = useAuth();
  const [activeSocket, setActiveSocket] = useState<Socket | null>(sharedSocket);

  const userId = user?.id || (user as any)?._id;
  const userRole = user?.role;
  const permissions: string[] = Array.isArray((user as any)?.permissions) ? (user as any).permissions : [];
  // Gate staff receive walk-in outcomes on the backend's org guard room.
  const isGateStaff = permissions.some((p) => p === '*' || p === 'visitor:guard' || p === 'visitor:admin');
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
        currentSocketOrgId = null;
        currentSocketUserId = null;
        currentSocketToken = null;
        setActiveSocket(null);
        // console.log('[Socket] Disconnected due to unauthenticated state');
      }
      return;
    }

    joinContext = { userId, userRole, orgId, isGateStaff };

    // If tenant context, user identity, or token changed, disconnect stale socket to leave prior tenant rooms
    if (
      sharedSocket &&
      (currentSocketOrgId !== (orgId || null) ||
        currentSocketUserId !== (userId || null) ||
        currentSocketToken !== (token || null))
    ) {
      sharedSocket.disconnect();
      sharedSocket = null;
      currentSocketOrgId = null;
      currentSocketUserId = null;
      currentSocketToken = null;
      setActiveSocket(null);
    }

    const socketUrl = getSocketBaseUrl();

    // Create singleton instance if it doesn't exist
    if (!sharedSocket) {
      // console.log(`[Socket] Initializing shared connection to: ${socketUrl}`);

      currentSocketOrgId = orgId || null;
      currentSocketUserId = userId || null;
      currentSocketToken = token || null;

      sharedSocket = io(socketUrl, {
        // Browsers can emit noisy WebSocket errors while restoring a page from BFCache.
        // Socket.IO polling remains live and avoids the failed web upgrade attempt.
        ...(Platform.OS === 'web' && socketUrl.includes(':8081')
          ? { transports: ['polling'], upgrade: false }
          : { transports: ['websocket', 'polling'] }),
        timeout: 10000,
        // Keep trying for as long as the user is signed in; a phone that loses signal for a minute
        // must still get live updates again afterwards instead of giving up after a few attempts.
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 30000,
        auth: {
          token: token,
        },
        query: {
          userId: userId,
        },
      });

      sharedSocket.on('connect', () => {
        // console.log(`[Socket] Connected successfully: ${sharedSocket?.id}`);
        if (sharedSocket) {
          setActiveSocket(sharedSocket);
          joinRooms(sharedSocket);
        }
      });

      sharedSocket.on('connect_error', (error) => {
        const errMsg = String(error?.message || error || '');
        if (errMsg.includes('Unauthorized') || errMsg.includes('Authentication required')) {
          sharedSocket?.disconnect();
        }
        const now = Date.now();
        // Throttle connection error warnings to avoid spamming terminal (log once every 30s)
        if (now - lastLoggedErrorTime > 30000) {
          // console.warn('[Socket] Connection error (backend server may be offline):', error.message || error);
          lastLoggedErrorTime = now;
        }
      });

      // Mobile OSes suspend sockets in the background: reconnect as soon as the app is used again.
      if (!appStateBound) {
        appStateBound = true;
        AppState.addEventListener('change', (state) => {
          if (state === 'active' && sharedSocket && !sharedSocket.connected) {
            sharedSocket.connect();
          }
        });
      }

      sharedSocket.on('disconnect', (reason) => {
        if (reason !== 'io client disconnect') {
          // console.log('[Socket] Disconnected:', reason);
        }
      });

      setActiveSocket(sharedSocket);
    } else {
      // Sync state if sharedSocket exists and ensure rooms are joined
      if (activeSocket !== sharedSocket) {
        setActiveSocket(sharedSocket);
      }
      if (sharedSocket.connected) {
        joinRooms(sharedSocket);
      }
    }
  }, [isAuthenticated, userId, token, userRole, orgId, isGateStaff]);

  const emitEvent = (eventName: string, payload: any) => {
    const sock = activeSocket || sharedSocket;
    if (sock && sock.connected) {
      sock.emit(eventName, payload);
    } else {
      // console.warn('[Socket] Cannot emit event, socket is not connected');
    }
  };

  return {
    socket: activeSocket || sharedSocket,
    emit: emitEvent,
  };
};

export default useAppSocket;




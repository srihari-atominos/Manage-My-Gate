import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

/**
 * Global Socket hook
 * Manages standard socket connection setup.
 */
export const useSocket = (room) => {
  const socketRef = useRef(null);

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    
    socketRef.current = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      if (room) {
        socket.emit('join_room', room);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [room]);

  return socketRef.current;
};

export default useSocket;

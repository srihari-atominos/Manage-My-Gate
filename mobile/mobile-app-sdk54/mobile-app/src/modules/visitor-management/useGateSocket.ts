import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDispatch } from 'react-redux';
import { updateVisitorStatus } from './visitorSlice';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3000';

export const useGateSocket = (villaId?: string) => {
  const socket = useRef<Socket | null>(null);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!villaId) return;

    // Connect to namespace or generic socket with auth
    socket.current = io(SOCKET_URL, {
      query: { room: `villa:${villaId}` },
      transports: ['websocket'],
    });

    socket.current.on('connect', () => {
      console.log('Connected to Gate Socket');
    });

    socket.current.on('visitor_status_changed', (data: { id: string; status: any }) => {
      dispatch(updateVisitorStatus({ id: data.id, status: data.status }));
    });

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [villaId, dispatch]);

  return socket.current;
};

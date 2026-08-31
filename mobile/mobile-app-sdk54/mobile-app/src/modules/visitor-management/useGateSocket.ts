import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { updateVisitorStatus } from './visitorSlice';
import { useAppSocket } from '../../hooks/useAppSocket';

export const useGateSocket = (villaId?: string) => {
  const { socket } = useAppSocket();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!villaId || !socket) return;

    socket.emit('join_room', `villa:${villaId}`);

    const handleVisitorStatus = (data: { id: string; status: any }) => {
      dispatch(updateVisitorStatus({ id: data.id, status: data.status }));
    };

    socket.on('visitor_status_changed', handleVisitorStatus);

    return () => {
      socket.off('visitor_status_changed', handleVisitorStatus);
    };
  }, [villaId, socket, dispatch]);

  return socket;
};


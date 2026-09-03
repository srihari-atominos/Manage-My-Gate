import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/src/store/store';
import useAppSocket from '@/src/hooks/useAppSocket';
import { receiveRealtimeMessage } from '../store/directoryMessagingSlice';

export const useDirectorySocket = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { socket } = useAppSocket();

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (payload: any) => {
      if (payload?.message) {
        dispatch(receiveRealtimeMessage(payload));
      }
    };

    socket.on('message:new', handleNewMessage);

    return () => {
      socket.off('message:new', handleNewMessage);
    };
  }, [socket, dispatch]);
};

export default useDirectorySocket;

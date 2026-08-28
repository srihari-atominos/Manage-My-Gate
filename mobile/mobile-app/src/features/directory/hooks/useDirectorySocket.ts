import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/src/store/store';
import useAppSocket from '@/src/hooks/useAppSocket';
import { receiveRealtimeMessage } from '../store/directoryMessagingSlice';
import { fetchDirectory } from '../store/directorySlice';

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

    const handleNoteCreated = () => {
      // Refresh directory list when new note published in community
      dispatch(fetchDirectory({ page: 1 }));
    };

    const handleNoteExpired = () => {
      dispatch(fetchDirectory({ page: 1 }));
    };

    socket.on('message:new', handleNewMessage);
    socket.on('communityNote:created', handleNoteCreated);
    socket.on('communityNote:expired', handleNoteExpired);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('communityNote:created', handleNoteCreated);
      socket.off('communityNote:expired', handleNoteExpired);
    };
  }, [socket, dispatch]);
};

export default useDirectorySocket;

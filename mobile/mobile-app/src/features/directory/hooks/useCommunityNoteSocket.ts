import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/src/store/store';
import useAppSocket from '@/src/hooks/useAppSocket';
import {
  noteCreatedRealtime,
  noteExpiredRealtime,
  fetchMyActiveNote,
} from '../store/communityNoteSlice';

export const useCommunityNoteSocket = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { socket } = useAppSocket();

  useEffect(() => {
    if (!socket) return;

    const handleNoteCreated = (note: any) => {
      if (note) {
        dispatch(noteCreatedRealtime(note));
        dispatch(fetchMyActiveNote());
      }
    };

    const handleNoteExpired = (payload: any) => {
      if (payload) {
        dispatch(noteExpiredRealtime(payload));
        dispatch(fetchMyActiveNote());
      }
    };

    socket.on('communityNote:created', handleNoteCreated);
    socket.on('communityNote:expired', handleNoteExpired);

    return () => {
      socket.off('communityNote:created', handleNoteCreated);
      socket.off('communityNote:expired', handleNoteExpired);
    };
  }, [socket, dispatch]);
};

export default useCommunityNoteSocket;

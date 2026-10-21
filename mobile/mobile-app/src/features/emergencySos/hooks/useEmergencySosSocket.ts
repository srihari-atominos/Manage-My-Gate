import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useAppSocket } from '../../../hooks/useAppSocket';
import { sosStatusUpdatedFromSocket } from '../store/emergencySosSlice';
import { AppDispatch } from '../../../store/store';

export const useEmergencySosSocket = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { socket } = useAppSocket();

  useEffect(() => {
    if (!socket) return;

    const handleSosTriggered = (sosAlert: any) => {
      if (sosAlert) {
        dispatch(sosStatusUpdatedFromSocket(sosAlert));
      }
    };

    const handleSosStatusUpdated = (sosAlert: any) => {
      if (sosAlert) {
        dispatch(sosStatusUpdatedFromSocket(sosAlert));
      }
    };

    socket.on('SOS_TRIGGERED', handleSosTriggered);
    socket.on('SOS_STATUS_UPDATED', handleSosStatusUpdated);

    return () => {
      socket.off('SOS_TRIGGERED', handleSosTriggered);
      socket.off('SOS_STATUS_UPDATED', handleSosStatusUpdated);
    };
  }, [socket, dispatch]);

  return { socket };
};

export default useEmergencySosSocket;

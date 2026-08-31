import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../../store/store';
import { useAppSocket } from '../../../hooks/useAppSocket';
import { getVillas, getVillaStats } from '../store/villaSlice';

/**
 * Custom hook encapsulating real-time Socket.IO event listeners for Unit & Villa Management.
 * Listens for backend socket events ('unit_created', 'unit_updated', 'resident_assigned'),
 * and dispatches background store refetches to keep mobile view in sync.
 */
export const useVillaSocket = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { socket } = useAppSocket();

  useEffect(() => {
    if (!socket) return;

    const handleUnitEvent = (data: any) => {
      console.log('[useVillaSocket] Received unit real-time event:', data);
      dispatch(getVillas({}));
      dispatch(getVillaStats());
    };

    socket.on('unit_created', handleUnitEvent);
    socket.on('unit_updated', handleUnitEvent);
    socket.on('resident_assigned', handleUnitEvent);

    return () => {
      socket.off('unit_created', handleUnitEvent);
      socket.off('unit_updated', handleUnitEvent);
      socket.off('resident_assigned', handleUnitEvent);
    };
  }, [socket, dispatch]);
};

export default useVillaSocket;

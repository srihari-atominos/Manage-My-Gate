import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useAppSocket } from '../../../hooks/useAppSocket';
import { updateComplaintInList, fetchComplaints } from '../store/complaintSlice';
import { AppDispatch } from '../../../store/store';

export const useComplaintSocket = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { socket } = useAppSocket();

  useEffect(() => {
    if (!socket) return;

    const handleComplaintCreated = (complaint: any) => {
      console.log('[Socket] complaint_created received', complaint);
      if (complaint) {
        dispatch(updateComplaintInList(complaint));
      }
    };

    const handleComplaintAssigned = (complaint: any) => {
      console.log('[Socket] complaint_assigned received', complaint);
      if (complaint) {
        dispatch(updateComplaintInList(complaint));
      }
    };

    const handleComplaintUpdated = (complaint: any) => {
      console.log('[Socket] complaint_updated received', complaint);
      if (complaint) {
        dispatch(updateComplaintInList(complaint));
      }
    };

    const handleComplaintStarted = (complaint: any) => {
      console.log('[Socket] complaint_started received', complaint);
      if (complaint) {
        dispatch(updateComplaintInList(complaint));
      }
    };

    const handleComplaintCompleted = (complaint: any) => {
      console.log('[Socket] complaint_completed received', complaint);
      if (complaint) {
        dispatch(updateComplaintInList(complaint));
      }
    };

    const handleComplaintClosed = (complaint: any) => {
      console.log('[Socket] complaint_closed received', complaint);
      if (complaint) {
        dispatch(updateComplaintInList(complaint));
      }
    };

    const handleReconnect = () => {
      console.log('[Socket] Reconnected: resyncing complaints');
      dispatch(fetchComplaints({ page: 1, limit: 10 }));
    };

    socket.on('complaint_created', handleComplaintCreated);
    socket.on('complaint_assigned', handleComplaintAssigned);
    socket.on('complaint_updated', handleComplaintUpdated);
    socket.on('complaint_started', handleComplaintStarted);
    socket.on('complaint_completed', handleComplaintCompleted);
    socket.on('complaint_closed', handleComplaintClosed);
    socket.on('connect', handleReconnect);

    return () => {
      socket.off('complaint_created', handleComplaintCreated);
      socket.off('complaint_assigned', handleComplaintAssigned);
      socket.off('complaint_updated', handleComplaintUpdated);
      socket.off('complaint_started', handleComplaintStarted);
      socket.off('complaint_completed', handleComplaintCompleted);
      socket.off('complaint_closed', handleComplaintClosed);
      socket.off('connect', handleReconnect);
    };
  }, [socket, dispatch]);

  return { socket };
};

export default useComplaintSocket;

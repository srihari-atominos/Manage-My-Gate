import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { io } from 'socket.io-client';
import config from '../../../config/config.js';
import { updateComplaintInList, addComplaintToList, fetchDashboardAnalytics } from '../store/complaintSlice';
import { updateSettingsLocally } from '../store/complaintSettingsSlice';

const SOCKET_URL = config.socketUrl;

export const useComplaintSocket = (token) => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Complaint socket connected');
    });

    socket.on('complaints:new', (complaint) => {
      dispatch(addComplaintToList(complaint));
      dispatch(fetchDashboardAnalytics()); // Re-fetch analytics on new event
    });

    socket.on('complaints:updated', (complaint) => {
      dispatch(updateComplaintInList(complaint));
      dispatch(fetchDashboardAnalytics()); // Re-fetch analytics on update
    });

    socket.on('complaints:settings:updated', (settings) => {
      dispatch(updateSettingsLocally(settings));
    });

    socket.on('disconnect', () => {
      console.log('Complaint socket disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, [token, dispatch]);
};

export default useComplaintSocket;

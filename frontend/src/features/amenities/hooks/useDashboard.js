import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboardStats } from '../store/dashboardSlice.js';
import useAdminBookingSocket from './useAdminBookingSocket.js';

export const useDashboard = () => {
  const dispatch = useDispatch();
  const { kpis, revenue, occupancy, trends, recentActivity, loading, error } = useSelector((state) => state.amenitiesDashboard);

  const loadData = () => {
    dispatch(fetchDashboardStats());
  };

  useEffect(() => {
    loadData();
    
    const interval = setInterval(() => {
      loadData();
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [dispatch]);

  // Hook into real-time socket events
  useAdminBookingSocket(loadData);

  return { kpis, revenue, occupancy, trends, recentActivity, loading, error, refresh: () => dispatch(fetchDashboardStats()) };
};

export default useDashboard;

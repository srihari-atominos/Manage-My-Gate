import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboardStats } from '../store/dashboardSlice.js';

export const useDashboard = () => {
  const dispatch = useDispatch();
  const { kpis, revenue, occupancy, trends, recentActivity, loading, error } = useSelector((state) => state.amenitiesDashboard);

  useEffect(() => {
    dispatch(fetchDashboardStats());
    
    const interval = setInterval(() => {
      dispatch(fetchDashboardStats());
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [dispatch]);

  return { kpis, revenue, occupancy, trends, recentActivity, loading, error, refresh: () => dispatch(fetchDashboardStats()) };
};

export default useDashboard;

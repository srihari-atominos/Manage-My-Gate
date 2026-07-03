import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboardStats } from '../store/dashboardSlice.js';

export const useDashboard = () => {
  const dispatch = useDispatch();
  const { kpis, revenue, occupancy, recentActivity, loading, error } = useSelector((state) => state.amenitiesDashboard);

  useEffect(() => {
    dispatch(fetchDashboardStats());
  }, [dispatch]);

  return { kpis, revenue, occupancy, recentActivity, loading, error };
};

export default useDashboard;

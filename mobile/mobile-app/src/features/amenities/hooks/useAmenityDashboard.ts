import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../store/store';
import { fetchDashboardStatsThunk } from '../store/amenityBookingSlice';
import { useAppSocket } from '../../../hooks/useAppSocket';

export function useAmenityDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const { socket } = useAppSocket();

  const { dashboardStats, loading, error } = useSelector(
    (state: RootState) => state.amenityBookings
  );

  const loadData = useCallback(() => {
    dispatch(fetchDashboardStatsThunk());
  }, [dispatch]);

  useEffect(() => {
    loadData();

    // 15-second background polling fallback to keep KPI metrics 100% fresh
    const pollTimer = setInterval(() => {
      loadData();
    }, 15000);

    // Live Socket Event Listener for instant real-time KPI updates
    if (socket) {
      const handleRealtimeUpdate = () => {
        console.log('[AmenityDashboard] Real-time socket event received, refreshing metrics...');
        loadData();
      };

      socket.on('AMENITY_BOOKING_CREATED', handleRealtimeUpdate);
      socket.on('AMENITY_CHECKIN', handleRealtimeUpdate);
      socket.on('AMENITY_MAINTENANCE_UPDATED', handleRealtimeUpdate);
      socket.on('SECURITY_LOG_CREATED', handleRealtimeUpdate);
      socket.on('PAYMENT_SUCCESS', handleRealtimeUpdate);
      socket.on('bookingUpdated', handleRealtimeUpdate);

      return () => {
        clearInterval(pollTimer);
        socket.off('AMENITY_BOOKING_CREATED', handleRealtimeUpdate);
        socket.off('AMENITY_CHECKIN', handleRealtimeUpdate);
        socket.off('AMENITY_MAINTENANCE_UPDATED', handleRealtimeUpdate);
        socket.off('SECURITY_LOG_CREATED', handleRealtimeUpdate);
        socket.off('PAYMENT_SUCCESS', handleRealtimeUpdate);
        socket.off('bookingUpdated', handleRealtimeUpdate);
      };
    }

    return () => {
      clearInterval(pollTimer);
    };
  }, [loadData, socket]);

  return {
    dashboardStats,
    loading,
    error,
    loadData,
  };
}

export default useAmenityDashboard;

import { useEffect, useCallback, useRef } from 'react';
import { AppState, InteractionManager } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../store/store';
import { fetchDashboardStatsThunk } from '../store/amenityBookingSlice';
import { useAppSocket } from '../../../hooks/useAppSocket';

/**
 * Owner for Amenity executive dashboard metrics. Keep this hook on the dashboard
 * screen only; child widgets consume the Redux value to avoid duplicate requests.
 */
export function useAmenityDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const { socket } = useAppSocket();
  const { dashboardStats, dashboardStatsLoading, error } = useSelector(
    (state: RootState) => state.amenityBookings
  );
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(() => {
    // The thunk condition coalesces concurrent calls from retries and socket bursts.
    return dispatch(fetchDashboardStatsThunk());
  }, [dispatch]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      loadData();
    }, 300);
  }, [loadData]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => loadData());
    return () => task.cancel();
  }, [loadData]);

  useEffect(() => {
    if (!socket) {
      // Offline/realtime fallback: refresh only when the app returns to the
      // foreground, never every 15 seconds in the background.
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') scheduleRefresh();
      });
      return () => subscription.remove();
    }

    const events = [
      'AMENITY_BOOKING_CREATED',
      'AMENITY_CHECKIN',
      'AMENITY_MAINTENANCE_UPDATED',
      'SECURITY_LOG_CREATED',
      'PAYMENT_SUCCESS',
      'bookingUpdated',
    ];
    events.forEach((event) => socket.on(event, scheduleRefresh));
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      events.forEach((event) => socket.off(event, scheduleRefresh));
    };
  }, [scheduleRefresh, socket]);

  return { dashboardStats, loading: dashboardStatsLoading, error, loadData };
}

export default useAmenityDashboard;

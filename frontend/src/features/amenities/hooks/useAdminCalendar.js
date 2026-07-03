import { useState, useMemo, useCallback, useEffect } from 'react';
import dashboardApi from '../services/dashboardApi.js';
import toast from 'react-hot-toast';

export const useAdminCalendar = () => {
  const [bookingQueue, setBookingQueue] = useState([]);
  const [monthIndicators, setMonthIndicators] = useState([]);
  const [isQueueLoading, setIsQueueLoading] = useState(false);
  const [error, setError] = useState(null);

  // View & Date State
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day' | 'agenda'
  const [currentDate, setCurrentDate] = useState(new Date());

  // Filters State
  const [filters, setFilters] = useState({
    amenityId: '',
    status: '',
    residentId: '', // For future or if resident search is added
    search: '' // search by resident name or title
  });

  const loadEvents = useCallback(async () => {
    setIsQueueLoading(true);
    setError(null);
    try {
      if (viewMode === 'month') {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const response = await dashboardApi.getCalendarIndicators(year, month);
        setMonthIndicators(response.data || []);
        setBookingQueue([]); // clear day events
      } else {
        const dateStr = currentDate.toISOString().split('T')[0];
        const response = await dashboardApi.getCalendarEvents(dateStr);
        setBookingQueue(response.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load calendar events');
      toast.error('Failed to load calendar events');
    } finally {
      setIsQueueLoading(false);
    }
  }, [currentDate, viewMode]);

  // Transform Raw API response to Unified Event Interface
  const rawEvents = useMemo(() => {
    if (!bookingQueue) return [];
    
    return bookingQueue.map(event => ({
      id: event.id,
      type: event.type, // 'booking', 'maintenance', 'operating_hours', 'holiday'
      title: event.title,
      subtitle: event.subtitle,
      amenityName: event.amenityName || 'Unknown',
      residentName: event.residentName || '',
      date: event.date,
      start: event.start,
      end: event.end,
      status: event.status,
      colorKey: event.type === 'maintenance' ? 'rejected' 
              : event.type === 'operating_hours' ? 'default' 
              : event.type === 'holiday' ? 'checked_in' 
              : event.status, // Can be mapped to specific colors in CalendarEventCard based on status
      metadata: event // store raw for details drawer
    }));
  }, [bookingQueue]);

  // Apply filters
  const filteredEvents = useMemo(() => {
    return rawEvents.filter(event => {
      if (filters.amenityId && event.amenityId !== filters.amenityId) return false;
      if (filters.status && event.status !== filters.status) return false;
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchTitle = event.title.toLowerCase().includes(query);
        const matchSubtitle = event.subtitle.toLowerCase().includes(query);
        if (!matchTitle && !matchSubtitle) return false;
      }
      return true;
    });
  }, [rawEvents, filters]);

  // Get currently visible events based on current view/date
  // Simplified logic for MVP: just pass all filtered to month renderer, which will handle grid placement
  const visibleEvents = filteredEvents;

  // Analytics derived from filtered events
  const analytics = useMemo(() => {
    return {
      total: visibleEvents.length,
      confirmed: visibleEvents.filter(e => e.status === 'approved' || e.status === 'confirmed').length,
      pending: visibleEvents.filter(e => e.status === 'pending').length,
      checkedIn: visibleEvents.filter(e => e.checkInStatus === 'checked_in').length,
      cancelled: visibleEvents.filter(e => e.status === 'cancelled' || e.status === 'rejected').length
    };
  }, [visibleEvents]);

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else {
      newDate.setDate(newDate.getDate() + direction);
    }
    setCurrentDate(newDate);
  };

  const setToday = () => setCurrentDate(new Date());

  const updateFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  return {
    rawEvents,
    filteredEvents,
    visibleEvents,
    monthIndicators,
    analytics,
    loading: isQueueLoading,
    error,
    viewMode,
    setViewMode,
    currentDate,
    setCurrentDate,
    navigateDate,
    setToday,
    filters,
    updateFilters,
    loadEvents
  };
};

export default useAdminCalendar;

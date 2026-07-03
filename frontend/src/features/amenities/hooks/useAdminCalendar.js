import { useState, useMemo, useCallback, useEffect } from 'react';
import { fetchBookingQueue } from '../services/amenityBookingApi.js';
import toast from 'react-hot-toast';

export const useAdminCalendar = () => {
  const [bookingQueue, setBookingQueue] = useState([]);
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
    // In a real app, pass date range (start of month to end of month) to avoid over-fetching
    // For now we fetch all/paginated queue
    setIsQueueLoading(true);
    setError(null);
    try {
      const response = await fetchBookingQueue({ limit: 500 });
      setBookingQueue(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load calendar events');
      toast.error('Failed to load calendar events');
    } finally {
      setIsQueueLoading(false);
    }
  }, []);

  // Transform Raw API response to Unified Event Interface
  const rawEvents = useMemo(() => {
    if (!bookingQueue) return [];
    
    return bookingQueue.map(booking => ({
      id: booking._id,
      type: 'booking',
      title: `${booking.amenity?.name || 'Unknown Amenity'} Booking`,
      subtitle: booking.user?.name || 'Unknown Resident',
      amenityId: booking.amenity?._id,
      amenityName: booking.amenity?.name || 'Unknown',
      residentId: booking.user?._id,
      residentName: booking.user?.name || 'Unknown Resident',
      date: booking.date, // "YYYY-MM-DD"
      start: booking.startTime, // "HH:MM"
      end: booking.endTime,
      status: booking.status || 'pending',
      paymentStatus: booking.paymentStatus || 'pending',
      checkInStatus: booking.checkInStatus || 'pending',
      colorKey: booking.status || 'pending',
      metadata: booking // store raw for details drawer
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
    analytics,
    loading: isQueueLoading,
    error,
    viewMode,
    setViewMode,
    currentDate,
    navigateDate,
    setToday,
    filters,
    updateFilters,
    loadEvents
  };
};

export default useAdminCalendar;

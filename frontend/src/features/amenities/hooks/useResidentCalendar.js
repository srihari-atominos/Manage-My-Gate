import { useState, useMemo, useCallback, useEffect } from 'react';
import { fetchMyBookings, cancelBooking } from '../services/amenityBookingApi.js';
import toast from 'react-hot-toast';

export const useResidentCalendar = () => {
  const [myBookings, setMyBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [viewMode, setViewMode] = useState('month'); 
  const [currentDate, setCurrentDate] = useState(new Date());

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchMyBookings();
      setMyBookings(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load bookings');
      toast.error('Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const rawEvents = useMemo(() => {
    if (!myBookings) return [];
    
    return myBookings.map(booking => ({
      id: booking._id,
      type: 'booking',
      title: `${booking.amenity?.name || 'Unknown Amenity'} Booking`,
      subtitle: `${booking.startTime} - ${booking.endTime}`,
      amenityId: booking.amenity?._id,
      amenityName: booking.amenity?.name || 'Unknown',
      date: booking.bookingDate, 
      start: booking.startTime, 
      end: booking.endTime,
      status: booking.status || 'pending',
      paymentStatus: booking.paymentStatus || 'pending',
      checkInStatus: booking.status === 'checked-in' ? 'checked-in' : 'pending',
      colorKey: booking.status || 'pending',
      price: booking.pricingDetails?.totalAmount || booking.totalPrice || 0,
      qrCode: booking.qrCode || null,
      metadata: booking // store raw for details drawer
    }));
  }, [myBookings]);

  // Upcoming Bookings Logic
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return rawEvents
      .filter(event => new Date(event.date) >= today && event.status !== 'cancelled' && event.status !== 'rejected')
      .sort((a, b) => new Date(`${a.date}T${a.start}`) - new Date(`${b.date}T${b.start}`));
  }, [rawEvents]);

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

  const cancelBookingHook = useCallback(async (eventId) => {
    try {
      await cancelBooking(eventId);
      toast.success('Booking cancelled successfully');
      loadEvents(); // refresh
    } catch (err) {
      toast.error(err.message || 'Failed to cancel booking');
    }
  }, [loadEvents]);

  return {
    rawEvents,
    upcomingEvents,
    loading: isLoading,
    error,
    viewMode,
    setViewMode,
    currentDate,
    navigateDate,
    setToday,
    loadEvents,
    cancelBooking: cancelBookingHook
  };
};

export default useResidentCalendar;

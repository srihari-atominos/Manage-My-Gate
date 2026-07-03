import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { fetchMyBookings } from '../services/amenityBookingApi.js';
import toast from 'react-hot-toast';

export const useResidentWallet = () => {
  const [myBookings, setMyBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const user = useSelector(state => state.auth?.user || { name: 'Resident', email: '' });

  const loadWallet = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchMyBookings();
      setMyBookings(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load wallet');
      toast.error('Failed to load wallet');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Find the single most relevant active booking to display as the QR pass
  const activeBooking = useMemo(() => {
    if (!myBookings || myBookings.length === 0) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter to confirmed/approved/checked_in bookings that are today or in the future
    const validBookings = myBookings.filter(b => {
      const isStatusValid = b.status === 'confirmed' || b.status === 'approved' || b.status === 'checked_in';
      const isFutureOrToday = new Date(b.date) >= today;
      return isStatusValid && isFutureOrToday;
    });

    if (validBookings.length === 0) return null;

    // Sort by nearest date and time
    validBookings.sort((a, b) => new Date(`${a.date}T${a.startTime}`) - new Date(`${b.date}T${b.startTime}`));

    const booking = validBookings[0];
    
    return {
      id: booking._id,
      amenityName: booking.amenity?.name || 'Unknown Amenity',
      residentName: user.name,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
      checkInStatus: booking.checkInStatus || 'pending',
      location: booking.amenity?.location || 'Main Clubhouse',
      // Generate a payload string for the QR code
      qrPayload: JSON.stringify({
        bookingId: booking._id,
        amenityId: booking.amenity?._id,
        timestamp: new Date().getTime()
      })
    };
  }, [myBookings, user]);

  return {
    activeBooking,
    loading: isLoading,
    error,
    loadWallet
  };
};

export default useResidentWallet;

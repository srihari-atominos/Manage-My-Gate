import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { getAmenities } from '../store/amenitySlice.js';
import { bookingConfirmed } from '../store/amenityBookingSlice.js';

/**
 * Custom hook to manage the real-time Socket.io connection for Amenities
 * Listens for amenity and booking changes to dispatch Redux updates.
 */
export const useAmenitySocket = (params = {}) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth || {});
  
  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    // Only connect if user is authenticated
    if (!user) return;

    // Resolve socket URL from environment configuration with backend fallback
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5002';
    
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true
    });

    socket.on('connect', () => {
      // Join tenant/workspace room if necessary (e.g. orgId)
      if (user.orgId) {
        socket.emit('join_room', `org:${user.orgId}`);
      }
      // Join user's personal private room for direct booking updates
      const userId = user._id || user.id;
      if (userId) {
        socket.emit('join_room', `user:${userId}`);
      }
    });

    const handleUpdate = () => {
      // Dispatch action to refresh global amenities list
      dispatch(getAmenities(paramsRef.current));
    };

    const handleBookingConfirmed = (booking) => {
      dispatch(bookingConfirmed(booking));
      toast.success(`Booking for ${booking.amenityId?.name || 'Amenity'} is confirmed!`);
    };

    // Amenity Events
    socket.on('amenity:created', handleUpdate);
    socket.on('amenity:updated', handleUpdate);
    socket.on('amenity:deleted', handleUpdate);

    // Booking Events that could affect availability
    socket.on('booking:created', handleUpdate);
    socket.on('booking:updated', handleUpdate);
    socket.on('booking:status_updated', handleUpdate);
    socket.on('booking:cancelled', handleUpdate);
    socket.on('AMENITY_BOOKING_CONFIRMED', handleBookingConfirmed);

    return () => {
      socket.off('amenity:created', handleUpdate);
      socket.off('amenity:updated', handleUpdate);
      socket.off('amenity:deleted', handleUpdate);
      socket.off('booking:created', handleUpdate);
      socket.off('booking:updated', handleUpdate);
      socket.off('booking:status_updated', handleUpdate);
      socket.off('booking:cancelled', handleUpdate);
      socket.off('AMENITY_BOOKING_CONFIRMED', handleBookingConfirmed);
      socket.disconnect();
    };
  }, [dispatch, user]);

  return null;
};

export default useAmenitySocket;

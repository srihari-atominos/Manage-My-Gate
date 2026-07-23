import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import config from '../../../config/config.js';

/**
 * Booking-specific socket hook for the My Bookings page.
 * Listens for booking and payment events and triggers a refresh callback.
 * Per architecture rules: no Redux dispatch here – caller provides onRefresh callback.
 */
export const useResidentBookingSocket = (onRefresh) => {
  const { user } = useSelector((state) => state.auth || {});
  const refreshRef = useRef(onRefresh);

  // Keep the ref in sync without re-triggering the effect
  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!user) return;

    const socketUrl = config.socketUrl;

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socket.on('connect', () => {
      if (user.orgId) {
        socket.emit('join_room', `org:${user.orgId}`);
      }
      // Also join the personal user room for private booking events
      socket.emit('join_room', `user:${user._id || user.id}`);
    });

    const handleRefresh = () => {
      if (refreshRef.current) refreshRef.current();
    };

    // Booking lifecycle events
    socket.on('amenity_booking_created', handleRefresh);
    socket.on('amenity_booking_cancelled', handleRefresh);
    socket.on('amenity_booking_checked_in', handleRefresh);
    socket.on('bookingUpdated', handleRefresh);
    socket.on('bookingCompleted', handleRefresh);
    socket.on('booking:created', handleRefresh);
    socket.on('booking:updated', handleRefresh);
    socket.on('booking:cancelled', handleRefresh);
    socket.on('booking:confirmed', handleRefresh);
    socket.on('booking:completed', handleRefresh);
    socket.on('booking:status_updated', handleRefresh);

    // Payment events
    socket.on('payment:success', handleRefresh);
    socket.on('payment:failed', handleRefresh);

    return () => {
      socket.off('amenity_booking_created', handleRefresh);
      socket.off('amenity_booking_cancelled', handleRefresh);
      socket.off('amenity_booking_checked_in', handleRefresh);
      socket.off('bookingUpdated', handleRefresh);
      socket.off('bookingCompleted', handleRefresh);
      socket.off('booking:created', handleRefresh);
      socket.off('booking:updated', handleRefresh);
      socket.off('booking:cancelled', handleRefresh);
      socket.off('booking:confirmed', handleRefresh);
      socket.off('booking:completed', handleRefresh);
      socket.off('booking:status_updated', handleRefresh);
      socket.off('payment:success', handleRefresh);
      socket.off('payment:failed', handleRefresh);
      socket.disconnect();
    };
  }, [user]);

  return null;
};

export default useResidentBookingSocket;

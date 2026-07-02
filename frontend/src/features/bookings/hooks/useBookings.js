import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getBookings, addBooking, changeBookingStatus, clearStatus } from '../store/bookingSlice.js';

export const useBookings = (filters = {}) => {
  const dispatch = useDispatch();
  const { items, loading, error, successMsg } = useSelector((state) => state.bookings);

  useEffect(() => {
    // Only re-fetch if component mounts or filters explicitly trigger a re-fetch
    dispatch(getBookings(filters));
  }, [dispatch, JSON.stringify(filters)]);

  useEffect(() => {
    if (successMsg || error) {
      const timer = setTimeout(() => dispatch(clearStatus()), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, error, dispatch]);

  const createBooking = (data) => dispatch(addBooking(data)).unwrap();
  const updateStatus = (id, bookingStatus) => dispatch(changeBookingStatus({ id, statusData: { bookingStatus } })).unwrap();

  return {
    bookings: items,
    loading,
    error,
    successMsg,
    createBooking,
    updateStatus,
  };
};

export default useBookings;

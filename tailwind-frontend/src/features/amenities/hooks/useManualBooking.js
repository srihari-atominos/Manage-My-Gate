import { useState, useCallback } from 'react';
import { createManualBooking } from '../services/amenityBookingApi.js';
import toast from 'react-hot-toast';

export const useManualBooking = (onSuccess) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const submitManualBooking = useCallback(async (bookingData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await createManualBooking(bookingData);
      toast.success(response.message || 'Manual booking created successfully');
      if (onSuccess) onSuccess(response.data);
      return response.data;
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to create manual booking';
      setError(errMsg);
      toast.error(errMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess]);

  return {
    submitManualBooking,
    isLoading,
    error,
    setError
  };
};

export default useManualBooking;

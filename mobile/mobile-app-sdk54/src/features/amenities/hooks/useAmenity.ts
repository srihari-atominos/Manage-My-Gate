import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import { fetchAmenitiesThunk, clearAmenityError } from '../store/amenitySlice';
import { fetchMyBookingsThunk, clearBookingStatus } from '../store/amenityBookingSlice';
import { useCallback } from 'react';
import { FetchAmenitiesParams } from '../services/amenityApi';

export const useAmenity = () => {
  const dispatch = useDispatch<AppDispatch>();
  const amenityState = useSelector((state: RootState) => state.amenities);

  const fetchAmenities = useCallback(
    (params: FetchAmenitiesParams = {}) => {
      return dispatch(fetchAmenitiesThunk(params));
    },
    [dispatch]
  );

  const fetchMyBookings = useCallback(() => {
    return dispatch(fetchMyBookingsThunk({}));
  }, [dispatch]);

  const clearStatus = useCallback(() => {
    dispatch(clearAmenityError());
    dispatch(clearBookingStatus());
  }, [dispatch]);

  return {
    ...amenityState,
    fetchAmenities,
    fetchMyBookings,
    clearStatus,
  };
};

export default useAmenity;

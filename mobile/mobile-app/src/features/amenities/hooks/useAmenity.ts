import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import { getAmenities, getMyAmenityBookings, clearAmenityStatus } from '../store/amenitySlice';
import { useCallback } from 'react';
import { FetchAmenitiesParams } from '../services/amenityService';

export const useAmenity = () => {
  const dispatch = useDispatch<AppDispatch>();
  const amenityState = useSelector((state: RootState) => state.amenities);

  const fetchAmenities = useCallback(
    (params: FetchAmenitiesParams = {}) => {
      return dispatch(getAmenities(params));
    },
    [dispatch]
  );

  const fetchMyBookings = useCallback(() => {
    return dispatch(getMyAmenityBookings());
  }, [dispatch]);

  const clearStatus = useCallback(() => {
    dispatch(clearAmenityStatus());
  }, [dispatch]);

  return {
    ...amenityState,
    fetchAmenities,
    fetchMyBookings,
    clearStatus,
  };
};

export default useAmenity;

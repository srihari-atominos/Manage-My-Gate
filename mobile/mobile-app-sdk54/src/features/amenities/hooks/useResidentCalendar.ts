import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import { RootState, AppDispatch } from '../../../store/store';
import {
  fetchAmenitiesThunk,
  fetchAmenitySlotsThunk,
  AmenitySlot,
  Amenity,
} from '../store/amenitySlice';
import { formatDateString } from '@/components/common/DatePickerModal';

export function useResidentCalendar() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState<string>(formatDateString(new Date()));
  const [selectedAmenityId, setSelectedAmenityId] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<AmenitySlot | null>(null);

  const { amenities, slots, slotsLoading, loading, error } = useSelector(
    (state: RootState) => state.amenities
  );

  // Fetch all active community amenities on initial load
  useEffect(() => {
    dispatch(fetchAmenitiesThunk({}));
  }, [dispatch]);

  // Set default selected facility once amenities load
  useEffect(() => {
    if (amenities.length > 0 && !selectedAmenityId) {
      setSelectedAmenityId(amenities[0]._id);
    }
  }, [amenities, selectedAmenityId]);

  // Load hourly slot matrix whenever target amenity or date shifts
  useEffect(() => {
    if (selectedAmenityId && selectedDate) {
      dispatch(fetchAmenitySlotsThunk({ id: selectedAmenityId, date: selectedDate }));
    }
  }, [dispatch, selectedAmenityId, selectedDate]);

  // Format amenities into dropdown picker items
  const amenityOptions = useMemo(
    () =>
      amenities.map((a) => ({
        label: a.name,
        value: a._id,
      })),
    [amenities]
  );

  const currentAmenity: Amenity | undefined = useMemo(
    () => amenities.find((a) => a._id === selectedAmenityId),
    [amenities, selectedAmenityId]
  );

  const handleRefresh = useCallback(() => {
    dispatch(fetchAmenitiesThunk({}));
    if (selectedAmenityId && selectedDate) {
      dispatch(fetchAmenitySlotsThunk({ id: selectedAmenityId, date: selectedDate }));
    }
  }, [dispatch, selectedAmenityId, selectedDate]);

  const navigateDate = useCallback(
    (direction: number) => {
      const current = selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date();
      current.setDate(current.getDate() + direction);
      setSelectedDate(formatDateString(current));
      setSelectedSlot(null);
    },
    [selectedDate]
  );

  const setToday = useCallback(() => {
    setSelectedDate(formatDateString(new Date()));
    setSelectedSlot(null);
  }, []);

  const handleDateChange = useCallback((date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  }, []);

  const handleSlotSelect = useCallback((slot: AmenitySlot) => {
    const isAvail =
      slot.isAvailable !== undefined
        ? slot.isAvailable
        : slot.status
        ? slot.status === 'Available' || slot.status === 'AVAILABLE'
        : true;

    if (isAvail) {
      setSelectedSlot(slot);
    }
  }, []);

  const handleBookAmenity = useCallback(
    (amenityId?: string) => {
      const targetId = amenityId || selectedAmenityId;
      if (!targetId) return;

      router.push({
        pathname: '/(resident)/amenities/booking/[id]',
        params: { id: targetId },
      });
    },
    [router, selectedAmenityId]
  );

  return {
    amenities,
    slots,
    slotsLoading,
    loading,
    error,
    selectedDate,
    selectedAmenityId,
    selectedSlot,
    amenityOptions,
    currentAmenity,
    setSelectedDate,
    setSelectedAmenityId,
    setSelectedSlot,
    handleRefresh,
    navigateDate,
    setToday,
    handleDateChange,
    handleSlotSelect,
    handleBookAmenity,
  };
}

export default useResidentCalendar;

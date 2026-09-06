import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../store/store';
import {
  fetchAdminCalendarThunk,
  createManualBookingThunk,
  adminCancelBookingThunk,
  AmenityBooking,
} from '../store/amenityBookingSlice';
import { fetchAmenitiesThunk } from '../store/amenitySlice';
import { ManualBookingFormData } from '../components/ManualBookingModal';

export type CalendarViewMode = 'day' | 'week' | 'month';

export const formatDateString = (dateObj: Date): string => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function useAdminCalendar() {
  const dispatch = useDispatch<AppDispatch>();

  // Date & View Mode State
  const [viewMode, setViewMode] = useState<CalendarViewMode>('day');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const selectedDate = useMemo(() => formatDateString(currentDate), [currentDate]);

  // Filters State
  const [selectedAmenityId, setSelectedAmenityId] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('All');

  // Modals & Action Targets State
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [cancelTarget, setCancelTarget] = useState<AmenityBooking | null>(null);
  const [selectedBookingDetail, setSelectedBookingDetail] = useState<AmenityBooking | null>(null);
  const [submittingManual, setSubmittingManual] = useState<boolean>(false);
  const [submittingCancel, setSubmittingCancel] = useState<boolean>(false);

  const { adminBookings, loading, error } = useSelector((state: RootState) => state.amenityBookings);
  const { amenities } = useSelector((state: RootState) => state.amenities);

  // Date Bounds Calculation for API requests
  const dateBounds = useMemo(() => {
    const curr = new Date(currentDate);
    if (viewMode === 'month') {
      const start = new Date(curr.getFullYear(), curr.getMonth(), 1);
      const end = new Date(curr.getFullYear(), curr.getMonth() + 1, 0);
      return { startDate: formatDateString(start), endDate: formatDateString(end) };
    } else if (viewMode === 'week') {
      const dayOfWeek = curr.getDay();
      const start = new Date(curr);
      start.setDate(curr.getDate() - dayOfWeek);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { startDate: formatDateString(start), endDate: formatDateString(end) };
    } else {
      // Single day view
      const singleDate = formatDateString(curr);
      return { startDate: singleDate, endDate: singleDate };
    }
  }, [currentDate, viewMode]);

  const loadData = useCallback(() => {
    dispatch(
      fetchAdminCalendarThunk({
        date: selectedDate,
        startDate: dateBounds.startDate,
        endDate: dateBounds.endDate,
        amenityId: selectedAmenityId,
        status: statusFilter,
        search: searchQuery,
        paymentStatus: paymentStatusFilter,
      })
    );
    dispatch(fetchAmenitiesThunk({}));
  }, [
    dispatch,
    selectedDate,
    dateBounds.startDate,
    dateBounds.endDate,
    selectedAmenityId,
    statusFilter,
    searchQuery,
    paymentStatusFilter,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Date Navigation Helpers
  const navigateDate = (direction: number) => {
    const nextDate = new Date(currentDate);
    if (viewMode === 'month') {
      nextDate.setMonth(nextDate.getMonth() + direction);
    } else if (viewMode === 'week') {
      nextDate.setDate(nextDate.getDate() + direction * 7);
    } else {
      nextDate.setDate(nextDate.getDate() + direction);
    }
    setCurrentDate(nextDate);
  };

  const setToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateChange = (dateString: string) => {
    if (!dateString) return;
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      setCurrentDate(new Date(y, m, d));
    }
  };

  // Client-Side Dynamic Filtering for Responsive UX
  const filteredBookings = useMemo(() => {
    if (!adminBookings) return [];

    return adminBookings.filter((item) => {
      // Amenity Filter
      if (selectedAmenityId && selectedAmenityId !== 'All') {
        const itemAmenityId =
          typeof item.amenityId === 'object' && item.amenityId ? item.amenityId._id : item.amenityId;
        if (itemAmenityId !== selectedAmenityId) return false;
      }

      // Status Filter
      if (statusFilter && statusFilter !== 'All') {
        if (item.status?.toUpperCase() !== statusFilter.toUpperCase()) return false;
      }

      // Payment Status Filter
      if (paymentStatusFilter && paymentStatusFilter !== 'All') {
        if (item.paymentStatus?.toUpperCase() !== paymentStatusFilter.toUpperCase()) return false;
      }

      // Search Query Filter (Resident name, flat/villa number, pass code, amenity name)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const amenityName =
          typeof item.amenityId === 'object' && item.amenityId
            ? item.amenityId.name
            : item.amenityName || '';
        const residentName = item.residentName || (item as any).userName || '';
        const villaNumber =
          (item as any).villaNumber || (item as any).flatNumber || (item as any).unit || '';
        const passCode = item.qrCode || item.passCode || item._id || '';

        const matchAmenity = amenityName.toLowerCase().includes(query);
        const matchResident = residentName.toLowerCase().includes(query);
        const matchVilla = villaNumber.toLowerCase().includes(query);
        const matchPassCode = passCode.toLowerCase().includes(query);

        if (!matchAmenity && !matchResident && !matchVilla && !matchPassCode) return false;
      }

      return true;
    });
  }, [adminBookings, selectedAmenityId, statusFilter, paymentStatusFilter, searchQuery]);

  // Modal Handlers
  const handleOpenManualModal = () => setIsManualModalOpen(true);
  const handleCloseManualModal = () => setIsManualModalOpen(false);

  const handleManualSubmit = async (formData: ManualBookingFormData) => {
    setSubmittingManual(true);
    try {
      await dispatch(createManualBookingThunk(formData)).unwrap();
      setSubmittingManual(false);
      handleCloseManualModal();
      loadData();
    } catch (err: any) {
      setSubmittingManual(false);
      const msg = typeof err === 'string' ? err : err?.message || 'Failed to create manual reservation';
      Alert.alert('Reservation Error', msg);
    }
  };

  const handleConfirmAdminCancel = async (reason?: string) => {
    if (!cancelTarget) return;
    setSubmittingCancel(true);
    try {
      await dispatch(
        adminCancelBookingThunk({
          bookingId: cancelTarget._id,
          reason: reason || 'Admin Cancellation',
        })
      ).unwrap();
      setSubmittingCancel(false);
      setCancelTarget(null);
      setSelectedBookingDetail(null);
      loadData();
    } catch (err: any) {
      setSubmittingCancel(false);
      const msg = typeof err === 'string' ? err : err?.message || 'Failed to cancel reservation';
      Alert.alert('Cancellation Error', msg);
    }
  };

  return {
    adminBookings,
    filteredBookings,
    amenities,
    viewMode,
    setViewMode,
    currentDate,
    selectedDate,
    handleDateChange,
    navigateDate,
    setToday,
    selectedAmenityId,
    setSelectedAmenityId,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    paymentStatusFilter,
    setPaymentStatusFilter,
    isManualModalOpen,
    cancelTarget,
    setCancelTarget,
    selectedBookingDetail,
    setSelectedBookingDetail,
    loading,
    error,
    submittingManual,
    submittingCancel,
    loadData,
    handleOpenManualModal,
    handleCloseManualModal,
    handleManualSubmit,
    handleConfirmAdminCancel,
  };
}

export default useAdminCalendar;

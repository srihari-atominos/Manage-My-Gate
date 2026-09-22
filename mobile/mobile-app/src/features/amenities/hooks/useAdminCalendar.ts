import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../store/store';
import {
  fetchAdminCalendarThunk,
  AmenityBooking,
} from '../store/amenityBookingSlice';
import { fetchAmenitiesThunk } from '../store/amenitySlice';
import { CalendarFilterState } from '../components/AdminCalendarFilterDrawer';
import {
  calculateFacilityAvailability,
  detectReservationConflicts,
  getTimePresetInterval,
  isTimeIntervalOverlapping,
  FacilityAvailabilityItem,
} from '../utils/amenityAvailabilityHelpers';

export const formatDateString = (dateObj: Date): string => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const INITIAL_CALENDAR_FILTERS: CalendarFilterState = {
  datePreset: 'selected',
  customStartDate: undefined,
  customEndDate: undefined,
  facilityId: 'All',
  availability: 'ALL',
  timePreset: 'all',
  customStartTime: undefined,
  customEndTime: undefined,
  bookingStatus: 'All',
  paymentStatus: 'All',
};

export function useAdminCalendar() {
  const dispatch = useDispatch<AppDispatch>();

  // Date State (Month navigation)
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateString(new Date()));

  // Filters State
  const [filters, setFilters] = useState<CalendarFilterState>(INITIAL_CALENDAR_FILTERS);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Booking Detail Modal
  const [selectedBookingDetail, setSelectedBookingDetail] = useState<AmenityBooking | null>(null);

  const { adminBookings, pagination, loading, error } = useSelector((state: RootState) => state.amenityBookings);
  const { amenities } = useSelector((state: RootState) => state.amenities);

  // Month Date Bounds for API request
  const dateBounds = useMemo(() => {
    const curr = new Date(currentDate);
    const start = new Date(curr.getFullYear(), curr.getMonth(), 1);
    const end = new Date(curr.getFullYear(), curr.getMonth() + 1, 0);

    // If custom date range filter is active, span to include custom dates
    if (filters.datePreset === 'custom' && filters.customStartDate && filters.customEndDate) {
      return {
        startDate: filters.customStartDate < formatDateString(start) ? filters.customStartDate : formatDateString(start),
        endDate: filters.customEndDate > formatDateString(end) ? filters.customEndDate : formatDateString(end),
      };
    }

    return { startDate: formatDateString(start), endDate: formatDateString(end) };
  }, [currentDate, filters.datePreset, filters.customStartDate, filters.customEndDate]);

  const loadData = useCallback(() => {
    dispatch(
      fetchAdminCalendarThunk({
        startDate: dateBounds.startDate,
        endDate: dateBounds.endDate,
        amenityId: filters.facilityId !== 'All' ? filters.facilityId : undefined,
        status: filters.bookingStatus !== 'All' ? filters.bookingStatus : undefined,
        search: searchQuery.trim() || undefined,
        paymentStatus: filters.paymentStatus !== 'All' ? filters.paymentStatus : undefined,
      })
    );
    dispatch(fetchAmenitiesThunk({}));
  }, [
    dispatch,
    dateBounds.startDate,
    dateBounds.endDate,
    filters.facilityId,
    filters.bookingStatus,
    filters.paymentStatus,
    searchQuery,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Month Navigation Helpers
  const navigateDate = (direction: number) => {
    const nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() + direction);
    setCurrentDate(nextDate);

    // If target month contains today, select today; otherwise select 1st of target month
    const today = new Date();
    if (today.getFullYear() === nextDate.getFullYear() && today.getMonth() === nextDate.getMonth()) {
      setSelectedDate(formatDateString(today));
    } else {
      const firstOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1);
      setSelectedDate(formatDateString(firstOfMonth));
    }
  };

  const setToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(formatDateString(today));
  };

  const handleDateChange = (dateString: string) => {
    if (!dateString) return;
    setSelectedDate(dateString);

    const parts = dateString.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const newD = new Date(y, m, d);

      // If selected date is in a different month, update currentDate
      if (currentDate.getFullYear() !== y || currentDate.getMonth() !== m) {
        setCurrentDate(newD);
      }
    }
  };

  // Available Resources extracted from loaded bookings & amenities
  const availableResources = useMemo(() => {
    const map = new Map<string, { _id: string; name: string; facilityId?: string }>();

    for (const b of adminBookings || []) {
      if (b.resourceId && b.resourceName) {
        const facId =
          typeof b.amenityId === 'object' && b.amenityId ? b.amenityId._id : b.amenityId;
        if (!map.has(b.resourceId)) {
          map.set(b.resourceId, {
            _id: b.resourceId,
            name: b.resourceName,
            facilityId: facId,
          });
        }
      }
    }

    return Array.from(map.values());
  }, [adminBookings]);

  // Availability Summary for Selected Date
  const availabilitySummary = useMemo((): FacilityAvailabilityItem[] => {
    if (!amenities || amenities.length === 0) return [];

    const maintenanceBlocks = (adminBookings || []).filter((b) => b.type === 'maintenance');
    const timeInterval = getTimePresetInterval(
      filters.timePreset,
      filters.customStartTime,
      filters.customEndTime
    );

    return amenities.map((facility) => {
      return calculateFacilityAvailability({
        facility,
        reservations: adminBookings as any,
        maintenanceBlocks: maintenanceBlocks as any,
        selectedDate,
        timeInterval,
      });
    });
  }, [amenities, adminBookings, selectedDate, filters.timePreset, filters.customStartTime, filters.customEndTime]);

  const facilityAvailabilityMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of availabilitySummary) {
      map.set(item.facilityId, item.state);
    }
    return map;
  }, [availabilitySummary]);

  // Client-Side Dynamic Filtering for Responsive & Filter-Aware UX
  const filteredBookings = useMemo(() => {
    if (!adminBookings) return [];

    const timeInterval = getTimePresetInterval(
      filters.timePreset,
      filters.customStartTime,
      filters.customEndTime
    );

    return adminBookings.filter((item) => {
      const itemAmenityId =
        typeof item.amenityId === 'object' && item.amenityId
          ? (item.amenityId as any)._id || (item.amenityId as any).id
          : item.amenityId;

      const itemResourceId =
        typeof item.resourceId === 'object' && item.resourceId
          ? (item.resourceId as any)._id || (item.resourceId as any).id
          : item.resourceId;

      // 1. Facility Filter
      if (filters.facilityId && filters.facilityId !== 'All') {
        if (itemAmenityId !== filters.facilityId) return false;
      }

      // 2. Status Filter
      if (filters.bookingStatus && filters.bookingStatus !== 'All') {
        if (item.status?.toUpperCase() !== filters.bookingStatus.toUpperCase()) return false;
      }

      // 4. Payment Status Filter
      if (filters.paymentStatus && filters.paymentStatus !== 'All') {
        if (item.paymentStatus?.toUpperCase() !== filters.paymentStatus.toUpperCase()) return false;
      }

      // 5. Availability Filter
      if (filters.availability && filters.availability !== 'ALL') {
        const facState = facilityAvailabilityMap.get(itemAmenityId);
        if (item.type === 'maintenance') {
          if (filters.availability !== 'MAINTENANCE') return false;
        } else {
          if (filters.availability === 'MAINTENANCE') return false;
          if (facState && facState !== filters.availability) return false;
        }
      }

      // 6. Time Filter
      if (timeInterval && item.startTime && item.endTime) {
        if (!isTimeIntervalOverlapping(timeInterval.startTime, timeInterval.endTime, item.startTime, item.endTime)) {
          return false;
        }
      }

      // 7. Date Range Filter
      const rawDate = item.date || item.bookingDate;
      const itemDate = rawDate ? (rawDate.includes('T') ? rawDate.split('T')[0] : rawDate) : '';

      if (filters.datePreset === 'today') {
        const todayStr = formatDateString(new Date());
        if (itemDate !== todayStr) return false;
      } else if (filters.datePreset === 'week') {
        const curr = new Date(currentDate);
        const dayOfWeek = curr.getDay();
        const startWeek = new Date(curr);
        startWeek.setDate(curr.getDate() - dayOfWeek);
        const endWeek = new Date(startWeek);
        endWeek.setDate(startWeek.getDate() + 6);
        const startStr = formatDateString(startWeek);
        const endStr = formatDateString(endWeek);
        if (itemDate < startStr || itemDate > endStr) return false;
      } else if (filters.datePreset === 'month') {
        const curr = new Date(currentDate);
        const startMonth = formatDateString(new Date(curr.getFullYear(), curr.getMonth(), 1));
        const endMonth = formatDateString(new Date(curr.getFullYear(), curr.getMonth() + 1, 0));
        if (itemDate < startMonth || itemDate > endMonth) return false;
      } else if (filters.datePreset === 'custom') {
        if (filters.customStartDate && itemDate < filters.customStartDate) return false;
        if (filters.customEndDate && itemDate > filters.customEndDate) return false;
      }

      // 7. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const amenityName =
          typeof item.amenityId === 'object' && item.amenityId
            ? item.amenityId.name
            : item.amenityName || '';
        const resourceName = item.resourceName || '';
        const residentName = item.residentName || (item as any).userName || '';
        const villaNumber =
          (item as any).villaNumber || (item as any).flatNumber || (item as any).unit || '';
        const passCode = item.reservationNumber || item.bookingId || item.qrCode || item._id || '';

        const matchAmenity = amenityName.toLowerCase().includes(query);
        const matchResource = resourceName.toLowerCase().includes(query);
        const matchResident = residentName.toLowerCase().includes(query);
        const matchVilla = villaNumber.toLowerCase().includes(query);
        const matchPassCode = passCode.toLowerCase().includes(query);

        if (!matchAmenity && !matchResource && !matchResident && !matchVilla && !matchPassCode) {
          return false;
        }
      }

      return true;
    });
  }, [adminBookings, filters, searchQuery, currentDate]);

  // Group and count actual reservation records by date from filteredBookings
  // Excludes maintenance events and deduplicates records
  const bookingCountsByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    const countedIds = new Set<string>();

    for (const item of filteredBookings) {
      if (item.type === 'maintenance') {
        continue;
      }

      // Deduplicate by ID
      const uniqueKey = item._id || item.bookingId || item.reservationNumber;
      if (uniqueKey && countedIds.has(uniqueKey)) {
        continue;
      }
      if (uniqueKey) {
        countedIds.add(uniqueKey);
      }

      const rawDate = item.date || item.bookingDate;
      if (rawDate) {
        const dateKey = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;
        counts[dateKey] = (counts[dateKey] || 0) + 1;
      }
    }
    return counts;
  }, [filteredBookings]);

  // Reservations & Events for the currently selected date
  const selectedDateBookings = useMemo(() => {
    const seenIds = new Set<string>();
    return filteredBookings.filter((item) => {
      const rawDate = item.date || item.bookingDate;
      if (!rawDate) return false;
      const dateKey = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;
      if (dateKey !== selectedDate) return false;

      // Deduplicate by ID
      const uniqueKey = item._id || item.bookingId || item.reservationNumber;
      if (uniqueKey && seenIds.has(uniqueKey)) {
        return false;
      }
      if (uniqueKey) {
        seenIds.add(uniqueKey);
      }
      return true;
    });
  }, [filteredBookings, selectedDate]);

  // Conflict Detection
  const conflictedBookingIds = useMemo(() => {
    return detectReservationConflicts(filteredBookings as any);
  }, [filteredBookings]);

  // Filter Actions
  const handleApplyFilters = (newFilters: CalendarFilterState) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_CALENDAR_FILTERS);
    setSearchQuery('');
  };

  const handleRemoveFilter = (key: keyof CalendarFilterState | 'searchQuery') => {
    if (key === 'searchQuery') {
      setSearchQuery('');
      return;
    }
    setFilters((prev) => ({
      ...prev,
      [key]: INITIAL_CALENDAR_FILTERS[key],
    }));
  };

  // Active filter count for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.datePreset !== 'selected') count++;
    if (filters.facilityId !== 'All') count++;
    if (filters.availability !== 'ALL') count++;
    if (filters.timePreset !== 'all') count++;
    if (filters.bookingStatus !== 'All') count++;
    if (filters.paymentStatus !== 'All') count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [filters, searchQuery]);

  const handleLoadMore = useCallback(() => {
    if (pagination && pagination.currentPage < pagination.totalPages) {
      dispatch(
        fetchAdminCalendarThunk({
          date: selectedDate,
          startDate: dateBounds.startDate,
          endDate: dateBounds.endDate,
          amenityId: filters.facilityId !== 'All' ? filters.facilityId : undefined,
          status: filters.bookingStatus !== 'All' ? filters.bookingStatus : undefined,
          search: searchQuery.trim() || undefined,
          paymentStatus: filters.paymentStatus !== 'All' ? filters.paymentStatus : undefined,
          page: pagination.currentPage + 1,
        } as any)
      );
    }
  }, [
    dispatch,
    pagination,
    selectedDate,
    dateBounds.startDate,
    dateBounds.endDate,
    filters.facilityId,
    filters.bookingStatus,
    filters.paymentStatus,
    searchQuery,
  ]);

  return {
    adminBookings,
    filteredBookings,
    selectedDateBookings,
    bookingCountsByDate,
    amenities,
    availableResources,
    conflictedBookingIds,
    availabilitySummary,
    pagination,
    handleLoadMore,
    currentDate,
    selectedDate,
    handleDateChange,
    navigateDate,
    setToday,
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    handleApplyFilters,
    handleResetFilters,
    handleRemoveFilter,
    activeFilterCount,
    selectedBookingDetail,
    setSelectedBookingDetail,
    loading,
    error,
    loadData,
  };
}

export default useAdminCalendar;

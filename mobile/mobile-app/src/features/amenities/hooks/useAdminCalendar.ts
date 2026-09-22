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
  facilityIds: [],
  resourceIds: [],
  availability: 'ALL',
  bookingStatuses: [],
  paymentStatuses: [],
};

export function useAdminCalendar() {
  const dispatch = useDispatch<AppDispatch>();

  // Date State (Month navigation)
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [startDate, setStartDate] = useState<string>(() => formatDateString(new Date()));
  const [endDate, setEndDate] = useState<string | null>(() => formatDateString(new Date()));

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

    const startStr = formatDateString(start);
    const endStr = formatDateString(end);

    const effectiveStart = startDate && startDate < startStr ? startDate : startStr;
    const effectiveEnd = endDate && endDate > endStr ? endDate : endStr;

    return { startDate: effectiveStart, endDate: effectiveEnd };
  }, [currentDate, startDate, endDate]);

  const loadData = useCallback(() => {
    const primaryFacilityId =
      filters.facilityIds.length === 1 && filters.facilityIds[0] !== 'All'
        ? filters.facilityIds[0]
        : undefined;

    dispatch(
      fetchAdminCalendarThunk({
        startDate: dateBounds.startDate,
        endDate: dateBounds.endDate,
        amenityId: primaryFacilityId,
        search: searchQuery.trim() || undefined,
      })
    );
    dispatch(fetchAmenitiesThunk({}));
  }, [
    dispatch,
    dateBounds.startDate,
    dateBounds.endDate,
    filters.facilityIds,
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

    // If target month contains startDate, keep it; otherwise select 1st of target month
    const targetYear = nextDate.getFullYear();
    const targetMonth = nextDate.getMonth();
    const currentParts = startDate.split('-');

    if (
      currentParts.length === 3 &&
      parseInt(currentParts[0], 10) === targetYear &&
      parseInt(currentParts[1], 10) - 1 === targetMonth
    ) {
      // Keep current selection
    } else {
      const firstOfMonth = new Date(targetYear, targetMonth, 1);
      const formattedFirst = formatDateString(firstOfMonth);
      setStartDate(formattedFirst);
      setEndDate(formattedFirst);
    }
  };

  const setToday = () => {
    const today = new Date();
    setCurrentDate(today);
    const formattedToday = formatDateString(today);
    setStartDate(formattedToday);
    setEndDate(formattedToday);
  };

  const selectWholeMonth = useCallback(() => {
    const curr = new Date(currentDate);
    const startOfMonth = formatDateString(new Date(curr.getFullYear(), curr.getMonth(), 1));
    const endOfMonth = formatDateString(new Date(curr.getFullYear(), curr.getMonth() + 1, 0));
    setStartDate(startOfMonth);
    setEndDate(endOfMonth);
  }, [currentDate]);

  // Calendar Date / Date Range Selection
  // Single click: selects single date immediately ("single click means it shows normal")
  // Double click: starts date range selection ("double click only it should available the filter like above second image")
  const handleSelectCalendarDate = (dateString: string, isDoubleClick: boolean = false) => {
    if (!dateString) return;

    if (isDoubleClick) {
      // Double-clicked a date -> start range selection from this date (waiting for end date)
      setStartDate(dateString);
      setEndDate(null);
    } else {
      // Single click:
      // If we are actively waiting for an end date (range mode was initiated via double-click):
      if (startDate && endDate === null) {
        if (dateString === startDate) {
          // Tapped same date -> single date normal
          setEndDate(dateString);
        } else {
          // Tapped end date -> complete range (with auto-normalization)
          const [start, end] = dateString > startDate ? [startDate, dateString] : [dateString, startDate];
          setStartDate(start);
          setEndDate(end);
        }
      } else {
        // Normal single click: always selects that single date
        setStartDate(dateString);
        setEndDate(dateString);
      }
    }

    // If tapped date is in a different month, update currentDate
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      if (currentDate.getFullYear() !== y || currentDate.getMonth() !== m) {
        setCurrentDate(new Date(y, m, 1));
      }
    }
  };

  // Legacy alias for handleSelectCalendarDate
  const handleDateChange = handleSelectCalendarDate;

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

  // Availability Summary for Selected Context
  const availabilitySummary = useMemo((): FacilityAvailabilityItem[] => {
    if (!amenities || amenities.length === 0) return [];

    const maintenanceBlocks = (adminBookings || []).filter((b) => b.type === 'maintenance');

    return amenities.map((facility) => {
      return calculateFacilityAvailability({
        facility,
        reservations: adminBookings as any,
        maintenanceBlocks: maintenanceBlocks as any,
        selectedDate: startDate,
      });
    });
  }, [amenities, adminBookings, startDate]);

  const facilityAvailabilityMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of availabilitySummary) {
      map.set(item.facilityId, item.state);
    }
    return map;
  }, [availabilitySummary]);

  // Availability Counts for Selected Date Quick Action Filter
  const availabilityCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: amenities?.length || 0,
      AVAILABLE: 0,
      PARTIALLY_AVAILABLE: 0,
      FULLY_BOOKED: 0,
      MAINTENANCE: 0,
      BLOCKED: 0,
    };

    for (const item of availabilitySummary) {
      if (item.state && counts[item.state] !== undefined) {
        counts[item.state]++;
      }
    }

    return counts;
  }, [amenities, availabilitySummary]);

  // Client-Side Dynamic Filtering for Responsive & Filter-Aware UX
  // Filters across all bookings based on Facility, Resource, Status, Payment, Availability, Search
  const filteredBookings = useMemo(() => {
    if (!adminBookings) return [];

    return adminBookings.filter((item) => {
      const itemAmenityId =
        typeof item.amenityId === 'object' && item.amenityId
          ? (item.amenityId as any)._id || (item.amenityId as any).id
          : item.amenityId;

      const itemResourceId =
        typeof item.resourceId === 'object' && item.resourceId
          ? (item.resourceId as any)._id || (item.resourceId as any).id
          : item.resourceId;

      const itemAmenityIdStr = itemAmenityId ? String(itemAmenityId) : '';
      const itemResourceIdStr = itemResourceId ? String(itemResourceId) : '';

      // 1. Facility Multi-Select Filter (OR logic)
      if (filters.facilityIds && filters.facilityIds.length > 0 && !filters.facilityIds.includes('All')) {
        if (!filters.facilityIds.map(String).includes(itemAmenityIdStr)) return false;
      }

      // 2. Resource Multi-Select Filter (OR logic)
      if (filters.resourceIds && filters.resourceIds.length > 0) {
        if (!filters.resourceIds.map(String).includes(itemResourceIdStr)) return false;
      }

      // 3. Status Multi-Select Filter (OR logic)
      if (filters.bookingStatuses && filters.bookingStatuses.length > 0 && !filters.bookingStatuses.includes('All')) {
        const itemStatus = (item.status || '').toUpperCase();
        if (!filters.bookingStatuses.some((s) => s.toUpperCase() === itemStatus)) {
          return false;
        }
      }

      // 4. Payment Status Multi-Select Filter (OR logic)
      if (filters.paymentStatuses && filters.paymentStatuses.length > 0 && !filters.paymentStatuses.includes('All')) {
        const itemPayment = (item.paymentStatus || '').toUpperCase();
        if (!filters.paymentStatuses.some((p) => p.toUpperCase() === itemPayment)) {
          return false;
        }
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

      // 6. Search Query Filter
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
  }, [adminBookings, filters, searchQuery, facilityAvailabilityMap]);

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

  // Reservations & Events for the currently selected date or date range
  const selectedRangeBookings = useMemo(() => {
    const seenIds = new Set<string>();
    const effectiveStart = startDate;
    const effectiveEnd = endDate || startDate;

    return filteredBookings.filter((item) => {
      const rawDate = item.date || item.bookingDate;
      if (!rawDate) return false;
      const dateKey = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;

      // Range check: between effectiveStart and effectiveEnd (inclusive)
      if (dateKey < effectiveStart || dateKey > effectiveEnd) return false;

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
  }, [filteredBookings, startDate, endDate]);

  // Grouped reservations by booking date for multi-date / range display
  const groupedReservationsByDate = useMemo(() => {
    const groupsMap = new Map<string, AmenityBooking[]>();

    for (const booking of selectedRangeBookings) {
      const rawDate = booking.date || booking.bookingDate;
      const dateKey = rawDate ? (rawDate.includes('T') ? rawDate.split('T')[0] : rawDate) : '';
      if (!dateKey) continue;

      if (!groupsMap.has(dateKey)) {
        groupsMap.set(dateKey, []);
      }
      groupsMap.get(dateKey)!.push(booking);
    }

    const sortedDates = Array.from(groupsMap.keys()).sort();

    return sortedDates.map((dateKey) => {
      const bookings = groupsMap.get(dateKey)!.sort((a, b) => {
        const timeA = a.startTime || '';
        const timeB = b.startTime || '';
        return timeA.localeCompare(timeB);
      });

      const parts = dateKey.split('-');
      const d =
        parts.length === 3
          ? new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
          : new Date(dateKey);

      const formattedDate = d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

      return {
        date: dateKey,
        formattedDate,
        bookings,
      };
    });
  }, [selectedRangeBookings]);

  // Backward compatibility alias for selectedDateBookings
  const selectedDateBookings = selectedRangeBookings;
  const selectedDate = startDate;

  // Conflict Detection
  const conflictedBookingIds = useMemo(() => {
    return detectReservationConflicts(filteredBookings as any);
  }, [filteredBookings]);

  // Filter Actions
  const handleApplyFilters = (newFilters: CalendarFilterState) => {
    setFilters(newFilters);
    // When filters are applied, show the whole calendar of matching reservations
    selectWholeMonth();
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_CALENDAR_FILTERS);
    setSearchQuery('');
  };

  const handleAvailabilityQuickFilter = useCallback((val: string) => {
    setFilters((prev) => ({
      ...prev,
      availability: prev.availability === val && val !== 'ALL' ? 'ALL' : val,
    }));
  }, []);

  const handleRemoveFilter = (key: keyof CalendarFilterState | 'searchQuery', value?: string) => {
    if (key === 'searchQuery') {
      setSearchQuery('');
      return;
    }
    if (key === 'availability') {
      setFilters((prev) => ({ ...prev, availability: 'ALL' }));
      return;
    }
    if (key === 'facilityIds' && value) {
      setFilters((prev) => ({
        ...prev,
        facilityIds: prev.facilityIds.filter((id) => id !== value),
      }));
      return;
    }
    if (key === 'resourceIds' && value) {
      setFilters((prev) => ({
        ...prev,
        resourceIds: prev.resourceIds.filter((id) => id !== value),
      }));
      return;
    }
    if (key === 'bookingStatuses' && value) {
      setFilters((prev) => ({
        ...prev,
        bookingStatuses: prev.bookingStatuses.filter((s) => s !== value),
      }));
      return;
    }
    if (key === 'paymentStatuses' && value) {
      setFilters((prev) => ({
        ...prev,
        paymentStatuses: prev.paymentStatuses.filter((p) => p !== value),
      }));
      return;
    }
    setFilters((prev) => ({
      ...prev,
      [key]: INITIAL_CALENDAR_FILTERS[key],
    }));
  };

  // Active filter count for badge on Filter button (drawer filters)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.facilityIds.length > 0 && !filters.facilityIds.includes('All')) {
      count += filters.facilityIds.length;
    }
    if (filters.resourceIds.length > 0) {
      count += filters.resourceIds.length;
    }
    if (filters.bookingStatuses.length > 0) {
      count += filters.bookingStatuses.length;
    }
    if (filters.paymentStatuses.length > 0) {
      count += filters.paymentStatuses.length;
    }
    return count;
  }, [filters]);

  const handleLoadMore = useCallback(() => {
    if (pagination && pagination.currentPage < pagination.totalPages) {
      dispatch(
        fetchAdminCalendarThunk({
          startDate: dateBounds.startDate,
          endDate: dateBounds.endDate,
          amenityId: filters.facilityIds.length === 1 && filters.facilityIds[0] !== 'All' ? filters.facilityIds[0] : undefined,
          search: searchQuery.trim() || undefined,
          page: pagination.currentPage + 1,
        } as any)
      );
    }
  }, [
    dispatch,
    pagination,
    dateBounds.startDate,
    dateBounds.endDate,
    filters.facilityIds,
    searchQuery,
  ]);

  return {
    adminBookings,
    filteredBookings,
    selectedRangeBookings,
    selectedDateBookings,
    groupedReservationsByDate,
    bookingCountsByDate,
    amenities,
    availableResources,
    conflictedBookingIds,
    availabilitySummary,
    availabilityCounts,
    pagination,
    handleLoadMore,
    currentDate,
    startDate,
    endDate,
    selectedDate,
    handleSelectCalendarDate,
    handleDateChange,
    navigateDate,
    setToday,
    selectWholeMonth,
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    handleApplyFilters,
    handleResetFilters,
    handleAvailabilityQuickFilter,
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

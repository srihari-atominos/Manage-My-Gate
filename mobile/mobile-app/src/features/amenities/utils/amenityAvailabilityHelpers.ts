/**
 * Amenity Availability & Conflict Helpers
 * Pure calculation functions for facility and resource availability,
 * interval overlap, and conflict detection.
 */

export type AvailabilityState =
  | 'AVAILABLE'
  | 'PARTIALLY_AVAILABLE'
  | 'FULLY_BOOKED'
  | 'MAINTENANCE'
  | 'BLOCKED';

export interface TimeInterval {
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
}

export interface FacilityAvailabilityItem {
  facilityId: string;
  facilityName: string;
  state: AvailabilityState;
  label: string;
  totalResources?: number;
  availableResources?: number;
  activeBookingsCount?: number;
}

/**
 * Converts a "HH:mm" time string into minutes from midnight.
 */
export const timeToMinutes = (timeStr?: string): number => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
};

/**
 * Checks if two time intervals [startA, endA] and [startB, endB] overlap.
 * Rule: startA < endB && endA > startB
 */
export const isTimeIntervalOverlapping = (
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean => {
  const sA = timeToMinutes(startA);
  let eA = timeToMinutes(endA);
  const sB = timeToMinutes(startB);
  let eB = timeToMinutes(endB);

  // If end time is 00:00 (midnight) or less than start time, treat as 24:00 (end of day)
  if (eA <= sA) eA = 24 * 60;
  if (eB <= sB) eB = 24 * 60;

  return sA < eB && eA > sB;
};

/**
 * Maps time presets to time intervals.
 */
export const getTimePresetInterval = (preset: 'all' | 'morning' | 'afternoon' | 'evening' | 'custom', customStart?: string, customEnd?: string): TimeInterval | null => {
  switch (preset) {
    case 'morning':
      return { startTime: '06:00', endTime: '12:00' };
    case 'afternoon':
      return { startTime: '12:00', endTime: '17:00' };
    case 'evening':
      return { startTime: '17:00', endTime: '22:00' };
    case 'custom':
      if (customStart && customEnd) {
        return { startTime: customStart, endTime: customEnd };
      }
      return null;
    default:
      return null;
  }
};

/**
 * Evaluates facility availability for a given date and optional time window.
 */
export const calculateFacilityAvailability = (params: {
  facility: { _id: string; name: string; capacity?: number; isActive?: boolean; status?: string };
  reservations: Array<{
    _id: string;
    amenityId: any;
    resourceId?: string | null;
    resourceName?: string | null;
    date?: string;
    bookingDate?: string;
    startTime: string;
    endTime: string;
    status?: string;
    type?: string;
  }>;
  maintenanceBlocks: Array<{
    _id: string;
    amenityId?: any;
    facilityId?: string;
    resourceId?: string | null;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    type?: string;
    status?: string;
  }>;
  selectedDate: string;
  timeInterval?: TimeInterval | null;
}): FacilityAvailabilityItem => {
  const { facility, reservations, maintenanceBlocks, selectedDate, timeInterval } = params;
  const facilityId = facility._id;

  // 1. Check if facility is blocked or inactive
  if (facility.isActive === false || facility.status === 'blocked' || facility.status === 'inactive') {
    return {
      facilityId,
      facilityName: facility.name,
      state: 'BLOCKED',
      label: 'Blocked',
    };
  }

  // 2. Check for complete facility maintenance on the selected date
  const facilityMaintenance = maintenanceBlocks.filter((m) => {
    const mFacilityId =
      typeof m.amenityId === 'object' && m.amenityId ? m.amenityId._id : m.facilityId || m.amenityId;
    if (mFacilityId !== facilityId) return false;

    // Check date
    const mDate = m.startDate || (m as any).date || (m as any).bookingDate;
    if (mDate) {
      const dKey = mDate.includes('T') ? mDate.split('T')[0] : mDate;
      if (dKey !== selectedDate) return false;
    }

    // Check time overlap if interval specified
    if (timeInterval && m.startTime && m.endTime) {
      return isTimeIntervalOverlapping(timeInterval.startTime, timeInterval.endTime, m.startTime, m.endTime);
    }
    return true;
  });

  const isCompleteMaintenance = facilityMaintenance.some((m) => !m.resourceId);
  if (isCompleteMaintenance) {
    return {
      facilityId,
      facilityName: facility.name,
      state: 'MAINTENANCE',
      label: 'Maintenance',
    };
  }

  // 3. Filter active reservations for this facility on the selected date
  const activeBookings = reservations.filter((b) => {
    if (b.type === 'maintenance') return false;
    const bFacilityId =
      typeof b.amenityId === 'object' && b.amenityId ? b.amenityId._id : b.amenityId;
    if (bFacilityId !== facilityId) return false;

    const bDate = b.date || b.bookingDate;
    if (bDate) {
      const dKey = bDate.includes('T') ? bDate.split('T')[0] : bDate;
      if (dKey !== selectedDate) return false;
    }

    const s = String(b.status || '').toUpperCase();
    if (s === 'CANCELLED' || s === 'REJECTED') return false;

    // Check time overlap if interval specified
    if (timeInterval && b.startTime && b.endTime) {
      return isTimeIntervalOverlapping(timeInterval.startTime, timeInterval.endTime, b.startTime, b.endTime);
    }
    return true;
  });

  // 4. Determine discrete resources if explicitly defined on facility
  const facilityResources = (facility as any).resources || [];
  if (facilityResources.length > 0) {
    const totalResources = facilityResources.length;
    const bookedOrMaintResources = new Set<string>();

    for (const b of activeBookings) {
      if (b.resourceId) bookedOrMaintResources.add(b.resourceId);
    }
    for (const m of facilityMaintenance) {
      if (m.resourceId) bookedOrMaintResources.add(m.resourceId);
    }

    const availableCount = Math.max(0, totalResources - bookedOrMaintResources.size);

    if (availableCount === 0) {
      return {
        facilityId,
        facilityName: facility.name,
        state: 'FULLY_BOOKED',
        label: 'Fully booked',
        totalResources,
        availableResources: 0,
        activeBookingsCount: activeBookings.length,
      };
    }

    if (availableCount < totalResources) {
      return {
        facilityId,
        facilityName: facility.name,
        state: 'PARTIALLY_AVAILABLE',
        label: `${availableCount} available`,
        totalResources,
        availableResources: availableCount,
        activeBookingsCount: activeBookings.length,
      };
    }

    return {
      facilityId,
      facilityName: facility.name,
      state: 'AVAILABLE',
      label: `${availableCount} available`,
      totalResources,
      availableResources: availableCount,
      activeBookingsCount: activeBookings.length,
    };
  }

  // 5. Single Facility / Capacity evaluation
  const capacity = facility.capacity;
  if (capacity && capacity > 0) {
    if (activeBookings.length >= capacity) {
      return {
        facilityId,
        facilityName: facility.name,
        state: 'FULLY_BOOKED',
        label: 'Fully booked',
        activeBookingsCount: activeBookings.length,
      };
    }
    if (activeBookings.length > 0) {
      const remaining = Math.max(0, capacity - activeBookings.length);
      return {
        facilityId,
        facilityName: facility.name,
        state: 'PARTIALLY_AVAILABLE',
        label: `${remaining} spots`,
        activeBookingsCount: activeBookings.length,
      };
    }
    return {
      facilityId,
      facilityName: facility.name,
      state: 'AVAILABLE',
      label: 'Available',
      activeBookingsCount: 0,
    };
  }

  // If no capacity specified: if any active booking, partially available; else available
  if (activeBookings.length > 0) {
    return {
      facilityId,
      facilityName: facility.name,
      state: 'PARTIALLY_AVAILABLE',
      label: `${activeBookings.length} booked`,
      activeBookingsCount: activeBookings.length,
    };
  }

  return {
    facilityId,
    facilityName: facility.name,
    state: 'AVAILABLE',
    label: 'Available',
    activeBookingsCount: 0,
  };
};

/**
 * Detects conflicts:
 * - Booking vs Booking: Two active bookings for the same facility & resource overlapping in time.
 * - Booking vs Maintenance: A booking overlapping with a maintenance block for the same facility/resource.
 * Returns a Set of conflicted booking IDs.
 */
export const detectReservationConflicts = (
  bookings: Array<{
    _id: string;
    amenityId: any;
    resourceId?: string | null;
    date?: string;
    bookingDate?: string;
    startTime: string;
    endTime: string;
    status?: string;
    type?: string;
  }>
): Set<string> => {
  const conflictIds = new Set<string>();

  const activeReservations = bookings.filter(
    (b) => b.type !== 'maintenance' && b.status !== 'CANCELLED' && b.status !== 'REJECTED'
  );
  const maintenanceBlocks = bookings.filter((b) => b.type === 'maintenance');

  // 1. Booking vs Booking
  for (let i = 0; i < activeReservations.length; i++) {
    const a = activeReservations[i];
    const aFacilityId = typeof a.amenityId === 'object' && a.amenityId ? a.amenityId._id : a.amenityId;
    const aDate = a.date || a.bookingDate;

    for (let j = i + 1; j < activeReservations.length; j++) {
      const b = activeReservations[j];
      const bFacilityId = typeof b.amenityId === 'object' && b.amenityId ? b.amenityId._id : b.amenityId;
      const bDate = b.date || b.bookingDate;

      if (aFacilityId === bFacilityId && aDate === bDate) {
        // If resource is specified, must match. If no resource, both are for the facility.
        const sameResource = a.resourceId && b.resourceId ? a.resourceId === b.resourceId : true;
        if (sameResource && isTimeIntervalOverlapping(a.startTime, a.endTime, b.startTime, b.endTime)) {
          conflictIds.add(a._id);
          conflictIds.add(b._id);
        }
      }
    }
  }

  // 2. Booking vs Maintenance
  for (const a of activeReservations) {
    const aFacilityId = typeof a.amenityId === 'object' && a.amenityId ? a.amenityId._id : a.amenityId;
    const aDate = a.date || a.bookingDate;

    for (const m of maintenanceBlocks) {
      const mFacilityId = typeof m.amenityId === 'object' && m.amenityId ? m.amenityId._id : m.amenityId;
      const mDate = m.date || m.bookingDate;

      if (aFacilityId === mFacilityId && aDate === mDate) {
        const sameResource = m.resourceId ? m.resourceId === a.resourceId : true;
        if (sameResource && isTimeIntervalOverlapping(a.startTime, a.endTime, m.startTime, m.endTime)) {
          conflictIds.add(a._id);
        }
      }
    }
  }

  return conflictIds;
};

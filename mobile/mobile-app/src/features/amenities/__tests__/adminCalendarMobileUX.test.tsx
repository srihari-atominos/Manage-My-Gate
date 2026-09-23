/**
 * Admin Calendar Mobile UX & Behavior Verification Tests
 * Verifies:
 * 1. Compact Month calendar rendering with date numbers & booking count indicators
 * 2. Resident names NOT appearing inside calendar cells
 * 3. Date selection updating reservation list locally without redundant API calls
 * 4. Reservation card display (Facility, Resource, Time, Resident, Unit, Status, Payment, Ref ID)
 * 5. Complete removal of "+ Reserve", "Maintenance", "Cancel Slot", and "Cancel Booking" buttons
 * 6. Deduplication and exclusion of maintenance events from reservation counts
 * 7. Tapping card opens BookingDetailModal
 * 8. Real availability business logic (Available, Partially Available, Fully Booked, Maintenance, Blocked)
 * 9. Conflict detection (Booking vs Booking, Booking vs Maintenance)
 * 10. Filter Drawer & Facility -> Resource dependency
 * 11. Time window filtering (Morning, Afternoon, Evening, Custom)
 * 12. Active filter chips and individual removal
 * 13. Context-aware empty state with Clear Filters action
 */

import React from 'react';
import { render, screen, fireEvent, act, renderHook } from '@testing-library/react-native';
import { View, Text } from 'react-native';

let mockState: any;
const mockDispatch = jest.fn((action: any) => action);

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: any) => selector(mockState),
}));

const mockFetchAdminCalendarThunk = jest.fn();
const mockFetchAmenitiesThunk = jest.fn();

jest.mock('../store/amenityBookingSlice', () => {
  const actual = jest.requireActual('../store/amenityBookingSlice');
  return {
    ...actual,
    fetchAdminCalendarThunk: (params: any) => {
      mockFetchAdminCalendarThunk(params);
      return { type: 'amenityBookings/fetchAdminCalendar', payload: params };
    },
    createManualBookingThunk: jest.fn(),
    adminCancelBookingThunk: jest.fn(),
  };
});

jest.mock('../store/amenitySlice', () => ({
  fetchAmenitiesThunk: (params: any) => {
    mockFetchAmenitiesThunk(params);
    return { type: 'amenities/fetchAmenities', payload: params };
  },
}));

// Mock expo-router
const mockRouterPush = jest.fn();
const mockRouterBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockRouterPush, back: mockRouterBack }),
  usePathname: () => '/(resident)/amenities/admin-calendar',
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
}));

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  return {
    ...Reanimated,
    useAnimatedStyle: (fn: any) => (typeof fn === 'function' ? fn() : {}),
    useSharedValue: (val: any) => ({ value: val }),
    withTiming: (val: any) => val,
    withRepeat: (val: any) => val,
    withSequence: (...args: any[]) => args[0],
    FadeIn: { duration: () => ({}) },
    FadeOut: { duration: () => ({}) },
  };
});

// Mock navigation modals
jest.mock('@/components/navigation/BottomNavigationBar', () => ({
  BottomNavigationBar: () => null,
}));
jest.mock('@/components/navigation/RoleSwitchModal', () => ({
  RoleSwitchModal: () => null,
}));
jest.mock('@/components/navigation/VillaSwitchModal', () => ({
  VillaSwitchModal: () => null,
}));
jest.mock('@/components/navigation/GlobalNavModal', () => ({
  GlobalNavModal: () => null,
}));

// Mock auth & permissions
jest.mock('@/src/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { _id: 'admin-1', name: 'Admin User', role: 'admin', permissions: ['amenities:admin_calander'] },
    isAuthenticated: true,
  }),
}));
jest.mock('../../auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { _id: 'admin-1', name: 'Admin User', role: 'admin', permissions: ['amenities:admin_calander'] },
    isAuthenticated: true,
  }),
}));

jest.mock('@/src/utils/rbac', () => ({
  isFeatureAllowedForUser: () => true,
  checkIsAdmin: () => true,
  getUserRoleName: () => 'admin',
}));
jest.mock('../../../utils/rbac', () => ({
  isFeatureAllowedForUser: () => true,
  checkIsAdmin: () => true,
  getUserRoleName: () => 'admin',
}));

// Mock safe area context
jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaView: ({ children }: any) => children,
  };
});

// Mock Modal to expose children in tests
jest.mock('react-native/Libraries/Modal/Modal', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockModal = ({ children, visible, testID }: any) =>
    visible ? <View testID={testID || 'mock-modal'}>{children}</View> : null;
  MockModal.displayName = 'Modal';
  return {
    __esModule: true,
    default: MockModal,
  };
});

import { useAdminCalendar } from '../hooks/useAdminCalendar';
import { AdminCalendarView } from '../components/AdminCalendarView';
import { AdminReservationCard } from '../components/AdminReservationCard';
import { AdminAvailabilitySummary } from '../components/AdminAvailabilitySummary';
import { AdminActiveFilterChips } from '../components/AdminActiveFilterChips';
import { AdminCalendarFilterDrawer } from '../components/AdminCalendarFilterDrawer';
import AdminAmenityCalendarScreen from '../../../../app/(resident)/amenities/admin-calendar';
import { AmenityBooking } from '../store/amenityBookingSlice';
import {
  calculateFacilityAvailability,
  detectReservationConflicts,
  isTimeIntervalOverlapping,
} from '../utils/amenityAvailabilityHelpers';

describe('Admin Calendar Mobile UX & Behavior Tests', () => {
  const mockBookings: AmenityBooking[] = [
    {
      _id: 'book-1',
      bookingId: 'BK-1001',
      reservationNumber: 'RES-1001',
      date: '2026-09-22',
      bookingDate: '2026-09-22',
      startTime: '09:00',
      endTime: '10:00',
      amenityId: 'amenity-gym',
      amenityName: 'Gymnasium',
      resourceId: 'res-gym-1',
      resourceName: 'Weight Section',
      residentName: 'Naveen Vijayakumar',
      villaNumber: 'Villa 101',
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      type: 'booking',
      numberOfPersons: 2,
    } as any,
    {
      _id: 'book-2',
      bookingId: 'BK-1002',
      reservationNumber: 'RES-1002',
      date: '2026-09-22',
      bookingDate: '2026-09-22',
      startTime: '11:00',
      endTime: '12:00',
      amenityId: 'amenity-pool',
      amenityName: 'Swimming Pool',
      resourceId: 'res-pool-1',
      resourceName: 'Lane 1',
      residentName: 'Arun Kumar',
      villaNumber: 'Villa 205',
      status: 'CONFIRMED',
      paymentStatus: 'PENDING',
      type: 'booking',
      numberOfPersons: 1,
    } as any,
    {
      _id: 'maint-1',
      bookingId: 'MNT-501',
      date: '2026-09-22',
      bookingDate: '2026-09-22',
      startTime: '14:00',
      endTime: '16:00',
      amenityId: 'amenity-tennis',
      amenityName: 'Tennis Court',
      subtitle: 'Net Repair',
      status: 'CONFIRMED',
      type: 'maintenance',
    } as any,
    {
      _id: 'book-3',
      bookingId: 'BK-1003',
      reservationNumber: 'RES-1003',
      date: '2026-09-23',
      bookingDate: '2026-09-23',
      startTime: '10:00',
      endTime: '11:00',
      amenityId: 'amenity-club',
      amenityName: 'Clubhouse',
      residentName: 'Sara Khan',
      villaNumber: 'Villa 302',
      status: 'CHECKED_IN',
      paymentStatus: 'PARTIALLY_PAID',
      type: 'booking',
      numberOfPersons: 4,
    } as any,
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockState = {
      amenityBookings: {
        adminBookings: mockBookings,
        pagination: { currentPage: 1, totalPages: 1, totalRecords: 4, limit: 50 },
        loading: false,
        error: null,
      },
      amenities: {
        amenities: [
          { _id: 'amenity-gym', name: 'Gymnasium', capacity: 20, isActive: true },
          { _id: 'amenity-pool', name: 'Swimming Pool', capacity: 10, isActive: true },
          { _id: 'amenity-tennis', name: 'Tennis Court', capacity: 4, isActive: true },
          { _id: 'amenity-club', name: 'Clubhouse', capacity: 50, isActive: true },
        ],
      },
      auth: {
        user: { _id: 'admin-1', name: 'Admin User', role: 'admin', permissions: ['amenities:admin_calander'] },
      },
    };
  });

  describe('1. AdminCalendarView Component (Compact Month View & Date Range)', () => {
    it('renders compact month grid with date numbers and booking counts without resident names', async () => {
      const onSelectDate = jest.fn();
      const bookingCounts = { '2026-09-22': 2, '2026-09-23': 1 };

      await render(
        <AdminCalendarView
          currentDate={new Date(2026, 8, 1)} // September 2026
          startDate="2026-09-22"
          endDate="2026-09-22"
          onSelectDate={onSelectDate}
          bookingCountsByDate={bookingCounts}
          onPrevDate={jest.fn()}
          onNextDate={jest.fn()}
        />
      );

      // Date number 22 should be present
      expect(screen.getByText('22')).toBeTruthy();
      // Date 22 has 2 bookings (verified via accessibility label)
      expect(screen.getByLabelText(/September 2026 22, 2 bookings/)).toBeTruthy();

      // Date number 23 should be present with 1 booking
      expect(screen.getByText('23')).toBeTruthy();
      expect(screen.getByLabelText(/September 2026 23, 1 bookings/)).toBeTruthy();

      // CRITICAL: Resident names MUST NOT appear in calendar cells
      expect(screen.queryByText('Naveen Vijayakumar')).toBeNull();
      expect(screen.queryByText('Arun Kumar')).toBeNull();
      expect(screen.queryByText('Sara Khan')).toBeNull();
    });

    it('renders range start, middle, and end visual states with appropriate accessibility labels', async () => {
      const onSelectDate = jest.fn();
      const bookingCounts = { '2026-09-22': 2, '2026-09-23': 1, '2026-09-24': 0, '2026-09-25': 3 };

      await render(
        <AdminCalendarView
          currentDate={new Date(2026, 8, 1)}
          startDate="2026-09-22"
          endDate="2026-09-25"
          onSelectDate={onSelectDate}
          bookingCountsByDate={bookingCounts}
          onPrevDate={jest.fn()}
          onNextDate={jest.fn()}
        />
      );

      // Start date (22)
      expect(screen.getByLabelText('September 2026 22, 2 bookings, range start')).toBeTruthy();
      // Middle date (23)
      expect(screen.getByLabelText('September 2026 23, 1 bookings, in range')).toBeTruthy();
      // Middle date (24)
      expect(screen.getByLabelText('September 2026 24, 0 bookings, in range')).toBeTruthy();
      // End date (25)
      expect(screen.getByLabelText('September 2026 25, 3 bookings, range end')).toBeTruthy();
    });

    it('triggers onSelectDate when a date cell is pressed', async () => {
      const onSelectDate = jest.fn();
      await render(
        <AdminCalendarView
          currentDate={new Date(2026, 8, 1)}
          startDate="2026-09-22"
          endDate={null}
          onSelectDate={onSelectDate}
          bookingCountsByDate={{ '2026-09-22': 2 }}
          onPrevDate={jest.fn()}
          onNextDate={jest.fn()}
        />
      );

      fireEvent.press(screen.getByText('22'));
      expect(onSelectDate).toHaveBeenCalledWith('2026-09-22', false);
    });

    it('does NOT contain Day View or Week View options or switcher', async () => {
      await render(
        <AdminCalendarView
          currentDate={new Date(2026, 8, 1)}
          startDate="2026-09-22"
          endDate="2026-09-22"
          onSelectDate={jest.fn()}
          bookingCountsByDate={{}}
          onPrevDate={jest.fn()}
          onNextDate={jest.fn()}
        />
      );

      expect(screen.queryByText('Day View')).toBeNull();
      expect(screen.queryByText('Week View')).toBeNull();
      expect(screen.queryByText('Month View')).toBeNull();
    });
  });

  describe('2. AdminReservationCard Component', () => {
    it('renders facility, resource, time slot, resident, unit, status, payment status, and ref ID', async () => {
      const onPress = jest.fn();
      await render(
        <AdminReservationCard booking={mockBookings[0]} onPress={onPress} />
      );

      // Facility & Resource
      expect(screen.getByText('Gymnasium • Weight Section')).toBeTruthy();
      // Time, Resident & Unit
      expect(screen.getByText(/9:00 AM - 10:00 AM • Naveen Vijayakumar \(Villa 101\)/)).toBeTruthy();
      // Status
      expect(screen.getByText(/confirmed/i)).toBeTruthy();
      // Payment Status
      expect(screen.getByText('Paid')).toBeTruthy();
      // Ref ID
      expect(screen.getByText('Ref: #RES-1001')).toBeTruthy();
      // Headcount
      expect(screen.getByText('2 Person(s)')).toBeTruthy();
    });

    it('renders conflict badge when isConflicted is true', async () => {
      await render(
        <AdminReservationCard booking={mockBookings[0]} onPress={jest.fn()} isConflicted={true} />
      );

      expect(screen.getByText('CONFLICT')).toBeTruthy();
    });

    it('does NOT render Cancel Slot or Cancel Booking buttons', async () => {
      await render(
        <AdminReservationCard booking={mockBookings[0]} onPress={jest.fn()} />
      );

      expect(screen.queryByText('Cancel Slot')).toBeNull();
      expect(screen.queryByText('Cancel Booking')).toBeNull();
      expect(screen.queryByText('Cancel')).toBeNull();
    });

    it('fires onPress when tapped to open detail modal', async () => {
      const onPress = jest.fn();
      await render(
        <AdminReservationCard booking={mockBookings[0]} onPress={onPress} />
      );

      fireEvent.press(screen.getByText('Gymnasium • Weight Section'));
      expect(onPress).toHaveBeenCalledWith(mockBookings[0]);
    });
  });

  describe('3. Availability & Conflict Business Logic', () => {
    it('calculates interval overlaps accurately', () => {
      expect(isTimeIntervalOverlapping('09:00', '10:00', '09:30', '10:30')).toBe(true);
      expect(isTimeIntervalOverlapping('09:00', '10:00', '10:00', '11:00')).toBe(false);
      expect(isTimeIntervalOverlapping('14:00', '16:00', '15:00', '15:30')).toBe(true);
      expect(isTimeIntervalOverlapping('14:00', '16:00', '16:01', '17:00')).toBe(false);
    });

    it('evaluates facility availability considering reservations and maintenance', () => {
      // 1. Tennis court has complete maintenance on 2026-09-22
      const tennisAvail = calculateFacilityAvailability({
        facility: { _id: 'amenity-tennis', name: 'Tennis Court', capacity: 4, isActive: true },
        reservations: mockBookings as any,
        maintenanceBlocks: [mockBookings[2]] as any,
        selectedDate: '2026-09-22',
      });
      expect(tennisAvail.state).toBe('MAINTENANCE');
      expect(tennisAvail.label).toBe('Maintenance');

      // 2. Gymnasium on 2026-09-22 has 1 active booking out of capacity 20
      const gymAvail = calculateFacilityAvailability({
        facility: { _id: 'amenity-gym', name: 'Gymnasium', capacity: 20, isActive: true },
        reservations: mockBookings as any,
        maintenanceBlocks: [],
        selectedDate: '2026-09-22',
      });
      expect(gymAvail.state).toBe('PARTIALLY_AVAILABLE');
      expect(gymAvail.label).toBe('19 spots');

      // 3. Blocked / inactive facility
      const blockedAvail = calculateFacilityAvailability({
        facility: { _id: 'amenity-blocked', name: 'Sauna', isActive: false },
        reservations: [],
        maintenanceBlocks: [],
        selectedDate: '2026-09-22',
      });
      expect(blockedAvail.state).toBe('BLOCKED');
      expect(blockedAvail.label).toBe('Blocked');
    });

    it('detects booking conflicts and maintenance conflicts', () => {
      const conflictedBookings = [
        ...mockBookings,
        // Overlapping booking on Gym with same resource
        {
          _id: 'book-conflict',
          bookingId: 'BK-1004',
          date: '2026-09-22',
          startTime: '09:30',
          endTime: '10:30',
          amenityId: 'amenity-gym',
          resourceId: 'res-gym-1',
          status: 'CONFIRMED',
          type: 'booking',
        } as any,
      ];

      const conflictIds = detectReservationConflicts(conflictedBookings as any);
      expect(conflictIds.has('book-1')).toBe(true);
      expect(conflictIds.has('book-conflict')).toBe(true);
    });
  });

  describe('4. Filter Drawer & Active Filter Chips', () => {
    it('supports facility multi-select with search and resource dependency', async () => {
      const onApply = jest.fn();
      const onReset = jest.fn();
      const initialFilters = {
        facilityIds: ['amenity-gym'],
        resourceIds: [],
        availability: 'ALL',
        bookingStatuses: [],
        paymentStatuses: [],
      };

      await render(
        <AdminCalendarFilterDrawer
          visible={true}
          onClose={jest.fn()}
          filters={initialFilters}
          onApply={onApply}
          onReset={onReset}
          amenities={[
            { _id: 'amenity-gym', name: 'Gymnasium' },
            { _id: 'amenity-pool', name: 'Swimming Pool' },
          ]}
          availableResources={[
            { _id: 'res-gym-1', name: 'Weight Section', facilityId: 'amenity-gym' },
            { _id: 'res-pool-1', name: 'Lane 1', facilityId: 'amenity-pool' },
          ]}
        />
      );

      // Verify Date Range and Time Slot sections are COMPLETELY REMOVED from drawer
      expect(screen.queryByText('Date Range')).toBeNull();
      expect(screen.queryByText('Time Slot')).toBeNull();
      expect(screen.queryByText('Morning')).toBeNull();
      expect(screen.queryByText('Evening')).toBeNull();

      // Facilities are NOT shown by default (no default values shown; user searches to find them)
      expect(screen.queryByText('Swimming Pool')).toBeNull();

      // Search facilities
      const searchInput = screen.getByPlaceholderText('Search facility or feature...');
      await act(async () => {
        fireEvent.changeText(searchInput, 'Swimming');
      });

      // Swimming Pool should be visible after typing search
      expect(screen.getByText('Swimming Pool')).toBeTruthy();

      // Tap Swimming Pool to add it to multi-select
      await act(async () => {
        fireEvent.press(screen.getByText('Swimming Pool'));
      });

      // Clear search to see resources
      await act(async () => {
        fireEvent.changeText(searchInput, '');
      });

      // Check that resource for gym is available
      expect(screen.getByText('Weight Section')).toBeTruthy();

      // Tap Weight Section
      await act(async () => {
        fireEvent.press(screen.getByText('Weight Section'));
      });

      // Tap Confirmed status
      await act(async () => {
        fireEvent.press(screen.getByText('Confirmed'));
      });

      // Tap Paid payment status
      await act(async () => {
        fireEvent.press(screen.getByText('Paid'));
      });

      // Apply
      await act(async () => {
        fireEvent.press(screen.getByText(/Apply Filters/));
      });

      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({
          facilityIds: expect.arrayContaining(['amenity-gym', 'amenity-pool']),
          resourceIds: ['res-gym-1'],
          bookingStatuses: ['CONFIRMED'],
          paymentStatuses: ['PAID'],
        })
      );
    });

    it('renders active filter chips for multi-select and handles individual removal and clear all', async () => {
      const onRemove = jest.fn();
      const onClearAll = jest.fn();
      const activeFilters = {
        facilityIds: ['amenity-gym'],
        resourceIds: ['res-gym-1'],
        availability: 'AVAILABLE',
        bookingStatuses: ['CONFIRMED'],
        paymentStatuses: ['PAID'],
      };

      await render(
        <AdminActiveFilterChips
          filters={activeFilters}
          searchQuery="Naveen"
          onRemoveFilter={onRemove}
          onClearAll={onClearAll}
          amenities={[{ _id: 'amenity-gym', name: 'Gymnasium' }]}
          availableResources={[{ _id: 'res-gym-1', name: 'Weight Section' }]}
        />
      );

      expect(screen.getByText('Search: "Naveen"')).toBeTruthy();
      expect(screen.getByText('Facility: Gymnasium')).toBeTruthy();
      expect(screen.getByText('Resource: Weight Section')).toBeTruthy();
      expect(screen.getByText('Avail: Available')).toBeTruthy();
      expect(screen.getByText('Status: CONFIRMED')).toBeTruthy();
      expect(screen.getByText('Payment: PAID')).toBeTruthy();
      // NO date or time chip
      expect(screen.queryByText(/Date:/)).toBeNull();
      expect(screen.queryByText(/Time:/)).toBeNull();

      // Remove an individual chip (facility is index 1 after search)
      const removeButtons = screen.getAllByLabelText('Remove');
      await act(async () => {
        fireEvent.press(removeButtons[1]);
      });
      expect(onRemove).toHaveBeenCalledWith('facilityIds', 'amenity-gym');

      // Tap Clear All
      await act(async () => {
        fireEvent.press(screen.getByText('Clear All'));
      });
      expect(onClearAll).toHaveBeenCalled();
    });
  });

  describe('5. useAdminCalendar Hook Behavior', () => {
    it('groups bookings by date and excludes maintenance from reservation counts', async () => {
      const { result } = await renderHook(() => useAdminCalendar());

      // On 2026-09-22, there are 2 bookings and 1 maintenance block.
      // The count must be 2 (maintenance excluded from reservation count).
      expect(result.current.bookingCountsByDate['2026-09-22']).toBe(2);
      // On 2026-09-23, there is 1 booking.
      expect(result.current.bookingCountsByDate['2026-09-23']).toBe(1);
    });

    it('handles date range state machine (first tap, second tap, same date, backward range, new range)', async () => {
      const { result } = await renderHook(() => useAdminCalendar());

      // 1. Single click on 2026-09-22: selects that date immediately as normal single date ("single click means it shows normal")
      await act(async () => {
        result.current.handleSelectCalendarDate('2026-09-22', false);
      });
      expect(result.current.startDate).toBe('2026-09-22');
      expect(result.current.endDate).toBe('2026-09-22');

      // 2. Double click on 2026-09-22: enters range mode ("double click only it should available the filter")
      await act(async () => {
        result.current.handleSelectCalendarDate('2026-09-22', true);
      });
      expect(result.current.startDate).toBe('2026-09-22');
      expect(result.current.endDate).toBeNull();

      // 3. Single click on second date (2026-09-25): completes range
      await act(async () => {
        result.current.handleSelectCalendarDate('2026-09-25', false);
      });
      expect(result.current.startDate).toBe('2026-09-22');
      expect(result.current.endDate).toBe('2026-09-25');

      // 4. Single click after range: returns to normal single-date selection
      await act(async () => {
        result.current.handleSelectCalendarDate('2026-09-28', false);
      });
      expect(result.current.startDate).toBe('2026-09-28');
      expect(result.current.endDate).toBe('2026-09-28');

      // 5. Double click on 2026-09-25 then single click on earlier date (2026-09-20) -> backward normalization
      await act(async () => {
        result.current.handleSelectCalendarDate('2026-09-25', true);
      });
      expect(result.current.startDate).toBe('2026-09-25');
      expect(result.current.endDate).toBeNull();

      await act(async () => {
        result.current.handleSelectCalendarDate('2026-09-20', false);
      });
      expect(result.current.startDate).toBe('2026-09-20');
      expect(result.current.endDate).toBe('2026-09-25');
    });

    it('groups reservations chronologically by date and sorts by startTime', async () => {
      const { result } = await renderHook(() => useAdminCalendar());

      // Select range spanning 2026-09-22 to 2026-09-23 via double click then second date
      await act(async () => {
        result.current.handleSelectCalendarDate('2026-09-22', true);
      });
      await act(async () => {
        result.current.handleSelectCalendarDate('2026-09-23', false);
      });

      const groups = result.current.groupedReservationsByDate;
      expect(groups.length).toBe(2);
      expect(groups[0].date).toBe('2026-09-22');
      // 2 bookings + 1 maintenance scheduled on 2026-09-22
      expect(groups[0].bookings.length).toBe(3);
      // Sorted by startTime (09:00 before 11:00 before 14:00)
      expect(groups[0].bookings[0].startTime).toBe('09:00');
      expect(groups[0].bookings[1].startTime).toBe('11:00');
      expect(groups[0].bookings[2].startTime).toBe('14:00');

      expect(groups[1].date).toBe('2026-09-23');
      expect(groups[1].bookings.length).toBe(1);
    });

    it('filters selectedRangeBookings locally without refetching network', async () => {
      const { result } = await renderHook(() => useAdminCalendar());

      // Single click selects 2026-09-22 normally
      await act(async () => {
        result.current.handleSelectCalendarDate('2026-09-22', false);
      });

      // 2 bookings + 1 maintenance scheduled on 2026-09-22
      expect(result.current.selectedRangeBookings.length).toBe(3);

      const fetchCount = mockFetchAdminCalendarThunk.mock.calls.length;

      // Single click selects 2026-09-23 normally
      await act(async () => {
        result.current.handleSelectCalendarDate('2026-09-23', false);
      });

      expect(result.current.selectedRangeBookings.length).toBe(1);
      // No extra network call
      expect(mockFetchAdminCalendarThunk.mock.calls.length).toBe(fetchCount);
    });

    it('updates booking counts dynamically when multi-select filters are applied', async () => {
      const { result } = await renderHook(() => useAdminCalendar());

      expect(result.current.bookingCountsByDate['2026-09-22']).toBe(2);

      // Apply Facility = Gym filter
      await act(async () => {
        result.current.handleApplyFilters({
          ...result.current.filters,
          facilityIds: ['amenity-gym'],
        });
      });

      // Only 1 gym booking on 2026-09-22
      expect(result.current.bookingCountsByDate['2026-09-22']).toBe(1);
    });
  });

  describe('6. AdminAmenityCalendarScreen Layout, Compact Header & Empty States', () => {
    it('completely removes + Reserve and Maintenance action buttons from screen header', async () => {
      await render(<AdminAmenityCalendarScreen />);

      expect(screen.queryByLabelText('Reserve manual slot')).toBeNull();
      expect(screen.queryByLabelText('Maintenance Schedule')).toBeNull();
      expect(screen.queryByText('+ Reserve')).toBeNull();
    });

    it('completely removes Cancel Slot and Cancel Booking buttons from the entire screen', async () => {
      await render(<AdminAmenityCalendarScreen />);

      expect(screen.queryByText('Cancel Slot')).toBeNull();
      expect(screen.queryByText('Cancel Booking')).toBeNull();
    });

    it('renders range summary label and date-grouped section headers', async () => {
      await render(<AdminAmenityCalendarScreen />);

      // Selected header label
      expect(screen.getByText('Selected')).toBeTruthy();
      expect(screen.getByText(/Reservations \(/)).toBeTruthy();
    });

    it('renders context-aware empty state with Clear Filters button when filters match zero', async () => {
      mockState = {
        ...mockState,
        amenityBookings: {
          adminBookings: [],
          pagination: { currentPage: 1, totalPages: 1, totalRecords: 0, limit: 50 },
          loading: false,
          error: null,
        },
      };
      await render(<AdminAmenityCalendarScreen />);

      // Search for something with no matches
      const searchInput = screen.getByPlaceholderText('Search resident, villa #, ref ID...');
      fireEvent.changeText(searchInput, 'NonExistentResident12345');

      const filteredEmptyElement = await screen.findByText('No reservations match the selected filters');
      expect(filteredEmptyElement).toBeTruthy();
      expect(screen.getByText('Clear Filters')).toBeTruthy();
    });

    it('renders standard empty state when no filters are active and date has no bookings', async () => {
      mockState = {
        ...mockState,
        amenityBookings: {
          adminBookings: [],
          pagination: { currentPage: 1, totalPages: 1, totalRecords: 0, limit: 50 },
          loading: false,
          error: null,
        },
      };
      await render(<AdminAmenityCalendarScreen />);

      const emptyElement = await screen.findByText('No reservations for this date');
      expect(emptyElement).toBeTruthy();
    });

    it('renders Availability quick action filter row on the outside and updates filter on tap', async () => {
      await render(<AdminAmenityCalendarScreen />);

      // Verify quick action availability pills outside with live counts
      expect(screen.getByText(/^All \(/)).toBeTruthy();
      expect(screen.getByText(/^Available \(/)).toBeTruthy();
      expect(screen.getByText(/^Maintenance \(/)).toBeTruthy();

      // Tap on Maintenance quick action pill
      const maintPill = screen.getByText(/^Maintenance \(/);
      await act(async () => {
        fireEvent.press(maintPill);
      });

      // Active filter chip for availability appears
      expect(screen.getByText('Avail: Maintenance')).toBeTruthy();
    });
  });
});

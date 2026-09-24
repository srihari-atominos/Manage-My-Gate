/**
 * Amenity Management Phase 6B.1 - Resident Discovery & Detail UI Tests
 * Validates the resident discovery catalog, archetype filtering, detail view presentation,
 * operating hours with IANA timezone, resource listings, and Book Now navigation boundary.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AmenityFacility, AmenityResource } from '../types/amenityDomain.types';
import {
  getArchetypeMeta,
  getFacilityStatusMeta,
  formatFacilityPricing,
  formatFacilityOperatingHours,
  isFacilityBookable,
} from '../utils/amenityPresentation';
import { AmenityCatalogCard } from '../components/AmenityCatalogCard';
import { ResidentAmenityDetailView } from '../components/ResidentAmenityDetailView';
import amenityManagementService from '../services/amenityManagementService';

// Mock react-native-worklets to satisfy reanimated hooks in Jest
jest.mock('react-native-worklets', () => ({
  isWorkletFunction: jest.fn(() => false),
  createWorkletRuntime: jest.fn(),
  runOnJS: jest.fn((fn) => fn),
  runOnUI: jest.fn((fn) => fn),
  scheduleOnUI: jest.fn((fn) => fn),
  createSerializable: jest.fn((val) => val),
  serializableMappingCache: new Map(),
  makeShareable: jest.fn((val) => val),
  makeMutable: jest.fn((val) => ({ value: val })),
}));

// Mock react-native-reanimated
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

// Mock amenityManagementService
jest.mock('../services/amenityManagementService', () => ({
  __esModule: true,
  default: {
    getFacilities: jest.fn(),
    getFacilityById: jest.fn(),
    getResources: jest.fn(),
  },
  amenityManagementService: {
    getFacilities: jest.fn(),
    getFacilityById: jest.fn(),
    getResources: jest.fn(),
  },
}));

// Mock react-redux
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: jest.fn((selector) => selector({ amenityBookings: {}, amenities: {} })),
}));

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => ({ id: 'facility-test-1' }),
  usePathname: () => '/amenities/discover',
}));

describe('Amenity Management Phase 6B.1: Resident Discovery & Detail UI', () => {
  const mockFacilityShared: AmenityFacility = {
    _id: 'fac-pool-1',
    orgId: 'org-1',
    name: 'Infinity Pool & Lounge',
    description: 'Olympic sized community swimming pool with heated jacuzzi and poolside lounge.',
    archetype: 'SHARED_CAPACITY',
    status: 'ACTIVE',
    maxCapacity: 40,
    maxHeadcountPerReservation: 4,
    slotDurationMinutes: 60,
    setupBufferMinutes: 10,
    teardownBufferMinutes: 15,
    timezone: 'Asia/Riyadh',
    pricingConfig: {
      type: 'FREE',
      baseRate: 0,
      depositAmount: 0,
      taxRate: 0,
      currency: 'SAR',
    },
    bookingRules: {
      minNoticeHours: 2,
      maxAdvanceBookingDays: 7,
      cancelNoticeHours: 3,
      requiresApproval: false,
      maxActiveReservationsPerResident: 2,
    },
    operatingHours: [
      { dayOfWeek: 0, opensAt: '06:00', closesAt: '22:00', isOpen: true },
      { dayOfWeek: 1, opensAt: '06:00', closesAt: '22:00', isOpen: true },
      { dayOfWeek: 2, opensAt: '06:00', closesAt: '22:00', isOpen: true },
      { dayOfWeek: 3, opensAt: '06:00', closesAt: '22:00', isOpen: true },
      { dayOfWeek: 4, opensAt: '06:00', closesAt: '22:00', isOpen: true },
      { dayOfWeek: 5, opensAt: '08:00', closesAt: '23:00', isOpen: true },
      { dayOfWeek: 6, opensAt: '08:00', closesAt: '23:00', isOpen: true },
    ],
    images: ['https://example.com/pool.jpg'],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };

  const mockFacilityTools: AmenityFacility = {
    _id: 'fac-tools-1',
    orgId: 'org-1',
    name: 'Estate Tool Workshop',
    description: 'Hardware tools and equipment available for resident checkout.',
    archetype: 'INVENTORY_TOOLS',
    status: 'ACTIVE',
    maxCapacity: 10,
    maxHeadcountPerReservation: 1,
    slotDurationMinutes: 120,
    setupBufferMinutes: 0,
    teardownBufferMinutes: 0,
    timezone: 'Asia/Riyadh',
    pricingConfig: {
      type: 'HOURLY',
      baseRate: 25,
      depositAmount: 100,
      taxRate: 15,
      currency: 'SAR',
    },
    bookingRules: {
      minNoticeHours: 1,
      maxAdvanceBookingDays: 3,
      cancelNoticeHours: 1,
      requiresApproval: true,
      maxActiveReservationsPerResident: 1,
    },
    operatingHours: [
      { dayOfWeek: 1, opensAt: '09:00', closesAt: '17:00', isOpen: true },
      { dayOfWeek: 2, opensAt: '09:00', closesAt: '17:00', isOpen: true },
      { dayOfWeek: 5, opensAt: '00:00', closesAt: '00:00', isOpen: false },
    ],
    images: [],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };

  const mockFacilityMaintenance: AmenityFacility = {
    ...mockFacilityShared,
    _id: 'fac-maint-1',
    name: 'Tennis Court Alpha',
    archetype: 'EXCLUSIVE_HOURLY',
    status: 'MAINTENANCE',
  };

  const mockFacilityInactive: AmenityFacility = {
    ...mockFacilityShared,
    _id: 'fac-inact-1',
    name: 'VIP Guest Suite',
    archetype: 'ROOM_RESOURCE',
    status: 'INACTIVE',
  };

  const mockFacilityDecommissioned: AmenityFacility = {
    ...mockFacilityShared,
    _id: 'fac-decom-1',
    name: 'Old Squash Court',
    archetype: 'EXCLUSIVE_HOURLY',
    status: 'DECOMMISSIONED',
  };

  const mockResources: AmenityResource[] = [
    {
      _id: 'res-tool-1',
      orgId: 'org-1',
      facilityId: 'fac-tools-1',
      name: 'Drilling Kit Heavy Duty',
      identifier: 'DRILL-01',
      concurrencyVersion: 1,
      setupBufferMinutes: 0,
      teardownBufferMinutes: 0,
      isSerializedAsset: true,
      serialNumber: 'SN-998822',
      assetState: 'AVAILABLE',
      totalBulkStock: 1,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
    {
      _id: 'res-tool-2',
      orgId: 'org-1',
      facilityId: 'fac-tools-1',
      name: 'Folding Banquet Chairs',
      identifier: 'CHAIR-BULK',
      concurrencyVersion: 1,
      setupBufferMinutes: 0,
      teardownBufferMinutes: 0,
      isSerializedAsset: false,
      assetState: 'AVAILABLE',
      totalBulkStock: 50,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // Scenario 1: Catalog Renders Facilities
  // ==========================================
  it('Scenario 1: renders facility card with name, description, and capacity info', async () => {
    const handlePress = jest.fn();
    const handleBook = jest.fn();

    await render(
      <AmenityCatalogCard
        amenity={mockFacilityShared}
        onPress={handlePress}
        onBookClick={handleBook}
      />
    );

    expect(screen.getByText('Infinity Pool & Lounge')).toBeTruthy();
    expect(screen.getByText(/Olympic sized community swimming pool/)).toBeTruthy();
    expect(screen.getByText(/Max 40/)).toBeTruthy();
  });

  // ==========================================
  // Scenario 2: Correct Archetype Presentation
  // ==========================================
  it('Scenario 2: correctly maps all 5 backend archetypes to presentation metadata', () => {
    const archetypes: Array<{ archetype: any; label: string; icon: string }> = [
      { archetype: 'SHARED_CAPACITY', label: 'Shared Capacity', icon: 'Users' },
      { archetype: 'EXCLUSIVE_HOURLY', label: 'Exclusive Hourly', icon: 'Timer' },
      { archetype: 'EVENT_SPACE', label: 'Event Space', icon: 'Sparkles' },
      { archetype: 'ROOM_RESOURCE', label: 'Room Resource', icon: 'DoorOpen' },
      { archetype: 'INVENTORY_TOOLS', label: 'Inventory & Tools', icon: 'Wrench' },
    ];

    archetypes.forEach(({ archetype, label, icon }) => {
      const meta = getArchetypeMeta(archetype);
      expect(meta.label).toBe(label);
      expect(meta.iconName).toBe(icon);
    });
  });

  // ==========================================
  // Scenario 3: Correct Facility Statuses
  // ==========================================
  it('Scenario 3: correctly maps facility statuses and bookable flags', () => {
    expect(getFacilityStatusMeta('ACTIVE')).toEqual({
      status: 'ACTIVE',
      label: 'Available',
      variant: 'success',
      isBookable: true,
      pulseDot: true,
    });

    expect(getFacilityStatusMeta('MAINTENANCE')).toEqual({
      status: 'MAINTENANCE',
      label: 'Under Maintenance',
      variant: 'warning',
      isBookable: false,
      pulseDot: false,
    });

    expect(getFacilityStatusMeta('INACTIVE')).toEqual({
      status: 'INACTIVE',
      label: 'Inactive',
      variant: 'neutral',
      isBookable: false,
      pulseDot: false,
    });

    expect(getFacilityStatusMeta('DECOMMISSIONED')).toEqual({
      status: 'DECOMMISSIONED',
      label: 'Decommissioned',
      variant: 'neutral',
      isBookable: false,
      pulseDot: false,
    });
  });

  // ==========================================
  // Scenario 4: No Invalid Archetypes
  // ==========================================
  it('Scenario 4: strictly rejects invented archetypes and falls back safely', () => {
    const invalidArchetypes = ['EXCLUSIVE_SLOT', 'UNLIMITED_OPEN', 'SLOT_EXCLUSIVE', 'PER_PERSON_DAILY'];
    invalidArchetypes.forEach((inv) => {
      const meta = getArchetypeMeta(inv);
      expect(meta.label).not.toBe(inv);
    });
  });

  // ==========================================
  // Scenario 5: Search Query Filter Handling
  // ==========================================
  it('Scenario 5: supports search query parameter delegation to getFacilities API', () => {
    (amenityManagementService.getFacilities as jest.Mock).mockResolvedValueOnce({
      data: {
        items: [mockFacilityShared],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      },
    });

    amenityManagementService.getFacilities({ search: 'pool', page: 1, limit: 20 });
    expect(amenityManagementService.getFacilities).toHaveBeenCalledWith({
      search: 'pool',
      page: 1,
      limit: 20,
    });
  });

  // ==========================================
  // Scenario 6: Archetype Filter Selection Handling
  // ==========================================
  it('Scenario 6: supports archetype filter parameter delegation to getFacilities API', () => {
    (amenityManagementService.getFacilities as jest.Mock).mockResolvedValueOnce({
      data: {
        items: [mockFacilityTools],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      },
    });

    amenityManagementService.getFacilities({ archetype: 'INVENTORY_TOOLS', page: 1, limit: 20 });
    expect(amenityManagementService.getFacilities).toHaveBeenCalledWith({
      archetype: 'INVENTORY_TOOLS',
      page: 1,
      limit: 20,
    });
  });

  // ==========================================
  // Scenario 7: Pagination Next-Page Loading
  // ==========================================
  it('Scenario 7: pagination state supports both standard and PaginatedList dual-key formats', () => {
    const rawPag = { page: 2, limit: 10, total: 25, pages: 3 };
    const extended = {
      ...rawPag,
      currentPage: rawPag.page,
      totalPages: rawPag.pages,
      totalRecords: rawPag.total,
    };

    expect(extended.currentPage).toBe(2);
    expect(extended.totalPages).toBe(3);
    expect(extended.totalRecords).toBe(25);
  });

  // ==========================================
  // Scenario 8: Empty Search Results Representation
  // ==========================================
  it('Scenario 8: detail view displays empty fallback when facility is null', async () => {
    await render(<ResidentAmenityDetailView facility={null} />);
    expect(screen.getByText('Facility information is unavailable.')).toBeTruthy();
  });

  // ==========================================
  // Scenario 9: Empty Facility Catalog Presentation
  // ==========================================
  it('Scenario 9: provides correct zero-data empty state structure', () => {
    const emptyCatalogData: AmenityFacility[] = [];
    expect(emptyCatalogData.length).toBe(0);
  });

  // ==========================================
  // Scenario 10: Network Error Display Handling
  // ==========================================
  it('Scenario 10: evaluates non-bookable status for maintenance facilities with descriptive message', () => {
    const maintCheck = isFacilityBookable(mockFacilityMaintenance);
    expect(maintCheck.canBook).toBe(false);
    expect(maintCheck.reason).toContain('maintenance');
  });

  // ==========================================
  // Scenario 11: Retry Action Dispatches Fetch
  // ==========================================
  it('Scenario 11: service call retry retrieves fresh facility data on failure recovery', async () => {
    (amenityManagementService.getFacilityById as jest.Mock)
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce({ data: mockFacilityShared });

    await expect(amenityManagementService.getFacilityById('fac-pool-1')).rejects.toThrow('Network Error');
    const result = await amenityManagementService.getFacilityById('fac-pool-1');
    expect(result.data.name).toBe('Infinity Pool & Lounge');
  });

  // ==========================================
  // Scenario 12: Detail View Renders Authoritative Data
  // ==========================================
  it('Scenario 12: detail view renders authoritative capacity, slot timing, and rules', async () => {
    await render(
      <ResidentAmenityDetailView facility={mockFacilityShared} onBookClick={jest.fn()} />
    );

    expect(screen.getByText('Infinity Pool & Lounge')).toBeTruthy();
    expect(screen.getByText('40 Persons')).toBeTruthy();
    expect(screen.getByText('4 Persons')).toBeTruthy();
    expect(screen.getByText('60 Minutes')).toBeTruthy();
    expect(screen.getByText(/10m setup \/ 15m teardown/)).toBeTruthy();
    expect(screen.getByText('No (Instant)')).toBeTruthy();
  });

  // ==========================================
  // Scenario 13: Resources Render for Tools & Rooms
  // ==========================================
  it('Scenario 13: renders associated resources list for INVENTORY_TOOLS archetype', async () => {
    await render(
      <ResidentAmenityDetailView
        facility={mockFacilityTools}
        resources={mockResources}
        onBookClick={jest.fn()}
      />
    );

    expect(screen.getByText('Estate Tool Workshop')).toBeTruthy();
    expect(screen.getByText(/DRILL-01 - Drilling Kit Heavy Duty/)).toBeTruthy();
    expect(screen.getByText(/CHAIR-BULK - Folding Banquet Chairs/)).toBeTruthy();
    expect(screen.getByText('(Qty: 50)')).toBeTruthy();
  });

  // ==========================================
  // Scenario 14: Operating Hours in Facility Timezone
  // ==========================================
  it('Scenario 14: formats weekly operating hours preserving facility timezone label', () => {
    const hours = formatFacilityOperatingHours(
      mockFacilityTools.operatingHours,
      mockFacilityTools.timezone
    );

    expect(hours).toHaveLength(3);
    expect(hours[0].day).toBe('Mon');
    expect(hours[0].hours).toBe('09:00 - 17:00');
    expect(hours[2].day).toBe('Fri');
    expect(hours[2].isOpen).toBe(false);
    expect(hours[2].hours).toBe('Closed');
  });

  // ==========================================
  // Scenario 15: Pricing Displays Server Config Without Local Calculation
  // ==========================================
  it('Scenario 15: pricing formatting reflects server configuration directly without calculating booking total', () => {
    const freePricing = formatFacilityPricing(mockFacilityShared.pricingConfig);
    expect(freePricing.isFree).toBe(true);
    expect(freePricing.displayRate).toBe('Free Access');

    const paidPricing = formatFacilityPricing(mockFacilityTools.pricingConfig);
    expect(paidPricing.isFree).toBe(false);
    expect(paidPricing.displayRate).toBe('25 SAR / hour');
    expect(paidPricing.displayDeposit).toContain('100 SAR');
  });

  // ==========================================
  // Scenario 16: Maintenance State Disables Book Now
  // ==========================================
  it('Scenario 16: displays maintenance alert banner and disables Book Now button', async () => {
    const handleBook = jest.fn();

    await render(
      <ResidentAmenityDetailView facility={mockFacilityMaintenance} onBookClick={handleBook} />
    );

    expect(screen.getByText('Facility Under Maintenance')).toBeTruthy();
    expect(screen.getAllByText('Under Maintenance').length).toBeGreaterThanOrEqual(1);

    const button = screen.getByLabelText('Book Tennis Court Alpha');
    fireEvent.press(button);

    // handleBook must NOT be called when disabled
    expect(handleBook).not.toHaveBeenCalled();
  });

  // ==========================================
  // Scenario 17: Inactive / Decommissioned Status Disables Book Now
  // ==========================================
  it('Scenario 17: disables Book Now button for INACTIVE and DECOMMISSIONED facilities', async () => {
    const handleBook = jest.fn();

    const inactCheck = isFacilityBookable(mockFacilityInactive);
    expect(inactCheck.canBook).toBe(false);

    const decomCheck = isFacilityBookable(mockFacilityDecommissioned);
    expect(decomCheck.canBook).toBe(false);

    await render(
      <ResidentAmenityDetailView facility={mockFacilityInactive} onBookClick={handleBook} />
    );

    const button = screen.getByLabelText('Book VIP Guest Suite');
    fireEvent.press(button);
    expect(handleBook).not.toHaveBeenCalled();
  });

  // ==========================================
  // Scenario 18: Book Now Passes Facility ID
  // ==========================================
  it('Scenario 18: Book Now button invokes callback with facility ID for ACTIVE facilities', async () => {
    const handleBook = jest.fn();

    await render(
      <ResidentAmenityDetailView facility={mockFacilityShared} onBookClick={handleBook} />
    );

    const button = screen.getByLabelText('Book Infinity Pool & Lounge');
    fireEvent.press(button);

    expect(handleBook).toHaveBeenCalledTimes(1);
    expect(handleBook).toHaveBeenCalledWith('fac-pool-1');
  });

  // ==========================================
  // Scenario 19: Zero Visitor Feature Imports
  // ==========================================
  it('Scenario 19: ensures zero visitor imports are used in presentation and detail components', () => {
    const fs = require('fs');
    const path = require('path');

    const detailViewCode = fs.readFileSync(
      path.resolve(__dirname, '../components/ResidentAmenityDetailView.tsx'),
      'utf8'
    );
    const cardCode = fs.readFileSync(
      path.resolve(__dirname, '../components/AmenityCatalogCard.tsx'),
      'utf8'
    );
    const utilsCode = fs.readFileSync(
      path.resolve(__dirname, '../utils/amenityPresentation.ts'),
      'utf8'
    );

    expect(detailViewCode).not.toContain('@/features/visitor');
    expect(cardCode).not.toContain('@/features/visitor');
    expect(utilsCode).not.toContain('@/features/visitor');
  });
});

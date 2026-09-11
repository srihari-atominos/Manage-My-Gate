/**
 * Amenity Management - Admin Master Console Unit Test Suite
 * Validates the 5 Canonical Archetypes, facility code generation, CRUD service contracts,
 * and presentation layers for the modernized Admin Amenity Master console.
 */

import {
  amenityManagementService,
  generateFacilityCode,
  getAmenityV2Url,
} from '../services/amenityManagementService';
import {
  getArchetypeMeta,
  getFacilityStatusMeta,
  formatFacilityPricing,
  formatFacilityOperatingHours,
} from '../utils/amenityPresentation';
import { AmenityArchetype } from '../types/amenityDomain.types';
import apiClient from '../../../services/apiClient';

// Mock apiClient for service method tests
jest.mock('../../../services/apiClient', () => {
  const original = jest.requireActual('../../../services/apiClient');
  return {
    ...original,
    __esModule: true,
    default: {
      defaults: {
        baseURL: 'http://localhost:5002/api/v1',
      },
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    },
    getApiBaseUrl: jest.fn(() => 'http://localhost:5002/api/v1'),
  };
});

describe('Admin Amenity Master - 5 Canonical Archetypes & Service Contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Facility Code Generator', () => {
    it('generates uppercase alphanumeric facility codes with prefix', () => {
      const code = generateFacilityCode('Tennis Court');
      expect(code).toMatch(/^TENNIS-COURT-\d{4}$/);
      expect(code).toBe(code.toUpperCase());
    });

    it('handles special characters and whitespace gracefully', () => {
      const code = generateFacilityCode('BBQ & Grill (North Wing)');
      expect(code).toMatch(/^BBQ-GRILL-NORTH-\d{4}$/);
      expect(code).not.toContain('&');
      expect(code).not.toContain('(');
      expect(code).not.toContain(')');
    });

    it('provides a clean fallback when name is empty', () => {
      const code = generateFacilityCode('');
      expect(code).toMatch(/^FAC-\d{4}$/);
    });
  });

  describe('2. Canonical Archetype Presentation Mapping', () => {
    const CANONICAL_ARCHETYPES: AmenityArchetype[] = [
      'SHARED_CAPACITY',
      'EXCLUSIVE_HOURLY',
      'EVENT_SPACE',
      'ROOM_RESOURCE',
      'INVENTORY_TOOLS',
    ];

    it('contains valid presentation metadata for all 5 canonical archetypes', () => {
      CANONICAL_ARCHETYPES.forEach((arch) => {
        const meta = getArchetypeMeta(arch);
        expect(meta.archetype).toBe(arch);
        expect(meta.label).toBeDefined();
        expect(meta.shortLabel).toBeDefined();
        expect(meta.iconName).toBeDefined();
        expect(meta.badgeBg).toBeDefined();
        expect(meta.badgeText).toBeDefined();
      });
    });

    it('correctly maps specific archetype labels', () => {
      expect(getArchetypeMeta('SHARED_CAPACITY').label).toBe('Shared Capacity');
      expect(getArchetypeMeta('EXCLUSIVE_HOURLY').label).toBe('Exclusive Hourly');
      expect(getArchetypeMeta('EVENT_SPACE').label).toBe('Event Space');
      expect(getArchetypeMeta('ROOM_RESOURCE').label).toBe('Room Resource');
      expect(getArchetypeMeta('INVENTORY_TOOLS').label).toBe('Inventory & Tools');
    });

    it('falls back safely when an unknown archetype is provided', () => {
      const fallback = getArchetypeMeta('UNKNOWN_TYPE' as any);
      expect(fallback.archetype).toBe('SHARED_CAPACITY');
      expect(fallback.label).toBe('Facility');
    });
  });

  describe('3. Pricing and Schedule Presentation Formatting', () => {
    it('formats free pricing accurately', () => {
      const pricing = formatFacilityPricing({
        type: 'FREE',
        baseRate: 0,
        depositAmount: 0,
        taxRate: 0,
        currency: 'INR',
      });
      expect(pricing.isFree).toBe(true);
      expect(pricing.displayRate).toBe('Free Access');
      expect(pricing.displayDeposit).toBe('No Deposit Required');
    });

    it('formats hourly paid pricing with currency and deposit', () => {
      const pricing = formatFacilityPricing({
        type: 'HOURLY',
        baseRate: 500,
        depositAmount: 200,
        taxRate: 18,
        currency: 'INR',
      });
      expect(pricing.isFree).toBe(false);
      expect(pricing.displayRate).toBe('500 INR / hour');
      expect(pricing.displayDeposit).toContain('200 INR (Refundable Deposit)');
    });

    it('formats operating hours with days and times', () => {
      const formatted = formatFacilityOperatingHours(
        [
          { dayOfWeek: 1, opensAt: '08:00', closesAt: '20:00', isOpen: true },
          { dayOfWeek: 0, opensAt: '00:00', closesAt: '00:00', isOpen: false },
        ],
        'Asia/Kolkata'
      );
      expect(formatted).toHaveLength(2);
      expect(formatted[0].day).toBe('Mon');
      expect(formatted[0].hours).toBe('08:00 - 20:00');
      expect(formatted[0].isOpen).toBe(true);
      expect(formatted[1].day).toBe('Sun');
      expect(formatted[1].hours).toBe('Closed');
      expect(formatted[1].isOpen).toBe(false);
    });
  });

  describe('4. Admin CRUD API Service Contracts (/api/v2/amenity-management/facilities)', () => {
    it('fetches facilities using GET with pagination and archetype filter', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          items: [{ _id: 'fac_1', name: 'Olympic Pool', archetype: 'SHARED_CAPACITY' }],
          pagination: { page: 1, limit: 20, total: 1, pages: 1 },
        },
      });

      const res = await amenityManagementService.getFacilities({
        page: 1,
        limit: 20,
        archetype: 'SHARED_CAPACITY',
      });

      expect(apiClient.get).toHaveBeenCalledTimes(1);
      const calledUrl = (apiClient.get as jest.Mock).mock.calls[0][0];
      expect(calledUrl).toContain('/api/v2/amenity-management/facilities');
      expect(calledUrl).toContain('archetype=SHARED_CAPACITY');
      expect(res.data.items).toHaveLength(1);
    });

    it('creates a facility using POST and injects generated code if missing', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { _id: 'fac_new', name: 'Squash Court 1', code: 'SQUASH-COURT-1234' },
      });

      await amenityManagementService.createFacility({
        name: 'Squash Court 1',
        archetype: 'EXCLUSIVE_HOURLY',
        maxCapacity: 2,
      });

      expect(apiClient.post).toHaveBeenCalledTimes(1);
      const [url, payload] = (apiClient.post as jest.Mock).mock.calls[0];
      expect(url).toContain('/api/v2/amenity-management/facilities');
      expect(payload.name).toBe('Squash Court 1');
      expect(payload.code).toBeDefined();
      expect(payload.code).toMatch(/^SQUASH-COURT-1-\d{4}$/);
    });

    it('updates a facility using PATCH request (strict Phase 5 frozen contract)', async () => {
      (apiClient.patch as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { _id: 'fac_123', name: 'Updated Court' },
      });

      await amenityManagementService.updateFacility('fac_123', {
        name: 'Updated Court',
        slotDurationMinutes: 90,
      });

      expect(apiClient.patch).toHaveBeenCalledTimes(1);
      const [url, payload] = (apiClient.patch as jest.Mock).mock.calls[0];
      expect(url).toBe('http://localhost:5002/api/v2/amenity-management/facilities/fac_123');
      expect(payload.name).toBe('Updated Court');
      expect(payload.slotDurationMinutes).toBe(90);
    });

    it('updates facility active status using PATCH with { isActive }', async () => {
      (apiClient.patch as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { _id: 'fac_123', isActive: false },
      });

      await amenityManagementService.updateFacilityStatus('fac_123', false);

      expect(apiClient.patch).toHaveBeenCalledTimes(1);
      const [url, payload] = (apiClient.patch as jest.Mock).mock.calls[0];
      expect(url).toBe('http://localhost:5002/api/v2/amenity-management/facilities/fac_123');
      expect(payload).toEqual({ isActive: false });
    });

    it('deletes a facility using DELETE /facilities/:id', async () => {
      (apiClient.delete as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { _id: 'fac_123', isDeleted: true },
      });

      await amenityManagementService.deleteFacility('fac_123');

      expect(apiClient.delete).toHaveBeenCalledTimes(1);
      const [url] = (apiClient.delete as jest.Mock).mock.calls[0];
      expect(url).toBe('http://localhost:5002/api/v2/amenity-management/facilities/fac_123');
    });
  });
});

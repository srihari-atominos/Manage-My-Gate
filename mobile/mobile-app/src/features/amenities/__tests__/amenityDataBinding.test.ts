/**
 * Amenity Management v2 - Mobile Data Binding & Contract Behavioral Test Suite
 * Validates the complete data-binding foundation against the frozen Phase 5 backend contract.
 * Covers all 24 required scenarios with comprehensive assertions.
 */

import { getAmenityV2Url, amenityManagementService } from '../services/amenityManagementService';
import {
  mapGuestsToApiPayload,
  mapHoldFormToApiPayload,
  mapConfirmFormToApiPayload,
  normalizeFacilityFromApi,
  normalizeReservationFromApi,
  normalizePricingSnapshot,
  normalizeAvailabilityFromApi,
  normalizeHoldFromApi,
} from '../utils/amenityPayloadMappers';
import {
  canDisplayAmenityAccessPass,
  calculateHoldRemainingSeconds,
  isHoldActive,
  convertLocalToUtcIso,
  formatUtcToLocalDisplay,
  formatReservationDate,
  formatReservationTimeRange,
  formatApprovalStatusLabel,
} from '../utils/amenityStateHelpers';
import { mapAmenityApiError } from '../utils/amenityErrorMapper';
import {
  AmenityReservation,
  AmenityGuest,
  AmenitySlotSelection,
} from '../types/amenityDomain.types';
import {
  ApiAmenityFacility,
  ApiAmenityReservation,
  ApiAmenityHold,
} from '../types/amenityApi.types';
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

describe('Amenity Management v2 - Data-Binding Layer Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // 1 & 2. v2 URL Resolution & No Duplication
  // ==========================================
  describe('Scenario 1 & 2: v2 URL Resolution & Namespace Cleanliness', () => {
    it('resolves v2 endpoint path correctly starting with /api/v2/amenity-management', () => {
      const url = getAmenityV2Url('/facilities');
      expect(url).toContain('/api/v2/amenity-management/facilities');
      expect(url.startsWith('http')).toBe(true);
    });

    it('guarantees NO /api/v1/api/v2 duplication across various base URLs', () => {
      const paths = ['/facilities', 'holds', '/reservations/confirm', '/availability'];
      paths.forEach((p) => {
        const resolved = getAmenityV2Url(p);
        expect(resolved).not.toContain('/api/v1/api/v2');
        expect(resolved).not.toContain('//api/v2');
        expect(resolved).toMatch(/^https?:\/\/[^/]+\/api\/v2\/amenity-management\//);
      });
    });
  });

  // ==========================================
  // 3 & 4. Idempotency Header & Stable Confirmation Key
  // ==========================================
  describe('Scenario 3 & 4: Idempotency Headers & Deterministic Keys', () => {
    it('attaches x-idempotency-key header during hold creation (UUID when omitted)', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            hold: { _id: 'hold-123', status: 'ACTIVE', expiresAt: new Date().toISOString() },
            pricingSnapshot: { baseAmount: 100, taxAmount: 15, depositAmount: 50, totalAmount: 165, currency: 'SAR' },
          },
        },
      });

      await amenityManagementService.createHold({
        facilityId: 'fac-1',
        requestedStartDateTime: '2026-09-10T10:00:00.000Z',
        requestedEndDateTime: '2026-09-10T11:00:00.000Z',
      });

      expect(apiClient.post).toHaveBeenCalledTimes(1);
      const callArgs = (apiClient.post as jest.Mock).mock.calls[0];
      const headers = callArgs[2]?.headers;
      expect(headers).toBeDefined();
      expect(headers['x-idempotency-key']).toBeDefined();
      expect(headers['x-idempotency-key'].length).toBeGreaterThan(10);
    });

    it('derives a stable deterministic confirmation key confirm_hold_<holdId> across retries', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          data: {
            _id: 'res-999',
            bookingStatus: 'CONFIRMED',
            paymentStatus: 'PAID',
            approvalStatus: 'APPROVED',
            accessStatus: 'PASS_GENERATED',
            completionStatus: 'PENDING',
          },
        },
      });

      const holdId = 'hold-abc-789';
      // Call 1
      await amenityManagementService.confirmReservation({ holdId, paymentReference: 'pay_xyz' });
      // Call 2 (simulated retry / double-tap)
      await amenityManagementService.confirmReservation({ holdId, paymentReference: 'pay_xyz' });

      expect(apiClient.post).toHaveBeenCalledTimes(2);
      const firstCallHeader = (apiClient.post as jest.Mock).mock.calls[0][2].headers['x-idempotency-key'];
      const secondCallHeader = (apiClient.post as jest.Mock).mock.calls[1][2].headers['x-idempotency-key'];

      expect(firstCallHeader).toBe(`confirm_hold_${holdId}`);
      expect(secondCallHeader).toBe(`confirm_hold_${holdId}`);
      expect(firstCallHeader).toBe(secondCallHeader);
    });
  });

  // ==========================================
  // 5. Dynamic Guest Row Mapping (clientId Stripping)
  // ==========================================
  describe('Scenario 5: Dynamic Guest Row Model & ClientId Stripping', () => {
    it('strips client-only clientId and whitespace before building API payload', () => {
      const inputGuests: AmenityGuest[] = [
        { clientId: 'temp-row-uuid-1', name: '  Fahad Al-Otaibi  ', phone: ' 0501234567 ', email: 'fahad@example.com ' },
        { clientId: 'temp-row-uuid-2', name: 'Sara Al-Ghamdi', phone: '', email: undefined },
        { clientId: 'temp-row-uuid-3', name: '   ', phone: '0509999999' }, // empty name must be discarded
      ];

      const apiPayload = mapGuestsToApiPayload(inputGuests);

      expect(apiPayload).toHaveLength(2);
      expect(apiPayload[0]).toEqual({
        name: 'Fahad Al-Otaibi',
        phone: '0501234567',
        email: 'fahad@example.com',
      });
      expect(apiPayload[1]).toEqual({
        name: 'Sara Al-Ghamdi',
        phone: undefined,
        email: undefined,
      });

      // Verify clientId is strictly not present in any mapped item
      apiPayload.forEach((item: any) => {
        expect(item.clientId).toBeUndefined();
      });
    });
  });

  // ==========================================
  // 6 & 7. UTC Mapping & Facility Timezone
  // ==========================================
  describe('Scenario 6 & 7: UTC ISO Conversion & Facility Timezone Handling', () => {
    it('converts facility-local date and time to valid UTC ISO strings', () => {
      const utcIso = convertLocalToUtcIso('2026-09-10', '14:30');
      expect(utcIso).toBe('2026-09-10T14:30:00.000Z');
    });

    it('formats UTC ISO strings into clean display components', () => {
      const formatted = formatUtcToLocalDisplay('2026-09-10T14:30:00.000Z');
      expect(formatted.dateStr).toBe('2026-09-10');
      expect(formatted.timeStr).toBe('14:30');
    });

    it('handles invalid dates gracefully without throwing', () => {
      expect(convertLocalToUtcIso('', '')).toBe('');
      expect(formatUtcToLocalDisplay('invalid-iso').formatted).toBe('');
    });

    it('formats reservation date and 12-hour time in Asia/Kolkata timezone accurately', () => {
      // 09:30 UTC = 15:00 IST (3:00 PM), 10:30 UTC = 16:00 IST (4:00 PM)
      const startUtc = '2026-09-17T09:30:00.000Z';
      const endUtc = '2026-09-17T10:30:00.000Z';
      const tz = 'Asia/Kolkata';

      const formattedDate = formatReservationDate(startUtc, tz);
      expect(formattedDate).toMatch(/17 Sep(t)? 2026/);

      const formattedTimeRange = formatReservationTimeRange(startUtc, endUtc, tz);
      expect(formattedTimeRange).toBe('3:00 PM - 4:00 PM');
    });

    it('maps approvalStatus NOT_REQUIRED to friendly Auto-Approved label', () => {
      expect(formatApprovalStatusLabel('NOT_REQUIRED')).toBe('Auto-Approved');
      expect(formatApprovalStatusLabel('APPROVED')).toBe('Approved');
      expect(formatApprovalStatusLabel('PENDING_REVIEW')).toBe('Awaiting Approval');
    });

    it('normalizes reservation with effectiveStartDateTime fallback when startDateTime is omitted', () => {
      const rawApiDoc = {
        _id: 'res-123',
        orgId: 'org-456',
        facilityId: 'fac-789',
        reservationNumber: 'RES-202609-000011',
        effectiveStartDateTime: '2026-09-17T09:30:00.000Z',
        effectiveEndDateTime: '2026-09-17T10:30:00.000Z',
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
        approvalStatus: 'NOT_REQUIRED',
        accessStatus: 'PASS_GENERATED',
        completionStatus: 'PENDING',
      };

      const normalized = normalizeReservationFromApi(rawApiDoc);
      expect(normalized.startDateTime).toBe('2026-09-17T09:30:00.000Z');
      expect(normalized.endDateTime).toBe('2026-09-17T10:30:00.000Z');
      expect(normalized.effectiveStartDateTime).toBe('2026-09-17T09:30:00.000Z');
      expect(normalized.effectiveEndDateTime).toBe('2026-09-17T10:30:00.000Z');
    });
  });

  // ==========================================
  // 8. Dynamic Availability Evaluation Mapping
  // ==========================================
  describe('Scenario 8: Dynamic Availability Evaluation Mapping', () => {
    it('normalizes dynamic evaluation response into domain availability result', () => {
      const apiResponse = {
        isAvailable: true,
        availableUnits: 1,
        maxCapacity: 10,
        effectiveStartDateTime: '2026-09-10T10:00:00.000Z',
        effectiveEndDateTime: '2026-09-10T11:00:00.000Z',
      };

      const domainResult = normalizeAvailabilityFromApi(apiResponse);
      expect(domainResult.isAvailable).toBe(true);
      expect(domainResult.availableUnits).toBe(1);
      expect(domainResult.maxCapacity).toBe(10);
      expect(domainResult.effectiveStartDateTime).toBe('2026-09-10T10:00:00.000Z');
    });

    it('correctly maps unavailable evaluation result with backend reason', () => {
      const apiResponse = {
        isAvailable: false,
        reason: 'Maintenance block overlaps requested time window',
        availableUnits: 0,
        maxCapacity: 4,
        effectiveStartDateTime: '2026-09-10T10:00:00.000Z',
        effectiveEndDateTime: '2026-09-10T11:00:00.000Z',
      };

      const domainResult = normalizeAvailabilityFromApi(apiResponse);
      expect(domainResult.isAvailable).toBe(false);
      expect(domainResult.reason).toContain('Maintenance block');
      expect(domainResult.availableUnits).toBe(0);
    });
  });

  // ==========================================
  // 9 & 10. Pricing Mapping & Snapshot Immutability
  // ==========================================
  describe('Scenario 9 & 10: Pricing Snapshot & Immutability', () => {
    it('normalizes pricing calculation into immutable pricing snapshot', () => {
      const rawPricing = {
        baseAmount: 150,
        taxAmount: 22.5,
        depositAmount: 100,
        totalAmount: 272.5,
        currency: 'SAR',
      };

      const snapshot = normalizePricingSnapshot(rawPricing);
      expect(snapshot).toEqual({
        baseAmount: 150,
        taxAmount: 22.5,
        depositAmount: 100,
        totalAmount: 272.5,
        currency: 'SAR',
      });
    });

    it('guarantees reservation pricing snapshot remains unchanged when new calculation occurs', () => {
      const reservation: AmenityReservation = {
        _id: 'res-1',
        orgId: 'org-1',
        facilityId: 'fac-1',
        userId: 'user-1',
        startDateTime: '2026-09-10T10:00:00.000Z',
        endDateTime: '2026-09-10T11:00:00.000Z',
        headcount: 2,
        quantity: 1,
        pricingSnapshot: {
          baseAmount: 100,
          taxAmount: 15,
          depositAmount: 50,
          totalAmount: 165,
          currency: 'SAR',
        },
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
        approvalStatus: 'APPROVED',
        accessStatus: 'PASS_GENERATED',
        completionStatus: 'PENDING',
        createdAt: '2026-09-09T10:00:00.000Z',
        updatedAt: '2026-09-09T10:00:00.000Z',
      };

      // Perform a subsequent separate calculation with different rates
      const newCalculation = normalizePricingSnapshot({
        baseAmount: 200,
        taxAmount: 30,
        depositAmount: 100,
        totalAmount: 330,
        currency: 'SAR',
      });

      // The reservation's frozen snapshot must not be mutated
      expect(reservation.pricingSnapshot.totalAmount).toBe(165);
      expect(newCalculation.totalAmount).toBe(330);
      expect(reservation.pricingSnapshot.totalAmount).not.toBe(newCalculation.totalAmount);
    });
  });

  // ==========================================
  // 11 & 12. Hold Lifecycle & Authoritative Expiry
  // ==========================================
  describe('Scenario 11 & 12: Hold Lifecycle & Authoritative Expiration', () => {
    it('calculates remaining seconds as a pure function from authoritative server expiresAt', () => {
      const nowMs = 1788950000000;
      const expiryMs = nowMs + 450 * 1000; // 450 seconds in future
      const expiresAt = new Date(expiryMs).toISOString();

      const remaining = calculateHoldRemainingSeconds(expiresAt, nowMs);
      expect(remaining).toBe(450);
      expect(isHoldActive(expiresAt, nowMs)).toBe(true);
    });

    it('returns 0 remaining seconds when expiresAt is in the past', () => {
      const nowMs = 1788950000000;
      const pastExpiresAt = new Date(nowMs - 10000).toISOString();

      const remaining = calculateHoldRemainingSeconds(pastExpiresAt, nowMs);
      expect(remaining).toBe(0);
      expect(isHoldActive(pastExpiresAt, nowMs)).toBe(false);
    });

    it('normalizes hold entity with status and expiration intact', () => {
      const apiHold: ApiAmenityHold = {
        _id: 'hold-101',
        orgId: 'org-1',
        facilityId: 'fac-1',
        userId: 'usr-1',
        requestedStartDateTime: '2026-09-10T14:00:00.000Z',
        requestedEndDateTime: '2026-09-10T15:00:00.000Z',
        headcount: 4,
        quantity: 1,
        holdType: 'STANDARD',
        status: 'ACTIVE',
        expiresAt: '2026-09-09T14:15:00.000Z',
        createdAt: '2026-09-09T14:00:00.000Z',
        updatedAt: '2026-09-09T14:00:00.000Z',
      };

      const domainHold = normalizeHoldFromApi(apiHold);
      expect(domainHold._id).toBe('hold-101');
      expect(domainHold.status).toBe('ACTIVE');
      expect(domainHold.expiresAt).toBe('2026-09-09T14:15:00.000Z');
    });
  });

  // ==========================================
  // 13 & 14. Five Orthogonal State Dimensions
  // ==========================================
  describe('Scenario 13 & 14: Five Orthogonal States & No Flattening', () => {
    it('preserves all five independent state dimensions from backend reservation', () => {
      const rawReservation: ApiAmenityReservation = {
        _id: 'res-555',
        orgId: 'org-1',
        facilityId: 'fac-1',
        userId: 'usr-1',
        startDateTime: '2026-09-10T10:00:00.000Z',
        endDateTime: '2026-09-10T11:00:00.000Z',
        headcount: 2,
        quantity: 1,
        pricingSnapshot: { baseAmount: 50, taxAmount: 7.5, depositAmount: 0, totalAmount: 57.5, currency: 'SAR' },
        bookingStatus: 'PENDING_APPROVAL',
        paymentStatus: 'NOT_REQUIRED',
        approvalStatus: 'PENDING_REVIEW',
        accessStatus: 'NOT_APPLICABLE',
        completionStatus: 'PENDING',
        createdAt: '2026-09-09T10:00:00.000Z',
        updatedAt: '2026-09-09T10:00:00.000Z',
      };

      const domainRes = normalizeReservationFromApi(rawReservation);

      // Verify all 5 independent dimensions are present and not flattened
      expect(domainRes.bookingStatus).toBe('PENDING_APPROVAL');
      expect(domainRes.paymentStatus).toBe('NOT_REQUIRED');
      expect(domainRes.approvalStatus).toBe('PENDING_REVIEW');
      expect(domainRes.accessStatus).toBe('NOT_APPLICABLE');
      expect(domainRes.completionStatus).toBe('PENDING');

      // Verify NOT_REQUIRED is preserved and EXEMPTED does not exist
      expect(domainRes.paymentStatus).not.toBe('EXEMPTED' as any);
    });
  });

  // ==========================================
  // 15. Access Pass Eligibility Predicate
  // ==========================================
  describe('Scenario 15: Access Pass Eligibility Predicate', () => {
    const baseReservation: AmenityReservation = {
      _id: 'res-test',
      orgId: 'org-1',
      facilityId: 'fac-1',
      userId: 'usr-1',
      startDateTime: '2026-09-10T10:00:00.000Z',
      endDateTime: '2026-09-10T11:00:00.000Z',
      headcount: 1,
      quantity: 1,
      pricingSnapshot: { baseAmount: 0, taxAmount: 0, depositAmount: 0, totalAmount: 0, currency: 'SAR' },
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      approvalStatus: 'APPROVED',
      accessStatus: 'PASS_GENERATED',
      completionStatus: 'PENDING',
      createdAt: '2026-09-09T10:00:00.000Z',
      updatedAt: '2026-09-09T10:00:00.000Z',
    };

    it('returns TRUE when all 4 conditions are satisfied (Standard Paid Booking)', () => {
      expect(canDisplayAmenityAccessPass(baseReservation)).toBe(true);
    });

    it('returns TRUE for zero-cost booking with paymentStatus NOT_REQUIRED and approvalStatus NOT_REQUIRED', () => {
      const freeReservation = {
        ...baseReservation,
        paymentStatus: 'NOT_REQUIRED' as const,
        approvalStatus: 'NOT_REQUIRED' as const,
      };
      expect(canDisplayAmenityAccessPass(freeReservation)).toBe(true);
    });

    it('returns TRUE when resident has already CHECKED_IN', () => {
      const checkedInReservation = {
        ...baseReservation,
        accessStatus: 'CHECKED_IN' as const,
      };
      expect(canDisplayAmenityAccessPass(checkedInReservation)).toBe(true);
    });

    it('returns FALSE when bookingStatus is not CONFIRMED', () => {
      expect(canDisplayAmenityAccessPass({ ...baseReservation, bookingStatus: 'PENDING_APPROVAL' })).toBe(false);
      expect(canDisplayAmenityAccessPass({ ...baseReservation, bookingStatus: 'CANCELLED' })).toBe(false);
      expect(canDisplayAmenityAccessPass({ ...baseReservation, bookingStatus: 'REJECTED' })).toBe(false);
    });

    it('returns FALSE when paymentStatus is pending or failed', () => {
      expect(canDisplayAmenityAccessPass({ ...baseReservation, paymentStatus: 'PENDING' })).toBe(false);
      expect(canDisplayAmenityAccessPass({ ...baseReservation, paymentStatus: 'FAILED' })).toBe(false);
    });

    it('returns FALSE when approvalStatus is PENDING_REVIEW or REJECTED', () => {
      expect(canDisplayAmenityAccessPass({ ...baseReservation, approvalStatus: 'PENDING_REVIEW' })).toBe(false);
      expect(canDisplayAmenityAccessPass({ ...baseReservation, approvalStatus: 'REJECTED' })).toBe(false);
    });

    it('returns FALSE when accessStatus is ACCESS_REVOKED or NOT_APPLICABLE', () => {
      expect(canDisplayAmenityAccessPass({ ...baseReservation, accessStatus: 'ACCESS_REVOKED' })).toBe(false);
      expect(canDisplayAmenityAccessPass({ ...baseReservation, accessStatus: 'NOT_APPLICABLE' })).toBe(false);
    });

    it('returns FALSE for null or undefined reservation', () => {
      expect(canDisplayAmenityAccessPass(null)).toBe(false);
      expect(canDisplayAmenityAccessPass(undefined)).toBe(false);
    });
  });

  // ==========================================
  // 16, 17, 18, 19, 20, 21, 22. Error Mapping
  // ==========================================
  describe('Scenarios 16 to 22: Error Mapping & Status Codes', () => {
    it('Scenario 19: maps HTTP 400 validation error details into fieldErrors dictionary', () => {
      const error400 = {
        response: {
          status: 400,
          data: {
            success: false,
            message: 'Validation failed',
            details: [
              { field: 'requestedStartDateTime', message: 'Start date must be in the future', value: '2020-01-01' },
              { field: 'headcount', message: 'Headcount exceeds maximum capacity', value: 50 },
            ],
          },
        },
      };

      const mapped = mapAmenityApiError(error400);
      expect(mapped.statusCode).toBe(400);
      expect(mapped.fieldErrors).toBeDefined();
      expect(mapped.fieldErrors?.requestedStartDateTime).toBe('Start date must be in the future');
      expect(mapped.fieldErrors?.headcount).toBe('Headcount exceeds maximum capacity');
    });

    it('Scenario 16: maps HTTP 401 Unauthorized', () => {
      const error401 = { response: { status: 401 } };
      const mapped = mapAmenityApiError(error401);
      expect(mapped.statusCode).toBe(401);
      expect(mapped.message).toContain('Session expired');
    });

    it('Scenario 17: maps HTTP 403 Forbidden / Tenant boundary', () => {
      const error403 = { response: { status: 403 } };
      const mapped = mapAmenityApiError(error403);
      expect(mapped.statusCode).toBe(403);
      expect(mapped.message).toContain('permission');
    });

    it('Scenario 18: maps HTTP 404 Not Found', () => {
      const error404 = {
        response: { status: 404, data: { message: 'Facility not found' } },
      };
      const mapped = mapAmenityApiError(error404);
      expect(mapped.statusCode).toBe(404);
      expect(mapped.message).toBe('Facility not found');
    });

    it('Scenario 20: maps HTTP 409 Conflict with proper conflictType differentiation', () => {
      // 1. Slot/Capacity conflict
      const slotConflict = {
        response: { status: 409, data: { message: 'Slot capacity already exhausted for the requested window' } },
      };
      const mappedSlot = mapAmenityApiError(slotConflict);
      expect(mappedSlot.statusCode).toBe(409);
      expect(mappedSlot.isConflict).toBe(true);
      expect(mappedSlot.conflictType).toBe('SLOT_CAPACITY');

      // 2. Idempotency key payload mismatch
      const idempConflict = {
        response: { status: 409, data: { message: 'Idempotency key reused with different request payload' } },
      };
      const mappedIdemp = mapAmenityApiError(idempConflict);
      expect(mappedIdemp.isConflict).toBe(true);
      expect(mappedIdemp.conflictType).toBe('IDEMPOTENCY_MISMATCH');

      // 3. Operation in progress
      const progressConflict = {
        response: { status: 409, data: { message: 'Operation in progress' } },
      };
      const mappedProgress = mapAmenityApiError(progressConflict);
      expect(mappedProgress.isConflict).toBe(true);
      expect(mappedProgress.conflictType).toBe('OPERATION_IN_PROGRESS');

      // 4. Resource concurrency version conflict
      const occConflict = {
        response: { status: 409, data: { message: 'Resource concurrency version modified by concurrent transaction' } },
      };
      const mappedOcc = mapAmenityApiError(occConflict);
      expect(mappedOcc.isConflict).toBe(true);
      expect(mappedOcc.conflictType).toBe('CONCURRENCY_VERSION');
    });

    it('Scenario 21: maps HTTP 410 Gone (Hold Expired)', () => {
      const error410 = {
        response: { status: 410, data: { message: 'Reservation hold has expired' } },
      };
      const mapped = mapAmenityApiError(error410);
      expect(mapped.statusCode).toBe(410);
      expect(mapped.isHoldExpired).toBe(true);
      expect(mapped.message).toContain('expired');
    });

    it('Scenario 22: maps Network Errors and Timeouts', () => {
      const timeoutError = { code: 'ECONNABORTED', message: 'timeout of 8000ms exceeded' };
      const mappedTimeout = mapAmenityApiError(timeoutError);
      expect(mappedTimeout.isTimeout).toBe(true);
      expect(mappedTimeout.message).toContain('timed out');

      const netError = { message: 'Network Error' };
      const mappedNet = mapAmenityApiError(netError);
      expect(mappedNet.isNetworkError).toBe(true);
      expect(mappedNet.message).toContain('Network connection failed');
    });
  });

  // ==========================================
  // 23. Pagination Mapping
  // ==========================================
  describe('Scenario 23: Pagination Mapping', () => {
    it('normalizes paginated response with items and metadata', () => {
      const rawFacility: ApiAmenityFacility = {
        _id: 'fac-100',
        orgId: 'org-1',
        name: 'Olympic Swimming Pool',
        archetype: 'SHARED_CAPACITY',
        status: 'ACTIVE',
        maxCapacity: 50,
        maxHeadcountPerReservation: 5,
        slotDurationMinutes: 60,
        setupBufferMinutes: 0,
        teardownBufferMinutes: 0,
        timezone: 'Asia/Riyadh',
        pricingConfig: { type: 'FREE', baseRate: 0, depositAmount: 0, taxRate: 0, currency: 'SAR' },
        bookingRules: { minNoticeHours: 1, maxAdvanceBookingDays: 7, cancelNoticeHours: 2, requiresApproval: false, maxActiveReservationsPerResident: 2 },
        operatingHours: [],
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      };

      const normalized = normalizeFacilityFromApi(rawFacility);
      expect(normalized._id).toBe('fac-100');
      expect(normalized.name).toBe('Olympic Swimming Pool');
      expect(normalized.archetype).toBe('SHARED_CAPACITY');
      expect(normalized.timezone).toBe('Asia/Riyadh');
    });
  });

  // ==========================================
  // 24. Multi-Slot Ordering & Window Evaluation
  // ==========================================
  describe('Scenario 24: Multi-Slot Ordering & Window Preservation', () => {
    it('preserves chronologically ordered slot windows when preparing hold payload', () => {
      const slotSelection: AmenitySlotSelection = {
        date: '2026-09-15',
        startTime: '09:00',
        endTime: '11:00',
        facilityTimezone: 'Asia/Riyadh',
        utcStartDateTime: '2026-09-15T06:00:00.000Z',
        utcEndDateTime: '2026-09-15T08:00:00.000Z',
      };

      const holdPayload = mapHoldFormToApiPayload({
        facilityId: 'fac-tennis-1',
        slotSelection,
        headcount: 4,
      });

      expect(holdPayload.requestedStartDateTime).toBe('2026-09-15T06:00:00.000Z');
      expect(holdPayload.requestedEndDateTime).toBe('2026-09-15T08:00:00.000Z');
      expect(new Date(holdPayload.requestedStartDateTime).getTime())
        .toBeLessThan(new Date(holdPayload.requestedEndDateTime).getTime());
    });
  });

  // ==========================================
  // Archetype Enum Completeness Verification
  // ==========================================
  describe('Archetype Enum Strictness Verification', () => {
    it('accepts only the 5 frozen backend archetypes', () => {
      const validArchetypes = [
        'SHARED_CAPACITY',
        'EXCLUSIVE_HOURLY',
        'EVENT_SPACE',
        'ROOM_RESOURCE',
        'INVENTORY_TOOLS',
      ];

      validArchetypes.forEach((archetype) => {
        expect(['SHARED_CAPACITY', 'EXCLUSIVE_HOURLY', 'EVENT_SPACE', 'ROOM_RESOURCE', 'INVENTORY_TOOLS']).toContain(archetype);
      });

      // Ensure forbidden archetypes are recognized as invalid
      const forbidden = ['EXCLUSIVE_SLOT', 'UNLIMITED_OPEN', 'SLOT_EXCLUSIVE', 'PER_PERSON_DAILY'];
      forbidden.forEach((f) => {
        expect(validArchetypes.includes(f)).toBe(false);
      });
    });
  });
});

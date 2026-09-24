/**
 * Amenity Management V2 - Pass Service & Error Mapping Behavioral Tests
 * Verifies the V2 pass API endpoints, payload contracts (revoke { reason }, checkout without gateId),
 * and precise HTTP error status mappings against the frozen backend.
 */

import amenityManagementService from '../services/amenityManagementService';
import { mapAmenityApiError } from '../utils/amenityErrorMapper';
import apiClient from '../../../services/apiClient';

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

describe('Amenity Management V2: Pass Service & Error Mapping Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Pass Service Payload Contracts', () => {
    it('checkInPass: posts to /api/v2/amenity-management/passes/check-in with rawToken and optional gateId', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            _id: 'pass_123',
            status: 'CHECKED_IN',
            checkInTimestamp: '2026-09-10T14:30:00.000Z',
          },
        },
      });

      const payload = {
        rawToken: '4e11d334e2c9e782635a968fd2a987d60910129bc48da7093217d84a7e93bd20',
        gateId: 'gate-north',
      };

      const res = await amenityManagementService.checkInPass(payload);

      expect(apiClient.post).toHaveBeenCalledTimes(1);
      const [url, body] = (apiClient.post as jest.Mock).mock.calls[0];
      expect(url).toContain('/api/v2/amenity-management/passes/check-in');
      expect(body).toEqual(payload);
      expect(res.data._id).toBe('pass_123');
    });

    it('checkOutPass: posts to /api/v2/amenity-management/passes/check-out with rawToken and inspectionDetails, NEVER sending gateId', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            _id: 'pass_123',
            status: 'CHECKED_OUT',
            checkOutTimestamp: '2026-09-10T16:00:00.000Z',
          },
        },
      });

      const payload = {
        rawToken: '4e11d334e2c9e782635a968fd2a987d60910129bc48da7093217d84a7e93bd20',
        inspectionDetails: {
          isDamaged: true,
          damageNotes: 'Equipment cracked',
          assessedPenaltyAmount: 50,
        },
      };

      const res = await amenityManagementService.checkOutPass(payload);

      expect(apiClient.post).toHaveBeenCalledTimes(1);
      const [url, body] = (apiClient.post as jest.Mock).mock.calls[0];
      expect(url).toContain('/api/v2/amenity-management/passes/check-out');
      expect(body).toEqual(payload);
      expect(body).not.toHaveProperty('gateId');
      expect(res.data._id).toBe('pass_123');
    });

    it('revokePass: posts to /api/v2/amenity-management/passes/:passId/revoke with { reason }, NOT { revokedReason }', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            _id: 'pass_456',
            isRevoked: true,
            revokedReason: 'Rule violation',
          },
        },
      });

      const passId = 'pass_456';
      const reason = 'Rule violation';

      const res = await amenityManagementService.revokePass(passId, reason);

      expect(apiClient.post).toHaveBeenCalledTimes(1);
      const [url, body] = (apiClient.post as jest.Mock).mock.calls[0];
      expect(url).toContain('/api/v2/amenity-management/passes/pass_456/revoke');
      expect(body).toEqual({ reason: 'Rule violation' });
      expect(body).not.toHaveProperty('revokedReason');
      expect(res.data.isRevoked).toBe(true);
    });
  });

  describe('HTTP Error Mapping Semantic Preservation', () => {
    it('Condition: Invalid token -> maps to 404 and preserves backend message', () => {
      const backendError = {
        response: {
          status: 404,
          data: {
            message: 'Invalid pass: token not found for this organization',
          },
        },
      };

      const mapped = mapAmenityApiError(backendError);
      expect(mapped.statusCode).toBe(404);
      expect(mapped.message).toBe('Invalid pass: token not found for this organization');
    });

    it('Condition: Revoked pass -> maps to 403 and preserves revocation reason message', () => {
      const backendError = {
        response: {
          status: 403,
          data: {
            message: 'Access denied: pass was revoked (Rule violation)',
          },
        },
      };

      const mapped = mapAmenityApiError(backendError);
      expect(mapped.statusCode).toBe(403);
      expect(mapped.message).toBe('Access denied: pass was revoked (Rule violation)');
    });

    it('Condition: Outside validity window -> maps to 403 and preserves window details', () => {
      const backendError = {
        response: {
          status: 403,
          data: {
            message:
              'Access denied: pass is outside its validity window (2026-09-10T10:00:00.000Z - 2026-09-10T12:00:00.000Z)',
          },
        },
      };

      const mapped = mapAmenityApiError(backendError);
      expect(mapped.statusCode).toBe(403);
      expect(mapped.message).toContain('outside its validity window');
    });

    it('Condition: Check-out before check-in -> maps to 400 and preserves rejection message', () => {
      const backendError = {
        response: {
          status: 400,
          data: {
            message: 'Check-out rejected: pass has not been checked in yet',
          },
        },
      };

      const mapped = mapAmenityApiError(backendError);
      expect(mapped.statusCode).toBe(400);
      expect(mapped.message).toBe('Check-out rejected: pass has not been checked in yet');
    });

    it('Condition: Check-in anti-replay -> maps to 409 with isConflict=true and preserves timestamp', () => {
      const backendError = {
        response: {
          status: 409,
          data: {
            message:
              'Anti-replay violation: pass was already used for check-in at 2026-09-10T14:00:00.000Z',
          },
        },
      };

      const mapped = mapAmenityApiError(backendError);
      expect(mapped.statusCode).toBe(409);
      expect(mapped.isConflict).toBe(true);
      expect(mapped.message).toContain('Anti-replay violation: pass was already used for check-in');
    });

    it('Condition: Check-out anti-replay -> maps to 409 with isConflict=true and preserves message', () => {
      const backendError = {
        response: {
          status: 409,
          data: {
            message: 'Pass has already been checked out',
          },
        },
      };

      const mapped = mapAmenityApiError(backendError);
      expect(mapped.statusCode).toBe(409);
      expect(mapped.isConflict).toBe(true);
      expect(mapped.message).toBe('Pass has already been checked out');
    });
  });
});

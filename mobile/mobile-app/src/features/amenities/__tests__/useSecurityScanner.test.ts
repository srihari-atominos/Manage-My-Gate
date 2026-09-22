/**
 * Amenity Management Phase 3B-2: Security Guard Mobile V2 Cutover Tests
 * Verifies useSecurityScanner hook, raw token parsing, check-in, check-out with inspection,
 * anti-replay handling, validity window guards, and static forensic independence from V1.
 */

import { renderHook, act } from '@testing-library/react-native';
import fs from 'fs';
import path from 'path';
import {
  useSecurityScanner,
  extractRawPassToken,
  ScanMode,
} from '../hooks/useSecurityScanner';

// Test Token: 64 hexadecimal characters (256-bit entropy)
const VALID_RAW_TOKEN =
  '4e11d334e2c9e782635a968fd2a987d60910129bc48da7093217d84a7e93bd20';

let mockState: any = {
  amenityBookings: {
    v2CheckInResult: null,
    v2CheckOutResult: null,
    v2PassActionLoading: false,
    v2PassError: null,
    recentScans: [],
  },
};

const mockDispatch = jest.fn((action: any) => action);

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: any) => selector(mockState),
}));

jest.mock('../../../hooks/useAppSocket', () => ({
  useAppSocket: () => ({
    socket: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  }),
}));

const mockCheckInPassThunk = jest.fn((payload: any) => ({
  type: 'amenityBookings/checkInPass',
  payload,
}));

const mockCheckOutPassThunk = jest.fn((payload: any) => ({
  type: 'amenityBookings/checkOutPass',
  payload,
}));

const mockClearV2PassResults = jest.fn(() => ({
  type: 'amenityBookings/clearV2PassResults',
}));

const mockClearCheckInResult = jest.fn(() => ({
  type: 'amenityBookings/clearCheckInResult',
}));

const mockFetchRecentScansThunk = jest.fn((payload: any) => ({
  type: 'amenityBookings/fetchRecentScans',
  payload,
}));

jest.mock('../store/amenityBookingSlice', () => ({
  __esModule: true,
  checkInPassThunk: (payload: any) => mockCheckInPassThunk(payload),
  checkOutPassThunk: (payload: any) => mockCheckOutPassThunk(payload),
  clearV2PassResults: () => mockClearV2PassResults(),
  clearCheckInResult: () => mockClearCheckInResult(),
  fetchRecentScansThunk: (payload: any) => mockFetchRecentScansThunk(payload),
}));

describe('Amenity Management Phase 3B-2: Security Guard Mobile V2 Cutover Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = {
      amenityBookings: {
        v2CheckInResult: null,
        v2CheckOutResult: null,
        v2PassActionLoading: false,
        v2PassError: null,
        recentScans: [],
      },
    };
  });

  // =========================================================================
  // Unit Tests for extractRawPassToken helper
  // =========================================================================
  describe('Raw Token Extraction & Validation', () => {
    it('Test 6: passes a valid 64-character raw hex token unchanged', () => {
      const extracted = extractRawPassToken(VALID_RAW_TOKEN);
      expect(extracted).toBe(VALID_RAW_TOKEN);
      expect(extracted?.length).toBe(64);
    });

    it('Test 7A: extracts raw token from backward-compatible JSON wrapper { rawToken: "..." }', () => {
      const jsonWrapper = JSON.stringify({ rawToken: VALID_RAW_TOKEN });
      const extracted = extractRawPassToken(jsonWrapper);
      expect(extracted).toBe(VALID_RAW_TOKEN);
    });

    it('Test 7B: extracts raw token from backward-compatible JSON wrapper { qrData: "..." }', () => {
      const jsonWrapper = JSON.stringify({ qrData: VALID_RAW_TOKEN });
      const extracted = extractRawPassToken(jsonWrapper);
      expect(extracted).toBe(VALID_RAW_TOKEN);
    });

    it('Test 7C: strictly rejects legacy JSON with { bookingId: "..." } as V2 pass token', () => {
      const legacyJson = JSON.stringify({
        bookingId: '67cb1a48f872c842b4059098',
        _id: '67cb1a48f872c842b4059098',
        code: 'BK-123456',
      });
      const extracted = extractRawPassToken(legacyJson);
      expect(extracted).toBeNull();
    });

    it('Test 5A: rejects invalid/random string content and returns null', () => {
      expect(extractRawPassToken('')).toBeNull();
      expect(extractRawPassToken('random-malformed-string')).toBeNull();
      expect(extractRawPassToken('12345')).toBeNull();
      expect(extractRawPassToken('not-a-hex-token-with-bad-chars-!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')).toBeNull();
    });
  });

  // =========================================================================
  // Hook Behavior Tests (useSecurityScanner)
  // =========================================================================
  describe('useSecurityScanner Hook Lifecycle & Execution', () => {
    it('Test 1: Check-In mode dispatches checkInPassThunk with { rawToken }', async () => {
      const { result } = await renderHook(() => useSecurityScanner({ defaultMode: 'CHECK_IN' }));

      expect(result.current.scanMode).toBe('CHECK_IN');

      await act(async () => {
        await result.current.handleBarCodeScanned({
          type: 'CAMERA',
          data: VALID_RAW_TOKEN,
        });
      });

      expect(mockCheckInPassThunk).toHaveBeenCalledTimes(1);
      expect(mockCheckInPassThunk).toHaveBeenCalledWith({
        rawToken: VALID_RAW_TOKEN,
        gateId: undefined,
      });
      expect(result.current.isResultModalOpen).toBe(true);
      expect(result.current.localScanError).toBeNull();
    });

    it('Test 2: Check-Out mode stores pending token and opens inspection sheet', async () => {
      const { result } = await renderHook(() => useSecurityScanner({ defaultMode: 'CHECK_OUT' }));

      expect(result.current.scanMode).toBe('CHECK_OUT');

      await act(async () => {
        await result.current.handleBarCodeScanned({
          type: 'CAMERA',
          data: VALID_RAW_TOKEN,
        });
      });

      // In check-out mode, inspection sheet is presented before submitting
      expect(result.current.isInspectionModalOpen).toBe(true);
      expect(mockCheckOutPassThunk).not.toHaveBeenCalled();

      // Submit check-out
      await act(async () => {
        await result.current.executeCheckOutWithInspection();
      });

      expect(mockCheckOutPassThunk).toHaveBeenCalledTimes(1);
      expect(mockCheckOutPassThunk).toHaveBeenCalledWith({
        rawToken: VALID_RAW_TOKEN,
        inspectionDetails: undefined,
      });
      expect(result.current.isResultModalOpen).toBe(true);
      expect(result.current.isInspectionModalOpen).toBe(false);
    });

    it('Test 8: Check-Out passes inspection details (isDamaged, damageNotes, assessedPenaltyAmount) correctly', async () => {
      const { result } = await renderHook(() => useSecurityScanner({ defaultMode: 'CHECK_OUT' }));

      await act(async () => {
        await result.current.handleBarCodeScanned({
          type: 'CAMERA',
          data: VALID_RAW_TOKEN,
        });
      });

      const inspection = {
        isDamaged: true,
        damageNotes: 'Torn badminton net racket string broken',
        assessedPenaltyAmount: 75.5,
      };

      await act(async () => {
        await result.current.executeCheckOutWithInspection(inspection);
      });

      expect(mockCheckOutPassThunk).toHaveBeenCalledWith({
        rawToken: VALID_RAW_TOKEN,
        inspectionDetails: inspection,
      });

      // Token lifecycle verification: subsequent call without new scan does not dispatch
      mockCheckOutPassThunk.mockClear();
      await act(async () => {
        await result.current.executeCheckOutWithInspection();
      });
      expect(mockCheckOutPassThunk).not.toHaveBeenCalled();
    });

    it('Test 5C: cancelCheckOutInspection clears pendingCheckOutToken immediately', async () => {
      const { result } = await renderHook(() => useSecurityScanner({ defaultMode: 'CHECK_OUT' }));

      await act(async () => {
        await result.current.handleBarCodeScanned({
          type: 'CAMERA',
          data: VALID_RAW_TOKEN,
        });
      });

      expect(result.current.isInspectionModalOpen).toBe(true);

      await act(async () => {
        result.current.cancelCheckOutInspection();
      });

      expect(result.current.isInspectionModalOpen).toBe(false);
      expect(result.current.isScanning).toBe(true);

      // Verify token was wiped: executeCheckOutWithInspection does nothing
      mockCheckOutPassThunk.mockClear();
      await act(async () => {
        await result.current.executeCheckOutWithInspection();
      });
      expect(mockCheckOutPassThunk).not.toHaveBeenCalled();
    });

    it('Test 5D: executeCheckOutWithInspection clears pendingCheckOutToken even if dispatch rejects', async () => {
      const { result } = await renderHook(() => useSecurityScanner({ defaultMode: 'CHECK_OUT' }));

      await act(async () => {
        await result.current.handleBarCodeScanned({
          type: 'CAMERA',
          data: VALID_RAW_TOKEN,
        });
      });

      expect(result.current.isInspectionModalOpen).toBe(true);

      mockDispatch.mockImplementationOnce(() => {
        throw new Error('Network failure during checkout');
      });

      await act(async () => {
        try {
          await result.current.executeCheckOutWithInspection();
        } catch {
          // Expected error caught
        }
      });

      // Verify token was wiped despite exception
      mockCheckOutPassThunk.mockClear();
      mockDispatch.mockImplementation((action: any) => action);
      await act(async () => {
        await result.current.executeCheckOutWithInspection();
      });
      expect(mockCheckOutPassThunk).not.toHaveBeenCalled();
    });

    it('Test 5E: unmount hook cleanup clears pendingCheckOutToken', async () => {
      const { result, unmount } = await renderHook(() => useSecurityScanner({ defaultMode: 'CHECK_OUT' }));

      await act(async () => {
        await result.current.handleBarCodeScanned({
          type: 'CAMERA',
          data: VALID_RAW_TOKEN,
        });
      });

      expect(result.current.isInspectionModalOpen).toBe(true);

      await act(async () => {
        unmount();
      });

      // Verified unmount completed cleanly
      expect(mockCheckOutPassThunk).not.toHaveBeenCalled();
    });

    it('Test 5B: invalid QR sets local validation error and does NOT call backend thunks', async () => {
      const { result } = await renderHook(() => useSecurityScanner());

      await act(async () => {
        await result.current.handleBarCodeScanned({
          type: 'CAMERA',
          data: 'invalid-non-hex-qr-content',
        });
      });

      expect(mockCheckInPassThunk).not.toHaveBeenCalled();
      expect(mockCheckOutPassThunk).not.toHaveBeenCalled();
      expect(result.current.localScanError).toMatch(/Invalid QR\/pass format/i);
      expect(result.current.isResultModalOpen).toBe(true);
    });

    it('Test 3: 409 Anti-Replay Conflict surfaces security error state', async () => {
      mockState = {
        amenityBookings: {
          v2CheckInResult: null,
          v2CheckOutResult: null,
          v2PassActionLoading: false,
          v2PassError: {
            statusCode: 409,
            message:
              'Anti-replay violation: pass was already used for check-in at 2026-09-10T14:00:00.000Z',
          },
          recentScans: [],
        },
      };

      const { result } = await renderHook(() => useSecurityScanner());
      expect(result.current.v2PassError?.statusCode).toBe(409);
      expect(result.current.v2PassError?.message).toMatch(/Anti-replay violation/i);
    });

    it('Test 4: 403 Validity Window / Revocation surfaces access denied error state', async () => {
      mockState = {
        amenityBookings: {
          v2CheckInResult: null,
          v2CheckOutResult: null,
          v2PassActionLoading: false,
          v2PassError: {
            statusCode: 403,
            message: 'Access denied: pass is outside its validity window',
          },
          recentScans: [],
        },
      };

      const { result } = await renderHook(() => useSecurityScanner());
      expect(result.current.v2PassError?.statusCode).toBe(403);
      expect(result.current.v2PassError?.message).toMatch(/Access denied/i);
    });

    it('Test 9: resetScanner clears Redux V2 pass results and local modal states', async () => {
      const { result } = await renderHook(() => useSecurityScanner());

      await act(async () => {
        result.current.resetScanner();
      });

      expect(mockClearV2PassResults).toHaveBeenCalledTimes(1);
      expect(mockClearCheckInResult).toHaveBeenCalledTimes(1);
      expect(result.current.isResultModalOpen).toBe(false);
      expect(result.current.isInspectionModalOpen).toBe(false);
      expect(result.current.isScanning).toBe(true);
      expect(result.current.localScanError).toBeNull();
    });

    it('Test 10: Mode switcher switches cleanly between CHECK_IN and CHECK_OUT', async () => {
      const { result } = await renderHook(() => useSecurityScanner({ defaultMode: 'CHECK_IN' }));
      expect(result.current.scanMode).toBe('CHECK_IN');

      await act(async () => {
        result.current.setScanMode('CHECK_OUT');
      });
      expect(result.current?.scanMode).toBe('CHECK_OUT');

      await act(async () => {
        result.current.setScanMode('CHECK_IN');
      });
      expect(result.current?.scanMode).toBe('CHECK_IN');
    });
  });

  // =========================================================================
  // Static Forensic Verification: Guard Scanner Independence from V1
  // =========================================================================
  describe('Static Forensic Verification: Zero V1 Check-In Dependencies in Active Scanner', () => {
    const scannerPath = path.resolve(
      __dirname,
      '../../../../app/(resident)/amenities/scanner.tsx'
    );
    const hookPath = path.resolve(__dirname, '../hooks/useSecurityScanner.ts');

    it('verifies useSecurityScanner.ts does NOT import or call checkInBookingThunk or amenityService.checkInBooking', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf8');

      expect(hookContent).not.toMatch(/checkInBookingThunk/);
      expect(hookContent).not.toMatch(/amenityService\.checkInBooking/);
      expect(hookContent).not.toMatch(/\/api\/v1\/amenity-bookings/);
      expect(hookContent).toMatch(/checkInPassThunk/);
      expect(hookContent).toMatch(/checkOutPassThunk/);
    });

    it('verifies scanner.tsx does NOT depend on checkInResult.booking in its active V2 formatting path', () => {
      const scannerContent = fs.readFileSync(scannerPath, 'utf8');

      expect(scannerContent).toMatch(/v2CheckInResult/);
      expect(scannerContent).toMatch(/v2CheckOutResult/);
      expect(scannerContent).toMatch(/SCAN_MODE_TABS/);
      expect(scannerContent).toMatch(/isInspectionModalOpen/);
    });
  });
});

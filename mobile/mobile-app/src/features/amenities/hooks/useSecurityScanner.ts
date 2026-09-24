import { useState, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../store/store';
import { useAppSocket } from '../../../hooks/useAppSocket';
import {
  checkInPassThunk,
  clearV2PassResults,
  clearCheckInResult,
  fetchRecentScansThunk,
} from '../store/amenityBookingSlice';
import { parseAndValidateAppBarcode } from '@/src/utils/appBarcodeProtocol';
import {
  AmenityAccessPass,
  AmenityErrorDetails,
} from '../types/amenityDomain.types';

export type ScanMode = 'CHECK_IN' | 'CHECK_OUT';

export interface UseSecurityScannerOptions {
  defaultMode?: ScanMode;
  gateId?: string;
}

/**
 * Safely extracts an amenity pass token or reference from QR or manual input.
 * Supports:
 * 1. Raw 64-character hexadecimal pass token
 * 2. Canonical MMG:AMENITY:<token> format
 * 3. Application barcode protocol (parseAndValidateAppBarcode)
 * 4. Backward-compatible JSON wrapper inspection (Web & Mobile legacy)
 * 5. Booking ID pattern (e.g. BKG-...) or Mongo ObjectId
 * Strictly avoids logging or persisting the token.
 */
export function extractRawPassToken(rawInput: string): string | null {
  if (!rawInput || typeof rawInput !== 'string') return null;
  const trimmed = rawInput.trim();

  // 1. Direct 64-character hexadecimal token match
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return trimmed;
  }

  // 2. Canonical MMG:AMENITY prefix (e.g. MMG:AMENITY:<token>)
  if (/^MMG:AMENITY:/i.test(trimmed)) {
    const token = trimmed.replace(/^MMG:AMENITY:/i, '').trim();
    if (token) return token;
  }

  // 3. Backward-compatible JSON wrapper inspection (Web & Mobile legacy)
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        const candidate = String(
          parsed.passToken || parsed.rawToken || parsed.qrData || parsed.token || parsed.bookingId || parsed.id || ''
        ).trim();
        if (candidate) {
          return candidate;
        }
      }
    } catch {
      // Not valid JSON; fall through
    }
  }

  // 4. Manage-My-Gate application barcode protocol inspection (must be AMENITY or valid token/ID)
  const validation = parseAndValidateAppBarcode(trimmed);
  if (validation.isValid && validation.code) {
    if (
      validation.type === 'AMENITY' ||
      /^[0-9a-fA-F]{64}$/.test(validation.code) ||
      /^(RES|BKG|GYM|POOL|TEN|CLUB|BAD|BBALL|SQUASH|SPA|CINE)-[0-9A-Z_-]+$/i.test(validation.code) ||
      /^[A-Z]{2,6}-\d+$/i.test(validation.code) ||
      /^[0-9a-fA-F]{6}$/i.test(validation.code) ||
      /^\d{6}-\d{6}$/.test(validation.code) ||
      /^[0-9a-fA-F]{24}$/.test(validation.code)
    ) {
      return validation.code;
    }
  }

  // 5. Booking / Reservation pattern (e.g. RES-..., POOL-..., GYM-..., 6BBF46, 202609-000004) or Mongo ObjectId
  if (
    /^(RES|BKG|GYM|POOL|TEN|CLUB|BAD|BBALL|SQUASH|SPA|CINE)-[0-9A-Z_-]+$/i.test(trimmed) ||
    /^[A-Z]{2,6}-\d+$/i.test(trimmed) ||
    /^[0-9a-fA-F]{6}$/i.test(trimmed) ||
    /^\d{6}-\d{6}$/.test(trimmed) ||
    /^[0-9a-fA-F]{24}$/.test(trimmed)
  ) {
    return trimmed;
  }

  return null;
}

export function useSecurityScanner(options: UseSecurityScannerOptions = {}) {
  const { defaultMode = 'CHECK_IN', gateId } = options;
  const dispatch = useDispatch<AppDispatch>();
  const { socket } = useAppSocket();

  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [isFlashlightOn, setIsFlashlightOn] = useState<boolean>(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState<boolean>(false);
  const [localScanError, setLocalScanError] = useState<string | null>(null);

  const amenityBookingsState = useSelector(
    (state: RootState) => (state as any)?.amenityBookings || {}
  );

  const v2CheckInResult: AmenityAccessPass | null = amenityBookingsState?.v2CheckInResult || null;
  const v2PassActionLoading: boolean = Boolean(amenityBookingsState?.v2PassActionLoading);
  const v2PassError: AmenityErrorDetails | null = amenityBookingsState?.v2PassError || null;
  const recentScans = amenityBookingsState?.recentScans || [];

  // Legacy compatibility aliases
  const checkInResult = v2CheckInResult || amenityBookingsState?.checkInResult || null;
  const checkingIn = v2PassActionLoading || Boolean(amenityBookingsState?.checkingIn);

  const loadRecentScans = useCallback(() => {
    dispatch(fetchRecentScansThunk({}));
  }, [dispatch]);

  useEffect(() => {
    loadRecentScans();
  }, [loadRecentScans]);

  // Real-time Socket.IO listener for live scanner updates
  useEffect(() => {
    if (!socket) return;

    const handleBookingUpdate = () => {
      loadRecentScans();
    };

    socket.on('bookingUpdated', handleBookingUpdate);
    socket.on('bookingCompleted', handleBookingUpdate);

    return () => {
      socket.off('bookingUpdated', handleBookingUpdate);
      socket.off('bookingCompleted', handleBookingUpdate);
    };
  }, [socket, loadRecentScans]);

  const toggleFlashlight = useCallback(() => {
    setIsFlashlightOn((prev) => !prev);
  }, []);

  const handleBarCodeScanned = useCallback(
    async ({ type, data }: { type: string; data: string }) => {
      if (v2PassActionLoading || !data) return;

      setIsScanning(false);
      setLocalScanError(null);

      const rawToken = extractRawPassToken(data);
      if (!rawToken) {
        setLocalScanError('Invalid QR/pass format. Please scan a valid amenity access pass.');
        setIsResultModalOpen(true);
        return;
      }

      await dispatch(checkInPassThunk({ rawToken, gateId }));
      setIsResultModalOpen(true);
      loadRecentScans();
    },
    [dispatch, v2PassActionLoading, gateId, loadRecentScans]
  );

  const resetScanner = useCallback(() => {
    dispatch(clearV2PassResults());
    dispatch(clearCheckInResult());
    setLocalScanError(null);
    setIsResultModalOpen(false);
    setIsScanning(true);
  }, [dispatch]);

  return {
    scanMode: 'CHECK_IN' as ScanMode,
    setScanMode: () => {},
    isScanning,
    isFlashlightOn,
    isResultModalOpen,
    isInspectionModalOpen: false,
    setIsInspectionModalOpen: () => {},
    v2CheckInResult,
    v2CheckOutResult: null,
    v2PassActionLoading,
    v2PassError,
    localScanError,
    checkInResult,
    checkingIn,
    recentScans,
    toggleFlashlight,
    handleBarCodeScanned,
    executeCheckOutWithInspection: async () => {},
    cancelCheckOutInspection: () => {},
    resetScanner,
    loadRecentScans,
  };
}

export default useSecurityScanner;

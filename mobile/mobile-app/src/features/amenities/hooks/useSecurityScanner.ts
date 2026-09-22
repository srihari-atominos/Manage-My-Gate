import { useState, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../store/store';
import { useAppSocket } from '../../../hooks/useAppSocket';
import {
  checkInPassThunk,
  checkOutPassThunk,
  clearV2PassResults,
  clearCheckInResult,
  fetchRecentScansThunk,
} from '../store/amenityBookingSlice';
import { parseAndValidateAppBarcode } from '@/src/utils/appBarcodeProtocol';
import {
  AmenityAccessPass,
  AmenityInspectionDetails,
  AmenityErrorDetails,
} from '../types/amenityDomain.types';

export type ScanMode = 'CHECK_IN' | 'CHECK_OUT';

export interface UseSecurityScannerOptions {
  defaultMode?: ScanMode;
  gateId?: string;
}

/**
 * Safely extracts a 64-character raw hexadecimal pass token from QR or manual input.
 * Strictly avoids logging or persisting the token.
 */
export function extractRawPassToken(rawInput: string): string | null {
  if (!rawInput || typeof rawInput !== 'string') return null;
  const trimmed = rawInput.trim();

  // 1. Direct 64-character hexadecimal token match
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return trimmed;
  }

  // 2. Manage-My-Gate application barcode protocol inspection
  const validation = parseAndValidateAppBarcode(trimmed);
  if (validation.isValid && validation.code) {
    if (/^[0-9a-fA-F]{64}$/.test(validation.code)) {
      return validation.code;
    }
  }

  // 2. Backward-compatible JSON wrapper inspection
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      const candidate = String(parsed.rawToken || parsed.qrData || parsed.token || '').trim();
      if (/^[0-9a-fA-F]{64}$/.test(candidate)) {
        return candidate;
      }
    }
  } catch {
    // Not valid JSON; fall through
  }

  return null;
}

export function useSecurityScanner(options: UseSecurityScannerOptions = {}) {
  const { defaultMode = 'CHECK_IN', gateId } = options;
  const dispatch = useDispatch<AppDispatch>();
  const { socket } = useAppSocket();

  const [scanMode, setScanMode] = useState<ScanMode>(defaultMode);
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [isFlashlightOn, setIsFlashlightOn] = useState<boolean>(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState<boolean>(false);
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState<boolean>(false);
  const [pendingCheckOutToken, setPendingCheckOutToken] = useState<string | null>(null);
  const [localScanError, setLocalScanError] = useState<string | null>(null);

  const amenityBookingsState = useSelector(
    (state: RootState) => (state as any)?.amenityBookings || {}
  );

  const v2CheckInResult: AmenityAccessPass | null = amenityBookingsState?.v2CheckInResult || null;
  const v2CheckOutResult: AmenityAccessPass | null = amenityBookingsState?.v2CheckOutResult || null;
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

      if (scanMode === 'CHECK_IN') {
        await dispatch(checkInPassThunk({ rawToken, gateId }));
        setIsResultModalOpen(true);
        loadRecentScans();
      } else {
        // CHECK_OUT Mode: store pending token and present inspection dialog
        setPendingCheckOutToken(rawToken);
        setIsInspectionModalOpen(true);
      }
    },
    [dispatch, v2PassActionLoading, scanMode, gateId, loadRecentScans]
  );

  // Cleanup pending checkout token on unmount to prevent retention in memory
  useEffect(() => {
    return () => {
      setPendingCheckOutToken(null);
    };
  }, []);

  const executeCheckOutWithInspection = useCallback(
    async (inspectionDetails?: AmenityInspectionDetails) => {
      const token = pendingCheckOutToken;
      if (!token) return;

      setIsInspectionModalOpen(false);
      try {
        await dispatch(checkOutPassThunk({ rawToken: token, inspectionDetails }));
      } finally {
        setPendingCheckOutToken(null);
      }
      setIsResultModalOpen(true);
      loadRecentScans();
    },
    [dispatch, pendingCheckOutToken, loadRecentScans]
  );

  const cancelCheckOutInspection = useCallback(() => {
    setPendingCheckOutToken(null);
    setIsInspectionModalOpen(false);
    setIsScanning(true);
  }, []);

  const resetScanner = useCallback(() => {
    dispatch(clearV2PassResults());
    dispatch(clearCheckInResult());
    setLocalScanError(null);
    setPendingCheckOutToken(null);
    setIsInspectionModalOpen(false);
    setIsResultModalOpen(false);
    setIsScanning(true);
  }, [dispatch]);

  return {
    scanMode,
    setScanMode,
    isScanning,
    isFlashlightOn,
    isResultModalOpen,
    isInspectionModalOpen,
    setIsInspectionModalOpen,
    v2CheckInResult,
    v2CheckOutResult,
    v2PassActionLoading,
    v2PassError,
    localScanError,
    checkInResult,
    checkingIn,
    recentScans,
    toggleFlashlight,
    handleBarCodeScanned,
    executeCheckOutWithInspection,
    cancelCheckOutInspection,
    resetScanner,
    loadRecentScans,
  };
}

export default useSecurityScanner;

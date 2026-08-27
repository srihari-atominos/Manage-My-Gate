import { useState, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../store/store';
import { useAppSocket } from '../../../hooks/useAppSocket';
import {
  checkInBookingThunk,
  clearCheckInResult,
  fetchRecentScansThunk,
} from '../store/amenityBookingSlice';

export function useSecurityScanner() {
  const dispatch = useDispatch<AppDispatch>();
  const { socket } = useAppSocket();

  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [isFlashlightOn, setIsFlashlightOn] = useState<boolean>(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState<boolean>(false);

  const { checkInResult, checkingIn, recentScans } = useSelector(
    (state: RootState) => state.amenityBookings
  );

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

  const toggleFlashlight = () => {
    setIsFlashlightOn((prev) => !prev);
  };

  const handleBarCodeScanned = useCallback(
    async ({ type, data }: { type: string; data: string }) => {
      if (!isScanning || checkingIn) return;

      setIsScanning(false);
      let bookingId = data;

      // Check if data is JSON payload containing bookingId
      try {
        const parsed = JSON.parse(data);
        if (parsed.bookingId || parsed._id || parsed.id) {
          bookingId = parsed.bookingId || parsed._id || parsed.id;
        }
      } catch {
        // Raw ID string payload
      }

      await dispatch(
        checkInBookingThunk({
          bookingId,
          payload: { qrPayload: data },
        })
      );
      setIsResultModalOpen(true);
      loadRecentScans();
    },
    [dispatch, isScanning, checkingIn, loadRecentScans]
  );

  const resetScanner = () => {
    dispatch(clearCheckInResult());
    setIsResultModalOpen(false);
    setIsScanning(true);
  };

  return {
    isScanning,
    isFlashlightOn,
    isResultModalOpen,
    checkInResult,
    checkingIn,
    recentScans,
    toggleFlashlight,
    handleBarCodeScanned,
    resetScanner,
    loadRecentScans,
  };
}

export default useSecurityScanner;

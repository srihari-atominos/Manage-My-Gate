import { useState, useCallback } from 'react';
import { checkInBooking } from '../services/amenityBookingApi.js';

export const useSecurityScanner = () => {
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const processCheckIn = useCallback(async (bookingId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await checkInBooking(bookingId);
      // Assuming response.data contains the updated booking
      setScanResult({
        success: true,
        booking: response.data || { _id: bookingId },
        message: 'Check-in successful.'
      });
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to check in.';
      setScanResult({
        success: false,
        message: errorMsg
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleScan = useCallback((data) => {
    if (!data) return;
    
    // Simple debounce to prevent multiple rapid scans
    if (loading || scanResult) return;

    try {
      const payload = JSON.parse(data);
      if (payload && payload.bookingId) {
        processCheckIn(payload.bookingId);
      } else {
        throw new Error('Invalid QR Format');
      }
    } catch (e) {
      setScanResult({
        success: false,
        message: 'Unrecognized QR Code format. Please scan a valid GatedCommunity Resident Wallet pass.'
      });
    }
  }, [loading, scanResult, processCheckIn]);

  const handleManualEntry = useCallback((bookingId) => {
    if (!bookingId || bookingId.trim() === '') return;
    processCheckIn(bookingId.trim());
  }, [processCheckIn]);

  const resetScanner = useCallback(() => {
    setScanResult(null);
    setError(null);
  }, []);

  return {
    scanResult,
    loading,
    error,
    handleScan,
    handleManualEntry,
    resetScanner
  };
};

export default useSecurityScanner;

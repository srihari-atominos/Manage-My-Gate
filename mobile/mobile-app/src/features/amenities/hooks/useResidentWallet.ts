import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../store/store';
import { fetchWalletThunk, topUpWalletThunk, clearWalletStatus } from '../store/walletSlice';
import { fetchMyBookingsThunk, cancelBookingThunk, AmenityBooking } from '../store/amenityBookingSlice';

export function useResidentWallet() {
  const dispatch = useDispatch<AppDispatch>();

  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState<boolean>(false);
  const [selectedPassForQR, setSelectedPassForQR] = useState<AmenityBooking | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AmenityBooking | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  const walletState = useSelector((state: RootState) => state.wallet);
  const balance = walletState?.balance || 0;
  const currency = 'INR';
  const transactions = walletState?.transactions || walletState?.transactionHistory || [];
  const walletLoading = walletState?.isLoading || (walletState as any)?.loading || false;
  const toppingUp = walletState?.isLoading || false;
  const walletError = walletState?.error || null;
  const walletSuccess = null;

  const { myBookings, loading: bookingsLoading } = useSelector(
    (state: RootState) => state.amenityBookings
  );

  useEffect(() => {
    dispatch(fetchWalletThunk());
    dispatch(fetchMyBookingsThunk({}));
  }, [dispatch]);

  const activePasses = useMemo(() => {
    const _now = new Date();
    const _offset = _now.getTimezoneOffset();
    const todayStr = new Date(_now.getTime() - (_offset * 60 * 1000)).toISOString().split('T')[0];
    return myBookings.filter((b) => {
      const isStatusValid = b.status === 'CONFIRMED' || b.status === 'CHECKED_IN';
      const isDateValid = b.date >= todayStr;
      return isStatusValid && isDateValid;
    });
  }, [myBookings]);

  const handleOpenTopUp = () => {
    setIsTopUpModalOpen(true);
  };

  const handleCloseTopUp = () => {
    setIsTopUpModalOpen(false);
  };

  const handleTopUpSubmit = async (amount: number) => {
    if (amount <= 0) return;
    const result = await dispatch(topUpWalletThunk(amount));
    if (topUpWalletThunk.fulfilled.match(result)) {
      setIsTopUpModalOpen(false);
    }
  };

  const handleOpenPassQR = (pass: AmenityBooking) => {
    setSelectedPassForQR(pass);
  };

  const handleClosePassQR = () => {
    setSelectedPassForQR(null);
  };

  const handleOpenCancel = (pass: AmenityBooking) => {
    setCancelTarget(pass);
  };

  const handleCloseCancel = () => {
    setCancelTarget(null);
  };

  const handleConfirmCancel = async (reason: string) => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    await dispatch(cancelBookingThunk({ bookingId: cancelTarget._id, reason }));
    setCancelTarget(null);
    setIsCancelling(false);
    handleRefresh();
  };

  const handleRefresh = () => {
    dispatch(fetchWalletThunk());
    dispatch(fetchMyBookingsThunk({}));
  };

  return {
    balance,
    currency,
    transactions,
    myBookings,
    activePasses,
    isTopUpModalOpen,
    selectedPassForQR,
    cancelTarget,
    isCancelling,
    loading: walletLoading || bookingsLoading,
    toppingUp,
    error: walletError,
    successMsg: walletSuccess,
    handleOpenTopUp,
    handleCloseTopUp,
    handleTopUpSubmit,
    handleOpenPassQR,
    handleClosePassQR,
    handleOpenCancel,
    handleCloseCancel,
    handleConfirmCancel,
    handleRefresh,
    clearStatus: () => dispatch(clearWalletStatus()),
  };
}

export default useResidentWallet;

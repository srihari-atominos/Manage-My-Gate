import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RootState, AppDispatch } from '../../../store/store';
import {
  fetchAmenityByIdThunk,
  fetchAmenitySlotsThunk,
  clearAmenityError,
  AmenitySlot,
} from '../store/amenitySlice';
import {
  createBookingThunk,
  clearBookingStatus,
} from '../store/amenityBookingSlice';
import { fetchWalletThunk, topUpWalletThunk } from '../store/walletSlice';

export function useResidentBooking() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const _now = new Date();
  const _offset = _now.getTimezoneOffset();
  const today = new Date(_now.getTime() - (_offset * 60 * 1000)).toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [selectedSlot, setSelectedSlot] = useState<AmenitySlot | null>(null);
  const [guestsCount, setGuestsCount] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'ONLINE'>('WALLET');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState<boolean>(false);

  const { currentAmenity, slots, loading: amenityLoading, slotsLoading, error: amenityError } = useSelector(
    (state: RootState) => state.amenities
  );

  const { creatingBooking, error: bookingError, isOCCError, occErrorMessage, successMsg } = useSelector(
    (state: RootState) => state.amenityBookings
  );

  const { balance = 0, isLoading: walletLoading = false } = useSelector((state: RootState) => state.wallet);

  useEffect(() => {
    if (id) {
      dispatch(clearAmenityError());
      dispatch(clearBookingStatus());
      dispatch(fetchAmenityByIdThunk(id));
      dispatch(fetchWalletThunk());
    }
  }, [dispatch, id]);

  const loadSlots = useCallback(() => {
    if (id && selectedDate) {
      dispatch(fetchAmenitySlotsThunk({ id, date: selectedDate }));
    }
  }, [dispatch, id, selectedDate]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot: AmenitySlot) => {
    const isAvail = slot.isAvailable !== undefined ? slot.isAvailable : slot.status ? slot.status === 'Available' : true;
    const count = slot.availableCount !== undefined ? slot.availableCount : 1;
    if (isAvail && count > 0) {
      setSelectedSlot(slot);
    }
  };

  const handleOpenCheckout = () => {
    const isDaily = currentAmenity?.pricing?.pricingType === 'daily';
    if (!isDaily && !selectedSlot) return;
    setIsCheckoutOpen(true);
  };

  const handleCloseCheckout = () => {
    setIsCheckoutOpen(false);
  };

  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);

  const handleConfirmBooking = async () => {
    const isDaily = currentAmenity?.pricing?.pricingType === 'daily';
    if (!id) return;
    if (!isDaily && !selectedSlot) return;

    const startTime = isDaily ? (currentAmenity.bookingRules?.openTime || '00:00') : selectedSlot!.startTime;
    const endTime = isDaily ? (currentAmenity.bookingRules?.closeTime || '23:59') : selectedSlot!.endTime;
    const slotId = isDaily ? undefined : selectedSlot!._id;

    const result = await dispatch(
      createBookingThunk({
        amenityId: id,
        date: selectedDate,
        startTime,
        endTime,
        slotId,
        paymentMethod,
        guestsCount: isDaily ? (currentAmenity.capacity || 1) : guestsCount,
      })
    );

    if (createBookingThunk.fulfilled.match(result)) {
      dispatch(fetchWalletThunk());
      setIsCheckoutOpen(false);
      setIsSuccessModalOpen(true);
    }
  };

  const handleCloseSuccessModal = () => {
    setIsSuccessModalOpen(false);
    router.push('/(resident)/amenities/my-bookings');
  };
  const handleViewPass = () => {
    setIsSuccessModalOpen(false);
    router.push('/(resident)/amenities/my-bookings');
  };

  const handleRetryOCC = () => {
    dispatch(clearBookingStatus());
    setSelectedSlot(null);
    loadSlots();
  };

  const handleOpenTopUp = () => setIsTopUpOpen(true);
  const handleCloseTopUp = () => setIsTopUpOpen(false);

  const handleTopUpSubmit = async (amount: number) => {
    if (amount <= 0) return;
    const result = await dispatch(topUpWalletThunk(amount));
    if (topUpWalletThunk.fulfilled.match(result)) {
      setIsTopUpOpen(false);
    }
  };

  const isDaily = currentAmenity?.pricing?.pricingType === 'daily';
  const securityDeposit = currentAmenity?.pricing?.securityDeposit || 0;
  const unitFee = selectedSlot?.price ?? selectedSlot?.fee ?? currentAmenity?.bookingFee ?? currentAmenity?.pricing?.baseRate ?? 0;
  const computedTotalFee = (isDaily ? unitFee : unitFee * guestsCount) + securityDeposit;
  const isBalanceSufficient = paymentMethod === 'ONLINE' || balance >= computedTotalFee;

  return {
    id,
    currentAmenity,
    slots,
    selectedDate,
    selectedSlot,
    guestsCount,
    paymentMethod,
    isCheckoutOpen,
    isTopUpOpen,
    balance,
    toppingUp: walletLoading,
    totalFee: computedTotalFee,
    isBalanceSufficient,
    loading: amenityLoading || slotsLoading,
    creatingBooking,
    error: amenityError || bookingError,
    isOCCError,
    occErrorMessage,
    successMsg,
    isSuccessModalOpen,
    handleCloseSuccessModal,
    handleViewPass,
    handleDateChange,
    handleSlotSelect,
    setGuestsCount,
    setPaymentMethod,
    handleOpenCheckout,
    handleCloseCheckout,
    handleConfirmBooking,
    handleRetryOCC,
    handleOpenTopUp,
    handleCloseTopUp,
    handleTopUpSubmit,
  };
}

export default useResidentBooking;

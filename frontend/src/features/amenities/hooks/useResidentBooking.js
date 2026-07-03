import { useState, useMemo, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAmenities } from '../store/amenitySlice.js';
import { createBooking } from '../services/amenityBookingApi.js';
import { useNavigate } from 'react-router-dom';

export const useResidentBooking = (initialAmenityId) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // State Machine
  const [step, setStep] = useState('date'); // 'date' | 'time' | 'review' | 'payment' | 'submitting' | 'success' | 'failed'
  const [errorMsg, setErrorMsg] = useState('');
  const [paymentIntent, setPaymentIntent] = useState(null);

  // Single Source of Truth for Booking
  const [draft, setDraft] = useState({
    amenityId: initialAmenityId,
    bookingDate: '',
    startTime: '',
    endTime: '',
    duration: 0,
    price: 0,
    totalPrice: 0,
  });

  const { items, loading, availableSlots, slotsLoading } = useSelector(state => state.amenities);
  
  const amenity = useMemo(() => items.find(i => i._id === initialAmenityId), [items, initialAmenityId]);

  useEffect(() => {
    if (!amenity && !loading) {
      dispatch(getAmenities());
    }
  }, [amenity, loading, dispatch]);

  const updateDraft = useCallback((updates) => {
    setDraft(prev => {
      const newDraft = { ...prev, ...updates };
      newDraft.totalPrice = (newDraft.price || 0) + (newDraft.deposit || 0);
      return newDraft;
    });
    setErrorMsg(''); // clear errors on edit
  }, []);

  const proceedToTime = () => {
    if (!draft.bookingDate) {
      setErrorMsg('Please select a date first.');
      return;
    }
    // Fetch slots when moving to time step
    dispatch(fetchAmenitySlots({ id: draft.amenityId, date: draft.bookingDate }));
    setStep('time');
  };

  const proceedToReview = () => {
    if (!draft.startTime || !draft.endTime) {
      setErrorMsg('Please select a valid time slot.');
      return;
    }
    setStep('review');
  };

  const goBack = () => {
    if (step === 'time') setStep('date');
    if (step === 'review') setStep('time');
    if (step === 'payment') setStep('review');
    setErrorMsg('');
  };

  const confirmBooking = async () => {
    setStep('submitting');
    setErrorMsg('');
    try {
      const payload = {
        amenityId: draft.amenityId,
        bookingDate: draft.bookingDate,
        startTime: draft.startTime,
        endTime: draft.endTime
      };
      
      const response = await createBooking(payload);
      
      if (response.paymentIntent) {
        setPaymentIntent(response.paymentIntent);
        setStep('payment');
      } else {
        setStep('success');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit booking');
      setStep('failed');
    }
  };

  const processMockPayment = async (isSuccess) => {
    if (!paymentIntent) return;
    setStep('submitting');
    try {
      const { simulatePayment } = await import('../services/paymentApi.js');
      await simulatePayment(paymentIntent.paymentId, isSuccess, isSuccess ? null : 'Insufficient funds in mock bank');
      if (isSuccess) {
        setStep('success');
      } else {
        setErrorMsg('Payment Failed. Booking cancelled.');
        setStep('failed');
      }
    } catch (err) {
      setErrorMsg('Failed to process payment');
      setStep('failed');
    }
  };

  const complete = () => {
    navigate('/resident/amenities/discover');
  };

  return {
    amenity,
    loading,
    slotsLoading,
    availableSlots,
    step,
    draft,
    errorMsg,
    paymentIntent,
    updateDraft,
    proceedToTime,
    proceedToReview,
    goBack,
    confirmBooking,
    processMockPayment,
    complete
  };
};

export default useResidentBooking;

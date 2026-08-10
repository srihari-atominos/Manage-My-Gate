import { useDispatch, useSelector } from 'react-redux';
import { generateOrderThunk, clearError } from '../store/platformQuoteSlice.js';
import { fetchQuotesThunk, fetchOrdersThunk, fetchInvoicesThunk, fetchSubscriptionsThunk, fetchJobsThunk } from '../../platformBilling/store/platformBillingSlice.js';
import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

export const usePlatformQuote = () => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.platformQuote);
  const [orderStatus, setOrderStatus] = useState(null);

  const generateOrder = useCallback(async (quoteId, payload) => {
    if (!quoteId) {
      toast.error('Quote ID is missing');
      return;
    }
    
    try {
      await dispatch(generateOrderThunk({ quoteId, payload })).unwrap();
      
      // Refresh billing tables in the background
      dispatch(fetchQuotesThunk());
      dispatch(fetchOrdersThunk());
      dispatch(fetchInvoicesThunk());
      dispatch(fetchSubscriptionsThunk());
      dispatch(fetchJobsThunk());

      toast.success('Order Dispatched Successfully');
      
      if (payload.trialDays > 0) {
        setOrderStatus('TRIAL_PENDING');
      } else {
        setOrderStatus('PAYMENT_PENDING');
      }
    } catch (err) {
      toast.error(err || 'Failed to dispatch order');
    }
  }, [dispatch]);

  return {
    loading,
    error,
    orderStatus,
    generateOrder,
    clearError: () => dispatch(clearError()),
  };
};

import { useState, useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../../services/apiClient.js';
import { toast } from 'react-hot-toast';
import { useSocket } from '../../../../hooks/useSocket.js';

export const useRazorpayCheckout = () => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    
    const handleUpdate = (data) => {
      if (activeOrderId && (data.orderId === activeOrderId || data.razorpay_order_id === activeOrderId || data.id === activeOrderId)) {
        if (data.status === 'PAID' || data.status === 'COMPLETED' || data.status === 'ACTIVE') {
          toast.dismiss('verify-payment');
          toast.success('Payment Successful! Your subscription is now active.');
          dispatch({ type: 'subscription/setStatus', payload: 'ACTIVE' });
          setIsInitializing(false);
          setActiveOrderId(null);
          navigate('/dashboard');
        }
      }
    };

    socket.on('PAYMENT_CAPTURED', handleUpdate);
    socket.on('PROVISIONING_JOB_UPDATE', handleUpdate);

    return () => {
      socket.off('PAYMENT_CAPTURED', handleUpdate);
      socket.off('PROVISIONING_JOB_UPDATE', handleUpdate);
    };
  }, [socket, activeOrderId, dispatch, navigate]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = useCallback(async (checkoutPayload) => {
    try {
      setIsInitializing(true);
      
      // Step 2: Load the Razorpay Checkout script dynamically
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error('Razorpay SDK failed to load. Are you online?');
        setIsInitializing(false);
        return;
      }

      // Step 1: Call our backend POST /api/platform-payments/create-order to generate a Razorpay order_id
      const response = await apiClient.post('/api/platform-payments/create-order', checkoutPayload);
      const order = response.order;
      setActiveOrderId(order.id);

      // Step 3: Initialize new window.Razorpay(options) passing the order_id, amount, and company branding
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_YourKey', // Use environment variable
        amount: order.amount,
        currency: order.currency,
        name: 'Manage-My-Gate',
        description: 'Subscription Renewal',
        order_id: order.id, // This is the Razorpay order_id
        
        // Step 4: On the handler success callback
        handler: function (response) {
          setIsInitializing(true); // Keep UI in a loading state
          toast.loading('Payment captured. Verifying with server...', { id: 'verify-payment' });
          
          // Legacy polling has been removed. 
          // We now rely purely on the global useSocket event listeners attached in this hook's useEffect.
        },
        prefill: {
          name: checkoutPayload.userName,
          email: checkoutPayload.userEmail,
        },
        theme: {
          color: '#3399cc',
        },
        modal: {
          ondismiss: function () {
            // Handle modal dismissal: reset the loading state
            setIsInitializing(false);
            toast.info('Payment cancelled');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        toast.error(`Payment Failed: ${response.error.description}`);
        setIsInitializing(false);
        setActiveOrderId(null);
      });

      rzp.open();
    } catch (error) {
      toast.error(error.message || 'Error initializing payment');
      setIsInitializing(false);
      setActiveOrderId(null);
    }
  }, [dispatch, navigate]);

  return { handleCheckout, isInitializing };
};

import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import { useAppSocket } from '../../../hooks/useAppSocket';
import { syncRealtimeInvoice, fetchMyDues } from '../store/billingSlice';
import { fetchWalletBalance, syncWalletBalance } from '../store/walletSlice';

/**
 * Custom Hook: useBillingSocket
 *
 * Silent background listener that manages the real-time Socket.io connections
 * and event listeners for invoice billing & wallet balance updates.
 * Conforms to the "Thin View" pattern by encapsulating all socket logic.
 */
export const useBillingSocket = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { socket } = useAppSocket();

  const user = useSelector((state: RootState) => state.auth?.user);
  const userId = user?.id || user?._id;
  const orgId = user?.orgId;

  const rooms = useMemo(() => {
    const list: string[] = [];
    if (userId) list.push(`user:${userId}`);
    if (orgId) list.push(`org:${orgId}`);
    return list;
  }, [userId, orgId]);

  useEffect(() => {
    if (!socket) return;

    // Join rooms dynamically for targeted real-time broadcasts
    rooms.forEach((room) => {
      socket.emit('join_room', room);
    });

    // 1. Invoice Generation Handler
    const handleInvoiceGenerated = (payload: any) => {
      console.log('[Billing Socket] Real-time event: invoice_generated', payload);
      if (payload) dispatch(syncRealtimeInvoice(payload));
      dispatch(fetchMyDues());
    };

    // 2. Invoice Status Update Handler
    const handleInvoiceStatusUpdated = (payload: any) => {
      console.log('[Billing Socket] Real-time event: invoice_status_updated / INVOICE_UPDATED', payload);
      if (payload) dispatch(syncRealtimeInvoice(payload));
      dispatch(fetchMyDues());
    };

    // 3. Payment Success Handler
    const handlePaymentSuccess = (payload: any) => {
      console.log('[Billing Socket] Real-time event: PAYMENT_SUCCESS', payload);
      if (payload?.invoice) dispatch(syncRealtimeInvoice(payload.invoice));
      dispatch(fetchMyDues());
      dispatch(fetchWalletBalance());
    };

    // 4. Digital Wallet Update Handler
    const handleWalletUpdated = (payload: any) => {
      console.log('[Billing Socket] Real-time event: WALLET_UPDATED / walletUpdated', payload);
      if (payload) {
        dispatch(syncWalletBalance(payload));
      }
      dispatch(fetchWalletBalance());
      dispatch(fetchMyDues());
    };

    // 5. Offline Payment Submission Handler
    const handleOfflinePaymentSubmitted = (payload: any) => {
      console.log('[Billing Socket] Real-time event: offline_payment_submitted', payload);
      if (payload?.invoice) {
        dispatch(syncRealtimeInvoice(payload.invoice));
      }
    };

    // Register event listeners
    socket.on('invoice_generated', handleInvoiceGenerated);
    socket.on('invoice_status_updated', handleInvoiceStatusUpdated);
    socket.on('INVOICE_UPDATED', handleInvoiceStatusUpdated);
    socket.on('INVOICE_STATUS_UPDATED', handleInvoiceStatusUpdated);
    socket.on('PAYMENT_SUCCESS', handlePaymentSuccess);
    socket.on('WALLET_UPDATED', handleWalletUpdated);
    socket.on('walletUpdated', handleWalletUpdated);
    socket.on('wallet_updated', handleWalletUpdated);
    socket.on('wallet_transaction_created', handleWalletUpdated);
    socket.on('offline_payment_submitted', handleOfflinePaymentSubmitted);

    // Lifecycle Cleanup
    return () => {
      socket.off('invoice_generated', handleInvoiceGenerated);
      socket.off('invoice_status_updated', handleInvoiceStatusUpdated);
      socket.off('INVOICE_UPDATED', handleInvoiceStatusUpdated);
      socket.off('INVOICE_STATUS_UPDATED', handleInvoiceStatusUpdated);
      socket.off('PAYMENT_SUCCESS', handlePaymentSuccess);
      socket.off('WALLET_UPDATED', handleWalletUpdated);
      socket.off('walletUpdated', handleWalletUpdated);
      socket.off('wallet_updated', handleWalletUpdated);
      socket.off('wallet_transaction_created', handleWalletUpdated);
      socket.off('offline_payment_submitted', handleOfflinePaymentSubmitted);
    };
  }, [socket, dispatch, rooms]);
};

export default useBillingSocket;


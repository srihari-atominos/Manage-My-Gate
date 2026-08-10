import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../../store/store';
import { useAppSocket } from '../../../hooks/useAppSocket';
import {
  syncRealtimeInvoice,
  syncRealtimeKPIs,
  fetchMyDues,
} from '../store/billingSlice';

/**
 * Custom hook encapsulating real-time Socket.IO event listeners for Mobile Billing & Invoicing.
 * Listens for backend socket events (INVOICE_GENERATED, INVOICE_STATUS_UPDATED, COMMUNITY_KPIS_UPDATED),
 * updates the Redux store quietly, and re-triggers dues fetching on reconnect.
 */
export const useBillingSocket = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { socket } = useAppSocket();

  useEffect(() => {
    if (!socket) return;

    // 1. Handler for INVOICE_GENERATED / INVOICE_STATUS_UPDATED
    const handleInvoiceEvent = (payload: any) => {
      if (!payload) return;
      console.log('[BillingSocket] Received invoice update event:', payload);
      dispatch(syncRealtimeInvoice(payload.invoice || payload));
      dispatch(fetchMyDues());
    };

    // 2. Handler for COMMUNITY_KPIS_UPDATED
    const handleKPIsEvent = (payload: any) => {
      if (!payload) return;
      console.log('[BillingSocket] Received KPIs update event:', payload);
      dispatch(syncRealtimeKPIs(payload));
    };

    // 3. Handler for Socket reconnect event -> triggers background REST synchronization
    const handleConnect = () => {
      console.log('[BillingSocket] Socket connected/reconnected: refreshing personal dues');
      dispatch(fetchMyDues());
    };

    // Register event listeners
    socket.on('INVOICE_GENERATED', handleInvoiceEvent);
    socket.on('INVOICE_STATUS_UPDATED', handleInvoiceEvent);
    socket.on('COMMUNITY_KPIS_UPDATED', handleKPIsEvent);
    socket.on('connect', handleConnect);

    // Lifecycle cleanup
    return () => {
      socket.off('INVOICE_GENERATED', handleInvoiceEvent);
      socket.off('INVOICE_STATUS_UPDATED', handleInvoiceEvent);
      socket.off('COMMUNITY_KPIS_UPDATED', handleKPIsEvent);
      socket.off('connect', handleConnect);
    };
  }, [socket, dispatch]);
};

export default useBillingSocket;

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import useSocket from '../../../hooks/useSocket.js';
import { syncRealtimeInvoice } from '../store/billingSlice.js';
import logger from '../../../utils/logger.js';

/**
 * Custom Hook: useBillingSocket
 * 
 * Silent background listener that manages the real-time Socket.io connections 
 * and listeners for invoice billing events, conforming to the "Thin View" pattern.
 * 
 * @param {string} userId - The unique ID of the authenticated user to join user:${userId} room
 */
export const useBillingSocket = (userId) => {
  const dispatch = useDispatch();
  const room = userId ? `user:${userId}` : null;
  const socket = useSocket(room);

  useEffect(() => {
    if (!socket) return;

    logger.info(`Registering invoice real-time listeners for room: ${room}`);

    // Listeners for invoice updates
    socket.on('invoice_generated', (payload) => {
      logger.info('Real-time notification: invoice_generated', payload);
      dispatch(syncRealtimeInvoice(payload));
    });

    socket.on('invoice_status_updated', (payload) => {
      logger.info('Real-time notification: invoice_status_updated', payload);
      dispatch(syncRealtimeInvoice(payload));
    });

    // Specifically requested event channel target: INVOICE_UPDATED
    socket.on('INVOICE_UPDATED', (payload) => {
      logger.info('Real-time notification: INVOICE_UPDATED', payload);
      dispatch(syncRealtimeInvoice(payload));
    });

    // Lifecycle Cleanup
    return () => {
      logger.info(`Cleaning up invoice real-time listeners for room: ${room}`);
      socket.off('invoice_generated');
      socket.off('invoice_status_updated');
      socket.off('INVOICE_UPDATED');
    };
  }, [socket, dispatch, room]);
};

export default useBillingSocket;

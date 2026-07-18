import { useEffect, useMemo } from 'react';
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
 * @param {string} orgId - The active organization context ID to join org:${orgId} room
 */
export const useBillingSocket = (userId, orgId) => {
  const dispatch = useDispatch();

  const rooms = useMemo(() => {
    const list = [];
    if (userId) list.push(`user:${userId}`);
    if (orgId) list.push(`org:${orgId}`);
    return list;
  }, [userId, orgId]);

  const socket = useSocket(rooms);

  useEffect(() => {
    if (!socket) return;

    logger.info(`Registering invoice real-time listeners for rooms: ${rooms.join(', ')}`);

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
      logger.info(`Cleaning up invoice real-time listeners for rooms: ${rooms.join(', ')}`);
      socket.off('invoice_generated');
      socket.off('invoice_status_updated');
      socket.off('INVOICE_UPDATED');
    };
  }, [socket, dispatch, rooms]);
};

export default useBillingSocket;

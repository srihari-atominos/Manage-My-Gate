import { useEffect, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import useSocket from '../../../hooks/useSocket.js'
import { syncRealtimeInvoice, fetchMyDues } from '../store/billingSlice.js'
import { fetchWalletBalance, syncWalletBalance } from '../store/walletSlice.js'
import logger from '../../../utils/logger.js'

/**
 * Custom Hook: useBillingSocket
 *
 * Silent background listener that manages the real-time Socket.io connections
 * and listeners for invoice billing & wallet balance updates.
 * Conforms to the "Thin View" pattern by encapsulating all socket logic.
 *
 * @param {string} userId - The unique ID of the authenticated user to join user:${userId} room
 * @param {string} communityOrOrgId - Active community or organization ID to join org:${communityOrOrgId} room
 */
export const useBillingSocket = (userId, communityOrOrgId) => {
  const dispatch = useDispatch()

  const rooms = useMemo(() => {
    const list = []
    if (userId) list.push(`user:${userId}`)
    if (communityOrOrgId) list.push(`org:${communityOrOrgId}`)
    return list
  }, [userId, communityOrOrgId])

  const { socket, isConnected, emit } = useSocket()

  useEffect(() => {
    if (!socket || !isConnected) return

    logger.info(`Registering billing & wallet real-time listeners for rooms: ${rooms.join(', ')}`)

    // Join rooms dynamically
    rooms.forEach(room => emit('join_room', room))

    // 1. Invoice Generation Handler
    const handleInvoiceGenerated = (payload) => {
      logger.info('Real-time notification: invoice_generated', payload)
      if (payload) dispatch(syncRealtimeInvoice(payload))
      dispatch(fetchMyDues())
    }

    // 2. Invoice Status Update Handler
    const handleInvoiceStatusUpdated = (payload) => {
      logger.info('Real-time notification: invoice_status_updated / INVOICE_UPDATED', payload)
      if (payload) dispatch(syncRealtimeInvoice(payload))
      dispatch(fetchMyDues())
    }

    // 3. Payment Success Handler (Cross-slice dispatching to billing + wallet)
    const handlePaymentSuccess = (payload) => {
      logger.info('Real-time notification: PAYMENT_SUCCESS', payload)
      if (payload?.invoice) dispatch(syncRealtimeInvoice(payload.invoice))
      dispatch(fetchMyDues())
      dispatch(fetchWalletBalance())
    }

    // 4. Digital Wallet Update Handler (Cross-slice dispatching to wallet)
    const handleWalletUpdated = (payload) => {
      logger.info('Real-time notification: WALLET_UPDATED / walletUpdated', payload)
      if (payload) {
        dispatch(syncWalletBalance(payload))
      }
      dispatch(fetchWalletBalance())
      dispatch(fetchMyDues())
    }

    // Reconnect handler to ensure room re-subscription and state sync after network restoration
    const handleReconnect = () => {
      logger.info(`Socket reconnected. Re-subscribing to rooms: ${rooms.join(', ')}`)
      rooms.forEach(room => emit('join_room', room))
      dispatch(fetchMyDues())
      dispatch(fetchWalletBalance())
    }

    // Register event listeners
    socket.on('reconnect', handleReconnect)
    socket.on('invoice_generated', handleInvoiceGenerated)
    socket.on('invoice_status_updated', handleInvoiceStatusUpdated)
    socket.on('INVOICE_UPDATED', handleInvoiceStatusUpdated)
    socket.on('INVOICE_STATUS_UPDATED', handleInvoiceStatusUpdated)
    socket.on('PAYMENT_SUCCESS', handlePaymentSuccess)
    socket.on('WALLET_UPDATED', handleWalletUpdated)
    socket.on('walletUpdated', handleWalletUpdated)
    
    // Listen for offline payment submission to update the admin billing ledger instantly
    socket.on('offline_payment_submitted', (payload) => {
      logger.info('Real-time notification: offline_payment_submitted', payload)
      if (payload?.invoice) {
        dispatch(syncRealtimeInvoice(payload.invoice))
      }
    })

    // Lifecycle Cleanup
    return () => {
      logger.info(`Cleaning up billing & wallet real-time listeners for rooms: ${rooms.join(', ')}`)
      socket.off('reconnect', handleReconnect)
      socket.off('invoice_generated', handleInvoiceGenerated)
      socket.off('invoice_status_updated', handleInvoiceStatusUpdated)
      socket.off('INVOICE_UPDATED', handleInvoiceStatusUpdated)
      socket.off('INVOICE_STATUS_UPDATED', handleInvoiceStatusUpdated)
      socket.off('PAYMENT_SUCCESS', handlePaymentSuccess)
      socket.off('WALLET_UPDATED', handleWalletUpdated)
      socket.off('walletUpdated', handleWalletUpdated)
      socket.off('offline_payment_submitted')
    }
  }, [socket, isConnected, emit, dispatch, rooms])
}

export default useBillingSocket

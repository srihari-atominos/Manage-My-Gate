import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { io } from 'socket.io-client'
import config from '../../../config/config.js'

/**
 * Booking-specific socket hook for the My Bookings page.
 * Listens for booking and payment events and triggers a refresh callback.
 * Per architecture rules: no Redux dispatch here – caller provides onRefresh callback.
 */
export const useResidentBookingSocket = (onRefresh) => {
  const { user, token } = useSelector((state) => state.auth || {})
  const refreshRef = useRef(onRefresh)

  // Keep the ref in sync without re-triggering the effect
  useEffect(() => {
    refreshRef.current = onRefresh
  }, [onRefresh])

  const userId = user?._id || user?.id
  const orgId = user?.orgId

  useEffect(() => {
    if (!userId || !token) return

    const socketUrl = config.socketUrl

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      withCredentials: true,
    })

    let connectedBefore = false
    socket.on('connect', () => {
      if (orgId) {
        socket.emit('join_room', `org:${orgId}`)
      }
      // Also join the personal user room for private booking events
      socket.emit('join_room', `user:${userId}`)
      // Events missed while disconnected are not replayed: refresh after a reconnect
      if (connectedBefore) refreshRef.current?.()
      connectedBefore = true
    })

    const handleRefresh = () => {
      if (refreshRef.current) refreshRef.current()
    }

    // Booking lifecycle events
    socket.on('amenity_booking_created', handleRefresh)
    socket.on('amenity_booking_cancelled', handleRefresh)
    socket.on('amenity_booking_checked_in', handleRefresh)
    socket.on('bookingUpdated', handleRefresh)
    socket.on('bookingCompleted', handleRefresh)
    socket.on('booking:created', handleRefresh)
    socket.on('booking:updated', handleRefresh)
    socket.on('booking:cancelled', handleRefresh)
    socket.on('booking:confirmed', handleRefresh)
    socket.on('booking:completed', handleRefresh)
    socket.on('booking:status_updated', handleRefresh)

    // Event names emitted by the backend (the colon-style names below are kept for older servers)
    socket.on('AMENITY_BOOKING_CREATED', handleRefresh)
    socket.on('AMENITY_BOOKING_CONFIRMED', handleRefresh)
    socket.on('AMENITY_BOOKING_CANCELLED', handleRefresh)
    socket.on('AMENITY_CHECKIN', handleRefresh)
    socket.on('payment_success', handleRefresh)
    socket.on('payment_failed', handleRefresh)
    socket.on('payment_refunded', handleRefresh)
    socket.on('PAYMENT_SUCCESS', handleRefresh)

    // Payment events
    socket.on('payment:success', handleRefresh)
    socket.on('payment:failed', handleRefresh)

    return () => {
      socket.off('amenity_booking_created', handleRefresh)
      socket.off('amenity_booking_cancelled', handleRefresh)
      socket.off('amenity_booking_checked_in', handleRefresh)
      socket.off('bookingUpdated', handleRefresh)
      socket.off('bookingCompleted', handleRefresh)
      socket.off('booking:created', handleRefresh)
      socket.off('booking:updated', handleRefresh)
      socket.off('booking:cancelled', handleRefresh)
      socket.off('booking:confirmed', handleRefresh)
      socket.off('booking:completed', handleRefresh)
      socket.off('booking:status_updated', handleRefresh)
      socket.off('AMENITY_BOOKING_CREATED', handleRefresh)
      socket.off('AMENITY_BOOKING_CONFIRMED', handleRefresh)
      socket.off('AMENITY_BOOKING_CANCELLED', handleRefresh)
      socket.off('AMENITY_CHECKIN', handleRefresh)
      socket.off('payment_success', handleRefresh)
      socket.off('payment_failed', handleRefresh)
      socket.off('payment_refunded', handleRefresh)
      socket.off('PAYMENT_SUCCESS', handleRefresh)
      socket.off('payment:success', handleRefresh)
      socket.off('payment:failed', handleRefresh)
      socket.disconnect()
    }
  }, [userId, orgId, token])

  return null
}

export default useResidentBookingSocket

import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'

import config from '../../../config/config.js'

const useAdminBookingSocket = (onRefreshNeeded) => {
  const { user, token } = useSelector((state) => state.auth || {})
  const userId = user?._id || user?.id
  const orgId = user?.orgId

  // The refresh callback is usually recreated on every render; a ref keeps the socket connected meanwhile
  const refreshRef = useRef(onRefreshNeeded)
  useEffect(() => {
    refreshRef.current = onRefreshNeeded
  }, [onRefreshNeeded])

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
        // The server also subscribes admins to org:<id>:role:admin, where admin booking events are sent
        socket.emit('join_room', `org:${orgId}`)
      }
      // Events missed while disconnected are not replayed: refresh after a reconnect
      if (connectedBefore) refreshRef.current?.()
      connectedBefore = true
    })

    const handleRefresh = (data) => {
      // We can optionally check if the event falls in our current date range,
      // but for simplicity and guaranteeing data consistency, we trigger a refresh.
      if (refreshRef.current) {
        refreshRef.current()
      }
    }

    const handleBookingCreated = (data) => {
      toast.success(`New booking created by ${data.userId?.name || 'a resident'}`)
      handleRefresh(data)
    }

    const handleBookingCancelled = (data) => {
      toast.error(`Booking cancelled by ${data.cancelledBy?.name || 'a resident'}`)
      handleRefresh(data)
    }

    const handleBookingCheckedIn = (data) => {
      toast.success(`Resident checked in: ${data.userId?.name || 'Unknown'}`)
      handleRefresh(data)
    }

    const handlePaymentSuccess = (data) => {
      handleRefresh(data)
    }

    socket.on('amenity_booking_created', handleBookingCreated)
    socket.on('amenity_booking_cancelled', handleBookingCancelled)
    socket.on('amenity_booking_checked_in', handleBookingCheckedIn)
    socket.on('amenity_booking_completed', handleRefresh)
    // Admin copies are sent as AMENITY_* to the admin role room
    socket.on('AMENITY_BOOKING_CREATED', handleRefresh)
    socket.on('AMENITY_BOOKING_CANCELLED', handleRefresh)
    socket.on('AMENITY_CHECKIN', handleBookingCheckedIn)
    socket.on('bookingUpdated', handleRefresh)
    socket.on('bookingCompleted', handleRefresh)
    socket.on('payment_success', handlePaymentSuccess)
    socket.on('PAYMENT_SUCCESS', handlePaymentSuccess)

    return () => {
      socket.off('amenity_booking_created', handleBookingCreated)
      socket.off('amenity_booking_cancelled', handleBookingCancelled)
      socket.off('amenity_booking_checked_in', handleBookingCheckedIn)
      socket.off('amenity_booking_completed', handleRefresh)
      socket.off('AMENITY_BOOKING_CREATED', handleRefresh)
      socket.off('AMENITY_BOOKING_CANCELLED', handleRefresh)
      socket.off('AMENITY_CHECKIN', handleBookingCheckedIn)
      socket.off('bookingUpdated', handleRefresh)
      socket.off('bookingCompleted', handleRefresh)
      socket.off('payment_success', handlePaymentSuccess)
      socket.off('PAYMENT_SUCCESS', handlePaymentSuccess)
      socket.disconnect()
    }
  }, [userId, orgId, token])

  return null
}

export default useAdminBookingSocket

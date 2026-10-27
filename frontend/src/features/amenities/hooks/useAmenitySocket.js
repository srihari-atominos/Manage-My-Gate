import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import { getAmenities } from '../store/amenitySlice.js'
import { bookingConfirmed } from '../store/amenityBookingSlice.js'
import config from '../../../config/config.js'

/**
 * Custom hook to manage the real-time Socket.io connection for Amenities
 * Listens for amenity and booking changes to dispatch Redux updates.
 */
export const useAmenitySocket = (params = {}, onUpdate) => {
  const dispatch = useDispatch()
  const { user, token } = useSelector((state) => state.auth || {})

  const paramsRef = useRef(params)
  useEffect(() => {
    paramsRef.current = params
  }, [params])

  // Depend on primitives: the `user` object changes identity on any profile/permission update, which
  // would tear down and rebuild the socket (and miss events in between).
  const userId = user?._id || user?.id
  const orgId = user?.orgId

  useEffect(() => {
    // Only connect if user is authenticated
    if (!userId || !token) return

    // Resolve socket URL from environment configuration with backend fallback
    const socketUrl = config.socketUrl

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      withCredentials: true,
    })

    let connectedBefore = false
    socket.on('connect', () => {
      // Join tenant/workspace room if necessary (e.g. orgId)
      if (orgId) {
        socket.emit('join_room', `org:${orgId}`)
      }
      // Join user's personal private room for direct booking updates
      socket.emit('join_room', `user:${userId}`)
      // Events missed while disconnected are not replayed: reload after a reconnect
      if (connectedBefore) dispatch(getAmenities(paramsRef.current))
      connectedBefore = true
    })

    const handleUpdate = () => {
      // Dispatch action to refresh global amenities list
      dispatch(getAmenities(paramsRef.current))
    }

    const handleBookingConfirmed = (booking) => {
      dispatch(bookingConfirmed(booking))
      toast.success(`Booking for ${booking.amenityId?.name || 'Amenity'} is confirmed!`)
    }

    // Amenity Events (names emitted by backend amenity.socket.js)
    socket.on('AMENITY_CREATED', handleUpdate)
    socket.on('AMENITY_UPDATED', handleUpdate)
    socket.on('AMENITY_DELETED', handleUpdate)
    socket.on('amenity:created', handleUpdate)
    socket.on('amenity:updated', handleUpdate)
    socket.on('amenity:deleted', handleUpdate)

    // Booking Events that could affect availability
    socket.on('AMENITY_BOOKING_CREATED', handleUpdate)
    socket.on('AMENITY_BOOKING_CANCELLED', handleUpdate)
    socket.on('AMENITY_CHECKIN', handleUpdate)
    socket.on('amenity_booking_created', handleUpdate)
    socket.on('amenity_booking_cancelled', handleUpdate)
    socket.on('amenity_booking_checked_in', handleUpdate)
    socket.on('bookingUpdated', handleUpdate)
    socket.on('booking:created', handleUpdate)
    socket.on('booking:updated', handleUpdate)
    socket.on('booking:status_updated', handleUpdate)
    socket.on('booking:cancelled', handleUpdate)
    socket.on('AMENITY_BOOKING_CONFIRMED', handleBookingConfirmed)

    return () => {
      socket.off('AMENITY_CREATED', handleUpdate)
      socket.off('AMENITY_UPDATED', handleUpdate)
      socket.off('AMENITY_DELETED', handleUpdate)
      socket.off('AMENITY_BOOKING_CREATED', handleUpdate)
      socket.off('AMENITY_BOOKING_CANCELLED', handleUpdate)
      socket.off('AMENITY_CHECKIN', handleUpdate)
      socket.off('amenity:created', handleUpdate)
      socket.off('amenity:updated', handleUpdate)
      socket.off('amenity:deleted', handleUpdate)
      socket.off('amenity_booking_created', handleUpdate)
      socket.off('amenity_booking_cancelled', handleUpdate)
      socket.off('amenity_booking_checked_in', handleUpdate)
      socket.off('bookingUpdated', handleUpdate)
      socket.off('booking:created', handleUpdate)
      socket.off('booking:updated', handleUpdate)
      socket.off('booking:status_updated', handleUpdate)
      socket.off('booking:cancelled', handleUpdate)
      socket.off('AMENITY_BOOKING_CONFIRMED', handleBookingConfirmed)
      socket.disconnect()
    }
  }, [dispatch, userId, orgId, token])

  return null
}

export default useAmenitySocket

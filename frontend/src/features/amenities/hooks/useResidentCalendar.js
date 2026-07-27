import { useState, useMemo, useCallback, useEffect } from 'react'
import { fetchMyBookings, cancelBooking } from '../services/amenityBookingApi.js'
import toast from 'react-hot-toast'

export const useResidentCalendar = () => {
  const [myBookings, setMyBookings] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const [viewMode, setViewMode] = useState('month')
  const [currentDate, setCurrentDate] = useState(new Date())

  const loadEvents = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Calculate month boundaries (fetch a slightly wider window to cover grid overlap)
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const start = new Date(year, month, -6)
      const end = new Date(year, month + 1, 7)

      const startDate = start.toISOString().split('T')[0]
      const endDate = end.toISOString().split('T')[0]

      const response = await fetchMyBookings({ startDate, endDate })
      setMyBookings(response.data || [])
    } catch (err) {
      setError(err.message || 'Failed to load bookings')
      toast.error('Failed to load bookings')
    } finally {
      setIsLoading(false)
    }
  }, [currentDate])

  const rawEvents = useMemo(() => {
    if (!myBookings) return []

    // Sort bookings by latest first (descending date/createdAt)
    const sortedBookings = [...myBookings].sort((a, b) => {
      return new Date(b.createdAt || b.bookingDate) - new Date(a.createdAt || a.bookingDate)
    })

    return sortedBookings.map((booking) => {
      // Repository uses .populate('amenityId') which keeps the field name amenityId
      const amenity = booking.amenity || booking.amenityId || {}
      return {
        id: booking._id,
        bookingId: booking.bookingId || booking._id,
        type: 'booking',
        title: `${amenity?.name || 'Unknown Amenity'} Booking`,
        subtitle: `${booking.startTime} - ${booking.endTime}`,
        amenityId: amenity?._id,
        amenityName: amenity?.name || 'Unknown',
        image: amenity?.images?.[0] || amenity?.imageUrl || 'https://via.placeholder.com/400x200',
        date: booking.bookingDate,
        start: booking.startTime,
        end: booking.endTime,
        duration: booking.pricingDetails?.duration || booking.duration || 1,
        status: booking.status || 'pending',
        paymentStatus: booking.paymentStatus || 'pending',
        checkInStatus: booking.status === 'checked-in' ? 'checked-in' : 'pending',
        colorKey: booking.status || 'pending',
        price: booking.pricingDetails?.totalAmount || booking.totalPrice || 0,
        qrCode: booking.qrCode || null,
        metadata: booking,
      }
    })
  }, [myBookings])

  // Upcoming Bookings Logic
  const upcomingEvents = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return rawEvents
      .filter(
        (event) =>
          new Date(event.date) >= today &&
          event.status !== 'cancelled' &&
          event.status !== 'rejected',
      )
      .sort((a, b) => new Date(`${a.date}T${a.start}`) - new Date(`${b.date}T${b.start}`))
  }, [rawEvents])

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate)
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + direction)
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + direction * 7)
    } else {
      newDate.setDate(newDate.getDate() + direction)
    }
    setCurrentDate(newDate)
  }

  const setToday = () => setCurrentDate(new Date())

  const cancelBookingHook = useCallback(
    async (eventId) => {
      try {
        await cancelBooking(eventId)
        toast.success('Booking cancelled successfully')
        loadEvents() // refresh
      } catch (err) {
        toast.error(err.message || 'Failed to cancel booking')
      }
    },
    [loadEvents],
  )

  return {
    rawEvents,
    upcomingEvents,
    loading: isLoading,
    error,
    viewMode,
    setViewMode,
    currentDate,
    navigateDate,
    setToday,
    loadEvents,
    cancelBooking: cancelBookingHook,
  }
}

export default useResidentCalendar

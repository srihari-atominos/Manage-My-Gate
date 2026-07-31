import { useState, useMemo, useCallback, useEffect } from 'react'
import dashboardApi from '../services/dashboardApi.js'
import toast from 'react-hot-toast'

export const useAdminCalendar = () => {
  const [bookingQueue, setBookingQueue] = useState([])
  const [isQueueLoading, setIsQueueLoading] = useState(false)
  const [error, setError] = useState(null)

  // Dashboard Analytics Data
  const [dashboardData, setDashboardData] = useState(null)

  // View & Date State
  const [viewMode, setViewMode] = useState('month') // 'month' | 'week' | 'day'
  const [currentDate, setCurrentDate] = useState(new Date())

  // Filters State
  const [filters, setFilters] = useState({
    amenityId: '',
    status: '',
    residentId: '',
    search: '',
    paymentStatus: '',
  })

  const loadEvents = useCallback(async () => {
    setIsQueueLoading(true)
    setError(null)
    try {
      let startDate, endDate

      const curr = new Date(currentDate)

      const formatDate = (dateObj) => {
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`
      }

      if (viewMode === 'month') {
        const year = curr.getFullYear()
        const month = curr.getMonth()
        // start of month
        const start = new Date(year, month, 1)
        // end of month
        const end = new Date(year, month + 1, 0)
        startDate = formatDate(start)
        endDate = formatDate(end)
      } else if (viewMode === 'week') {
        const day = curr.getDay()
        const start = new Date(curr)
        start.setDate(curr.getDate() - day)
        const end = new Date(start)
        end.setDate(start.getDate() + 6)
        startDate = formatDate(start)
        endDate = formatDate(end)
      } else {
        // Day view
        startDate = formatDate(curr)
        endDate = startDate
      }

      // Fetch Events
      const response = await dashboardApi.getCalendarEvents(startDate, endDate)
      setBookingQueue(response.data || [])

      // Fetch KPIs
      try {
        const dashResponse = await dashboardApi.getDashboardData()
        setDashboardData(dashResponse.data)
      } catch (e) {
        console.error('Failed to load dashboard KPIs', e)
      }
    } catch (err) {
      setError(err.message || 'Failed to load calendar events')
      toast.error('Failed to load calendar events')
    } finally {
      setIsQueueLoading(false)
    }
  }, [currentDate, viewMode])

  // Transform Raw API response to Unified Event Interface
  const rawEvents = useMemo(() => {
    if (!bookingQueue) return []

    return bookingQueue.map((event) => ({
      ...event,
      title: event.status === 'cancelled' ? `${event.title} (Cancelled)` : event.title,
      subtitle: event.subtitle,
      colorKey:
        event.type === 'maintenance'
          ? 'rejected'
          : event.type === 'operating_hours'
            ? 'default'
            : event.type === 'holiday'
              ? 'checked_in'
              : event.status,
      metadata: event,
    }))
  }, [bookingQueue])

  // Apply filters
  const filteredEvents = useMemo(() => {
    const validEvents = rawEvents.filter((event) => {
      if (event.status === 'cancelled') return false // Hide cancelled events
      if (filters.amenityId && event.amenityId !== filters.amenityId) return false
      if (filters.status && event.status !== filters.status) return false
      if (filters.paymentStatus && event.paymentStatus !== filters.paymentStatus) return false
      if (filters.search) {
        const query = filters.search.toLowerCase()
        const matchTitle = (event.title || '').toLowerCase().includes(query)
        const matchSubtitle = (event.subtitle || '').toLowerCase().includes(query)
        const matchResident = (event.residentName || '').toLowerCase().includes(query)
        const matchFlat = (event.flatNumber || '').toLowerCase().includes(query)
        if (!matchTitle && !matchSubtitle && !matchResident && !matchFlat) return false
      }
      return true
    })

    if (viewMode === 'month') return validEvents

    // Group overlapping events for day/week view
    const groups = {}
    validEvents.forEach((e) => {
      const key = `${e.amenityId}-${e.date}-${e.start}-${e.end}`
      const persons = e.metadata?.numberOfPersons || 1

      if (!groups[key]) {
        groups[key] = { ...e, isGroup: true, subEvents: [e], totalPersons: persons }
      } else {
        groups[key].subEvents.push(e)
        groups[key].totalPersons += persons
      }

      const count = groups[key].subEvents.length
      const amenityTitle = e.amenityName || (e.title && e.title.split('(')[0].trim()) || 'Booking'
      groups[key].title = `${amenityTitle} (${groups[key].totalPersons} Users)`
      groups[key].subtitle = count > 1 ? `${count} Bookings` : e.subtitle
    })

    return Object.values(groups)
  }, [rawEvents, filters, viewMode])

  const visibleEvents = filteredEvents

  // We can pass dashboardData to analytics. We'll map it in the component.
  const analytics = dashboardData || {
    bookingKpis: {},
    revenue: {},
    occupancy: {},
    amenityKpis: {},
  }

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

  const updateFilters = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }

  return {
    rawEvents,
    filteredEvents,
    visibleEvents,
    analytics,
    loading: isQueueLoading,
    error,
    viewMode,
    setViewMode,
    currentDate,
    setCurrentDate,
    navigateDate,
    setToday,
    filters,
    updateFilters,
    loadEvents,
  }
}

export default useAdminCalendar

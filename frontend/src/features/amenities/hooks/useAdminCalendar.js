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
    facilityId: '',
    amenityId: '',
    resourceId: '',
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
        // First day of month
        const firstOfMonth = new Date(year, month, 1)
        // Grid starts on Sunday of the first week
        const startOfGrid = new Date(firstOfMonth)
        startOfGrid.setDate(firstOfMonth.getDate() - firstOfMonth.getDay())

        // Last day of month
        const lastOfMonth = new Date(year, month + 1, 0)
        // Grid ends on Saturday of the last week
        const endOfGrid = new Date(lastOfMonth)
        endOfGrid.setDate(lastOfMonth.getDate() + (6 - lastOfMonth.getDay()))

        startDate = formatDate(startOfGrid)
        endDate = formatDate(endOfGrid)
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

      // Prepare API filters
      const apiFilters = {}
      const targetFacilityId = filters.facilityId || filters.amenityId
      if (targetFacilityId && targetFacilityId !== 'All') apiFilters.facilityId = targetFacilityId
      if (filters.resourceId && filters.resourceId !== 'All')
        apiFilters.resourceId = filters.resourceId
      if (filters.status && filters.status !== 'All') apiFilters.status = filters.status
      if (filters.paymentStatus && filters.paymentStatus !== 'All')
        apiFilters.paymentStatus = filters.paymentStatus
      if (filters.search?.trim()) apiFilters.search = filters.search.trim()

      // Fetch Events
      const response = await dashboardApi.getCalendarEvents(startDate, endDate, apiFilters)
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
  }, [currentDate, viewMode, filters])

  // Transform Raw API response to Unified Event Interface
  const rawEvents = useMemo(() => {
    if (!bookingQueue) return []

    return bookingQueue.map((event) => {
      const isCancelled = String(event.status).toUpperCase() === 'CANCELLED'
      return {
        ...event,
        title: isCancelled ? `${event.title} (Cancelled)` : event.title,
        subtitle: event.subtitle,
        colorKey:
          event.type === 'maintenance'
            ? 'maintenance'
            : isCancelled
              ? 'cancelled'
              : String(event.status).toLowerCase(),
        metadata: event,
      }
    })
  }, [bookingQueue])

  // Apply filters client-side for responsive updates
  const filteredEvents = useMemo(() => {
    const validEvents = rawEvents.filter((event) => {
      const targetFacilityId = filters.facilityId || filters.amenityId
      if (targetFacilityId && targetFacilityId !== 'All') {
        const eventFacilityId = String(event.amenityId || '')
        if (eventFacilityId !== targetFacilityId) return false
      }
      if (filters.resourceId && filters.resourceId !== 'All') {
        const eventResourceId = String(event.resourceId || '')
        if (eventResourceId !== filters.resourceId) return false
      }
      if (filters.status && filters.status !== 'All') {
        const eventStatus = String(event.status || '').toUpperCase()
        if (eventStatus !== filters.status.toUpperCase()) return false
      }
      if (filters.paymentStatus && filters.paymentStatus !== 'All') {
        const eventPayment = String(event.paymentStatus || '').toUpperCase()
        if (eventPayment !== filters.paymentStatus.toUpperCase()) return false
      }
      if (filters.search?.trim()) {
        const query = filters.search.toLowerCase().trim()
        const matchTitle = (event.title || '').toLowerCase().includes(query)
        const matchSubtitle = (event.subtitle || '').toLowerCase().includes(query)
        const matchResident = (event.residentName || '').toLowerCase().includes(query)
        const matchFlat = (event.flatNumber || '').toLowerCase().includes(query)
        const matchBookingId = (event.bookingId || '').toLowerCase().includes(query)
        if (!matchTitle && !matchSubtitle && !matchResident && !matchFlat && !matchBookingId)
          return false
      }
      return true
    })

    if (viewMode === 'month') return validEvents

    // Group overlapping events for day/week view
    const groups = {}
    validEvents.forEach((e) => {
      if (e.type === 'maintenance') {
        const maintKey = e.id || `maint_${e.amenityId}_${e.date}_${e.start}`
        groups[maintKey] = { ...e }
        return
      }

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

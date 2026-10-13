import { useState, useCallback, useEffect } from 'react'
import { useSelector } from 'react-redux'
import config from '../../../config/config.js'
import { checkInBooking, fetchRecentScans } from '../services/amenityBookingApi.js'
import io from 'socket.io-client'

export const useSecurityScanner = () => {
  const { user } = useSelector((state) => state.auth || {})
  const [scanResult, setScanResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [scannerMode, setScannerMode] = useState('auto') // 'auto' | 'entry' | 'exit'
  const [lastToken, setLastToken] = useState(null)

  const processCheckOut = useCallback(async (tokenOrId, inspectionDetails = null) => {
    setLoading(true)
    setError(null)
    try {
      const response = await checkOutBooking(tokenOrId, inspectionDetails)
      const res = response?.reservation || response?.booking || {}
      const pass = response?.pass || {}
      setScanResult({
        success: true,
        isExit: true,
        booking: {
          ...res,
          bookingId: res.reservationNumber || res.bookingId || tokenOrId,
          isExit: true,
        },
        pass: {
          ...pass,
          isExit: true,
          checkOutTimestamp: pass.checkOutTimestamp || new Date(),
        },
        resident: {
          name: res.userName || res.residentName || 'Resident',
          unitNumber: res.unitNumber || 'N/A',
        },
        facility: {
          name: res.facilityName || 'Amenity',
        },
        message: 'Exit recorded successfully. Booking completed.',
      })
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to record exit check-out.'
      setScanResult({
        success: false,
        message: errorMsg,
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const processCheckIn = useCallback(async (tokenOrId) => {
    setLoading(true)
    setError(null)
    setLastToken(tokenOrId)

    if (scannerMode === 'exit') {
      return await processCheckOut(tokenOrId)
    }

    try {
      const response = await checkInBooking(tokenOrId)
      setScanResult({
        success: true,
        isExit: false,
        booking: response?.booking || response?.pass || response || { _id: tokenOrId },
        resident: response?.resident || null,
        facility: response?.facility || null,
        pass: response?.pass || null,
        guard: response?.guard || null,
        organisation: response?.organisation || null,
        message: response?.message || 'Check-in successful.',
      })
    } catch (err) {
      const errData = err.response?.data || {}
      const details = errData.details || errData.data || {}
      const errorCode = errData.code || details.code
      const isAlreadyCheckedIn =
        err.response?.status === 409 &&
        (errorCode === 'ALREADY_CHECKED_IN' ||
          errData.message?.toLowerCase().includes('already checked in'))

      if (isAlreadyCheckedIn) {
        // Visitor Management Pattern: user is inside, present Check-Out option
        setScanResult({
          success: false,
          canCheckOut: true,
          status: 'ALREADY_CHECKED_IN',
          token: tokenOrId,
          booking: {
            bookingId: details.reservationNumber || details.bookingId || tokenOrId,
            reservationNumber: details.reservationNumber || details.bookingId || tokenOrId,
            checkedInAt: details.checkedInAt,
          },
          resident: {
            name: details.residentName || 'Resident',
            unitNumber: details.unitNumber || 'N/A',
          },
          facility: {
            name: details.facilityName || 'Amenity',
          },
          message: errData.message || 'Pass has already been checked in. Record exit now?',
        })
      } else {
        const errorMsg = errData.message || err.message || 'Failed to check in.'
        setScanResult({
          success: false,
          message: errorMsg,
        })
      }
    } finally {
      setLoading(false)
    }
  }, [scannerMode, processCheckOut])

  const handleScan = useCallback(
    (data) => {
      if (!data) return

      // Simple debounce to prevent multiple rapid scans
      if (loading || scanResult) return

      let token = String(data).trim()

      // Handle legacy JSON payload if present
      if (token.startsWith('{') && token.endsWith('}')) {
        try {
          const payload = JSON.parse(token)
          token = payload.passToken || payload.rawToken || payload.bookingId || payload.id || token
        } catch {
          // keep token as is
        }
      }

      if (token) {
        processCheckIn(token)
      } else {
        setScanResult({
          success: false,
          message:
            'Unrecognized QR Code format. Please scan a valid GatedCommunity Resident Wallet pass.',
        })
      }
    },
    [loading, scanResult, processCheckIn],
  )

  const handleManualEntry = useCallback(
    (bookingId) => {
      if (!bookingId || bookingId.trim() === '') return
      processCheckIn(bookingId.trim())
    },
    [processCheckIn],
  )

  const handleConfirmCheckOut = useCallback(
    (tokenToCheckout) => {
      const targetToken = tokenToCheckout || scanResult?.token || lastToken
      if (targetToken) {
        processCheckOut(targetToken)
      }
    },
    [scanResult?.token, lastToken, processCheckOut],
  )

  const resetScanner = useCallback(() => {
    setScanResult(null)
    setError(null)
    setLastToken(null)
  }, [])

  const [recentScans, setRecentScans] = useState([])

  const loadRecentScans = useCallback(async () => {
    try {
      const data = await fetchRecentScans()
      console.log('Fetched recent scans:', data)
      setRecentScans(data || [])
    } catch (err) {
      console.error('Failed to fetch recent scans:', err)
    }
  }, [])

  // Fetch initially and set up socket listener for real-time updates
  useEffect(() => {
    loadRecentScans()

    const socketUrl = config.socketUrl
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    })

    // Join the organization room to receive broadcasts
    socket.on('connect', () => {
      const orgId = user?.orgId
      if (orgId) {
        socket.emit('join_room', `org:${orgId}`)
      }
    })

    socket.on('bookingUpdated', () => {
      loadRecentScans()
    })

    socket.on('bookingCompleted', () => {
      loadRecentScans()
    })

    return () => {
      socket.disconnect()
    }
  }, [loadRecentScans, user?.orgId])

  return {
    scanResult,
    loading,
    error,
    scannerMode,
    setScannerMode,
    recentScans,
    handleScan,
    handleManualEntry,
    handleConfirmCheckOut,
    resetScanner,
  }
}

export default useSecurityScanner

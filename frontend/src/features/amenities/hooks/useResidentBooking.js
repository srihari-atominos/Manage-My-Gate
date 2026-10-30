import { useState, useMemo, useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import config from '../../../config/config.js'
import { getAmenities, fetchAllAmenitySlots } from '../store/amenitySlice.js'
import { createBooking } from '../services/amenityBookingApi.js'
import { fetchMyWallet } from '../services/walletApi.js'
import useAmenityPayment from './useAmenityPayment.js'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import io from 'socket.io-client'

export const useResidentBooking = (initialAmenityId) => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { processPayment, loading: paymentGatewayLoading } = useAmenityPayment()

  // State Machine
  const [step, setStep] = useState('date') // 'date' | 'time' | 'submitting' | 'success' | 'failed'
  const [errorMsg, setErrorMsg] = useState('')
  const [paymentIntent, setPaymentIntent] = useState(null)
  const [walletBalance, setWalletBalance] = useState(0)
  const [walletLoading, setWalletLoading] = useState(false)

  const token = useSelector((state) => state.auth?.token)
  const user = useSelector((state) => state.auth?.user || {})

  // Single Source of Truth for Booking
  const [draft, setDraft] = useState({
    amenityId: initialAmenityId,
    bookingDate: '',
    startTime: '',
    endTime: '',
    duration: 0,
    price: 0,
    totalPrice: 0,
  })

  const { items, loading, allSlots, slotsLoading } = useSelector((state) => state.amenities)

  const amenity = useMemo(
    () => items.find((i) => i._id === initialAmenityId),
    [items, initialAmenityId],
  )

  const loadWallet = useCallback(async () => {
    try {
      setWalletLoading(true)
      const res = await fetchMyWallet()
      setWalletBalance(Number(res?.balance || 0))
    } catch (err) {
      console.warn('Failed to fetch wallet balance in useResidentBooking:', err)
    } finally {
      setWalletLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWallet()
  }, [loadWallet])

  useEffect(() => {
    if (!amenity && !loading) {
      dispatch(getAmenities())
    }
  }, [amenity, loading, dispatch])

  const updateDraft = useCallback((updates) => {
    setDraft((prev) => {
      const newDraft = { ...prev, ...updates }
      newDraft.totalPrice = (newDraft.price || 0) + (newDraft.deposit || 0)
      return newDraft
    })
    setErrorMsg('') // clear errors on edit
  }, [])

  const proceedToTime = () => {
    if (!draft.bookingDate) {
      setErrorMsg('Please select a date first.')
      return
    }

    if (amenity?.pricing?.pricingType === 'daily') {
      const baseRate = amenity.pricing?.baseRate || 0
      const deposit = amenity.pricing?.securityDeposit || 0
      updateDraft({
        startTime: amenity.bookingRules?.openTime,
        endTime: amenity.bookingRules?.closeTime,
        price: baseRate,
        deposit: deposit,
        baseAmount: baseRate,
      })
      setStep('time')
    } else {
      // Fetch slots when moving to time step
      dispatch(fetchAllAmenitySlots({ id: draft.amenityId, date: draft.bookingDate }))
      setStep('time')
    }
  }

  const goBack = () => {
    if (step === 'time') setStep('date')
    setErrorMsg('')
  }

  useEffect(() => {
    const socketUrl = config.socketUrl
    const socket = io(socketUrl, { auth: { token } })

    socket.on('connect', () => {
      const userId = user.id || user._id
      if (userId) socket.emit('join_room', `user:${userId}`)
    })

    const handleUpdate = () => {
      if (step === 'time' && draft.bookingDate) {
        dispatch(fetchAllAmenitySlots({ id: draft.amenityId, date: draft.bookingDate }))
      }
      loadWallet()
    }

    socket.on('bookingUpdated', handleUpdate)
    socket.on('paymentSuccess', handleUpdate)
    socket.on('walletUpdated', handleUpdate)

    return () => {
      socket.off('bookingUpdated', handleUpdate)
      socket.off('paymentSuccess', handleUpdate)
      socket.off('walletUpdated', handleUpdate)
      socket.disconnect()
    }
  }, [step, draft.bookingDate, draft.amenityId, dispatch, token, user, loadWallet])

  const confirmBooking = async (numberOfPersons = 1, paymentMethod = 'WALLET') => {
    setStep('submitting')
    setErrorMsg('')
    try {
      const payload = {
        amenityId: draft.amenityId,
        bookingDate: draft.bookingDate,
        startTime: draft.startTime,
        endTime: draft.endTime,
        numberOfPersons,
        paymentMethod: paymentMethod.toUpperCase(),
      }

      const response = await createBooking(payload)
      const intent = response?.data?.paymentIntent || response?.paymentIntent

      if (paymentMethod.toUpperCase() === 'ONLINE' && intent) {
        setPaymentIntent(intent)
        // Execute real Razorpay checkout
        await processPayment({
          paymentIntent: intent,
          onSuccess: () => {
            toast.success('Payment completed successfully.')
            toast.success('Booking confirmed!')
            loadWallet()
            setStep('success')
          },
          onFailure: (err) => {
            const failureMsg = err?.message || 'Payment cancelled or failed.'
            setErrorMsg(failureMsg)
            toast.error(failureMsg)
            setStep('time')
          },
        })
      } else {
        // Digital wallet debit or complimentary booking
        toast.success('Booking confirmed successfully.')
        if (paymentMethod.toUpperCase() === 'WALLET' && (draft.totalPrice || 0) > 0) {
          toast.success('Wallet debited successfully.')
        }
        loadWallet()
        setStep('success')
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || err.message || 'Failed to submit booking'
      setErrorMsg(errMsg)
      if (errMsg.includes('capacity') || errMsg.includes('already have a booking')) {
        toast.error('Slot already booked or unavailable.')
      } else {
        toast.error(errMsg)
      }
      setStep('time')
    }
  }

  const complete = () => {
    navigate('/resident/amenities/history')
  }

  return {
    amenity,
    loading,
    slotsLoading,
    availableSlots: allSlots,
    step,
    draft,
    errorMsg,
    paymentIntent,
    walletBalance,
    walletLoading,
    paymentGatewayLoading,
    loadWallet,
    updateDraft,
    proceedToTime,
    goBack,
    confirmBooking,
    complete,
  }
}

export default useResidentBooking

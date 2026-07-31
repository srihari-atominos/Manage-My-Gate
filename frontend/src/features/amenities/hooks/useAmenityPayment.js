import { useState, useCallback } from 'react'
import { useSelector } from 'react-redux'
import config from '../../../config/config.js'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { verifyRazorpaySignature } from '../services/paymentApi.js'

export const useAmenityPayment = () => {
  const { t } = useTranslation()
  const { user } = useSelector((state) => state.auth || {})
  const [loading, setLoading] = useState(false)

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true)
        return
      }
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  const processPayment = useCallback(
    async ({ paymentIntent, onSuccess, onFailure }) => {
      setLoading(true)
      try {
        const isMock = !config.razorpayKey || config.razorpayKey === 'rzp_test_mockkey'

        if (isMock) {
          // Wait 1.5 seconds to show the loading spinner "Connecting to payment gateway..."
          await new Promise((resolve) => setTimeout(resolve, 1500))

          // Show a browser confirm box to simulate the payment action
          const confirmPayment = window.confirm(
            t('payment.mock_confirm', `[Mock Mode] Confirm payment of ₹${paymentIntent.amount}?`),
          )
          if (confirmPayment) {
            // Simulate verification call
            const verifyPayload = {
              paymentId: paymentIntent.paymentId,
              orderId: paymentIntent.orderId,
              razorpayPaymentId: `pay_mock_${Date.now()}`,
              razorpaySignature: `sig_mock_${Date.now()}`,
              orgId: user?.orgId,
            }
            const verification = await verifyRazorpaySignature(verifyPayload)
            if (verification.success) {
              toast.success(t('payment.success', 'Payment successful!'))
              if (onSuccess) onSuccess(verification.data)
            } else {
              throw new Error(verification.message || 'Signature verification failed')
            }
          } else {
            setLoading(false)
            toast.error(t('payment.cancelled', 'Payment cancelled by user.'))
            if (onFailure) onFailure(new Error('Payment cancelled by user'))
          }
          return
        }

        // Real Razorpay Flow
        const isLoaded = await loadRazorpayScript()
        if (!isLoaded) {
          toast.error(t('payment.script_failed', 'Failed to load payment gateway SDK.'))
          setLoading(false)
          if (onFailure) onFailure(new Error('SDK load failure'))
          return
        }

        const options = {
          key: config.razorpayKey,
          amount: Math.round(paymentIntent.amount * 100), // in paise
          currency: paymentIntent.currency || 'INR',
          name: t('payment.org_name', 'Gated Community'),
          description: t('payment.booking_payment', 'Amenity Booking Payment'),
          order_id: paymentIntent.orderId,
          handler: async function (response) {
            try {
              setLoading(true)
              const verifyPayload = {
                paymentId: paymentIntent.paymentId,
                orderId: paymentIntent.orderId,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                orgId: user?.orgId,
              }
              const verification = await verifyRazorpaySignature(verifyPayload)
              if (verification.success) {
                toast.success(t('payment.success', 'Payment successful!'))
                if (onSuccess) onSuccess(verification.data)
              } else {
                throw new Error(verification.message || 'Signature verification failed')
              }
            } catch (err) {
              toast.error(err.message || t('payment.failed', 'Payment verification failed.'))
              if (onFailure) onFailure(err)
            } finally {
              setLoading(false)
            }
          },
          prefill: {
            name: user?.name || '',
            email: user?.email || '',
            contact: user?.phone || user?.contact || '',
          },
          theme: {
            color: '#3C4B64',
          },
          modal: {
            ondismiss: function () {
              setLoading(false)
              toast.error(t('payment.cancelled', 'Payment cancelled by user.'))
              if (onFailure) onFailure(new Error('Payment cancelled by user'))
            },
          },
        }

        const rzp = new window.Razorpay(options)
        rzp.open()
      } catch (error) {
        setLoading(false)
        toast.error(error.message || t('payment.error', 'An error occurred during payment setup.'))
        if (onFailure) onFailure(error)
      }
    },
    [user, t],
  )

  return {
    processPayment,
    loading,
  }
}

export default useAmenityPayment

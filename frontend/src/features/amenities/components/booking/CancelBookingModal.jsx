import React, { useState, useEffect } from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CFormSelect,
  CFormTextarea,
  CAlert,
} from '@coreui/react'

const CancelBookingModal = ({ visible, onClose, onConfirm, booking, isSubmitting }) => {
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [refundCalculation, setRefundCalculation] = useState({
    percentage: 100,
    amount: 0,
    showCalculation: false,
  })

  const QUICK_REASONS = [
    'Change of plans',
    'Booked by mistake',
    'Schedule conflict',
    'Emergency',
    'Personal reasons',
    'Other',
  ]

  useEffect(() => {
    if (visible && booking) {
      setReason('')
      setCustomReason('')
      calculateRefund(booking)
    }
  }, [visible, booking])

  const calculateRefund = (bookingDetails) => {
    let percentage = 100
    let amount = bookingDetails.totalPrice || bookingDetails.pricingDetails?.totalAmount || 0
    let showCalculation = false

    const amenityRules = bookingDetails.amenityRules || bookingDetails.amenityId?.bookingRules
    if (amenityRules?.isCancellationEnabled && amenityRules?.cancellationRefundRules) {
      showCalculation = true
      const rules = [...amenityRules.cancellationRefundRules].sort(
        (a, b) => b.cancelBeforeHours - a.cancelBeforeHours,
      )

      const startDateTime = new Date(
        `${bookingDetails.date || bookingDetails.bookingDate}T${bookingDetails.startTime}`,
      )
      const now = new Date()
      const remainingHours = (startDateTime - now) / (1000 * 60 * 60)

      const applicableRule = rules.find((rule) => remainingHours >= rule.cancelBeforeHours)
      if (applicableRule) {
        percentage = applicableRule.refundPercentage
      } else {
        percentage = 0
      }
      amount =
        ((bookingDetails.totalPrice || bookingDetails.pricingDetails?.totalAmount || 0) *
          percentage) /
        100
    }

    setRefundCalculation({ percentage, amount, showCalculation })
  }

  const handleConfirm = () => {
    const finalReason = reason === 'Other' ? customReason : reason
    onConfirm(booking._id, finalReason)
  }

  if (!booking) return null

  const bookingAmount = booking.totalPrice || booking.pricingDetails?.totalAmount || 0

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      alignment="center"
      backdrop="static"
      className="amenity-os-theme"
    >
      <CModalHeader closeButton>
        <CModalTitle className="fw-semibold fs-5">Cancel Booking</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div className="mb-4 bg-body-secondary p-3 rounded border">
          <h6 className="fw-semibold mb-2">Booking Details</h6>
          <div className="d-flex justify-content-between mb-1">
            <span className="text-muted">Amenity:</span>
            <span className="fw-medium">{booking.amenityName || booking.amenityId?.name}</span>
          </div>
          <div className="d-flex justify-content-between mb-1">
            <span className="text-muted">Date:</span>
            <span className="fw-medium">{booking.date || booking.bookingDate}</span>
          </div>
          <div className="d-flex justify-content-between mb-1">
            <span className="text-muted">Time:</span>
            <span className="fw-medium">
              {booking.startTime} - {booking.endTime}
            </span>
          </div>
          <div className="d-flex justify-content-between mt-2 pt-2 border-top">
            <span className="text-muted">Booking Amount:</span>
            <span className="fw-bold">₹{bookingAmount.toFixed(2)}</span>
          </div>
        </div>

        {refundCalculation.showCalculation ? (
          <div className="mb-4">
            <h6 className="fw-semibold mb-2">Estimated Refund</h6>
            <div
              className="p-3 rounded border"
              style={{
                backgroundColor: refundCalculation.percentage === 0 ? '#fff3cd' : '#d1e7dd',
                borderColor: refundCalculation.percentage === 0 ? '#ffecb5' : '#badbcc',
              }}
            >
              <div className="d-flex justify-content-between mb-1">
                <span style={{ color: refundCalculation.percentage === 0 ? '#664d03' : '#0f5132' }}>
                  Refund Percentage:
                </span>
                <span
                  className="fw-bold"
                  style={{ color: refundCalculation.percentage === 0 ? '#664d03' : '#0f5132' }}
                >
                  {refundCalculation.percentage}%
                </span>
              </div>
              <div className="d-flex justify-content-between">
                <span style={{ color: refundCalculation.percentage === 0 ? '#664d03' : '#0f5132' }}>
                  Estimated Refund:
                </span>
                <span
                  className="fw-bold"
                  style={{ color: refundCalculation.percentage === 0 ? '#664d03' : '#0f5132' }}
                >
                  ₹{refundCalculation.amount.toFixed(2)}
                </span>
              </div>
              {refundCalculation.percentage === 0 && (
                <div className="mt-2 small text-danger fw-medium">
                  <i className="fa-solid fa-triangle-exclamation me-1"></i>
                  Cancellation is outside the configured refund window. No refund will be issued.
                </div>
              )}
            </div>
            <div className="text-muted small mt-1 text-center">
              <i className="fa-solid fa-info-circle me-1"></i> Final refund amount will be
              calculated by the system.
            </div>
          </div>
        ) : (
          <CAlert color="info" className="mb-4 d-flex align-items-start">
            <i className="fa-solid fa-circle-info me-2 mt-1"></i>
            <div>
              Refunds are subject to the amenity's cancellation policy. The final refund amount will
              be calculated upon confirmation.
            </div>
          </CAlert>
        )}

        <div className="mb-3">
          <label className="form-label fw-medium">
            Reason for Cancellation <span className="text-danger">*</span>
          </label>
          <CFormSelect value={reason} onChange={(e) => setReason(e.target.value)} className="mb-2">
            <option value="" disabled>
              Select a reason...
            </option>
            {QUICK_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </CFormSelect>

          {reason === 'Other' && (
            <CFormTextarea
              placeholder="Please specify your custom reason..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={3}
              maxLength={200}
            />
          )}
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Close
        </CButton>
        <CButton
          color="danger"
          onClick={handleConfirm}
          disabled={isSubmitting || !reason || (reason === 'Other' && !customReason.trim())}
        >
          {isSubmitting ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              ></span>{' '}
              Cancelling...
            </>
          ) : (
            'Confirm Cancellation'
          )}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default CancelBookingModal

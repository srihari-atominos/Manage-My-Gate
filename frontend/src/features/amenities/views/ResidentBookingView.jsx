import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import useResidentBooking from '../hooks/useResidentBooking.js'
import BookingStepper from '../components/booking/BookingStepper.jsx'
import DateSelector from '../components/booking/DateSelector.jsx'
import TimeSlotSelector from '../components/booking/TimeSlotSelector.jsx'
import BookingSummary from '../components/booking/BookingSummary.jsx'
import BookingConfirmationModal from '../components/booking/BookingConfirmationModal.jsx'
import BookingSuccess from '../components/booking/BookingSuccess.jsx'
import WalletRechargeModal from '../components/wallet/WalletRechargeModal.jsx'
import AmenitiesTopNav from '../components/AmenitiesTopNav.jsx'
import '../styles/_amenities.scss'
import AppLoader from '../../../components/common/AppLoader'

const ResidentBookingView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [confirmationVisible, setConfirmationVisible] = useState(false)
  const [showTopUpModal, setShowTopUpModal] = useState(false)

  const user = useSelector((state) => state.auth?.user)

  const {
    amenity,
    loading,
    slotsLoading,
    availableSlots,
    step,
    draft,
    errorMsg,
    walletBalance,
    paymentGatewayLoading,
    loadWallet,
    updateDraft,
    proceedToTime,
    goBack,
    confirmBooking,
    complete,
  } = useResidentBooking(id)

  if (loading && !amenity) {
    return (
      <div className="d-flex justify-content-center p-5">
        <AppLoader variant="block" />
      </div>
    )
  }

  if (!amenity && !loading) {
    return (
      <div
        className="amenities-module-wrapper amenity-os-theme"
        style={{ textAlign: 'center', padding: '64px' }}
      >
        <h4 style={{ color: 'var(--text-muted)' }}>Amenity not found</h4>
        <button
          className="btn btn-outline"
          style={{ marginTop: '16px' }}
          onClick={() => navigate('/resident/amenities/discover')}
        >
          Back to Discover
        </button>
      </div>
    )
  }

  const handleFinalConfirm = async (numberOfPersons = 1, paymentMethod = 'WALLET') => {
    await confirmBooking(numberOfPersons, paymentMethod)
    setConfirmationVisible(false)
  }

  const handleTopUpSuccess = () => {
    setShowTopUpModal(false)
    loadWallet()
  }

  return (
    <div className="amenities-module-wrapper amenity-os-theme">
      <AmenitiesTopNav />
      <div className="view-container" style={{ maxWidth: '850px', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px' }}>
          <button
            className="btn btn-outline"
            style={{
              border: 'none',
              background: 'transparent',
              padding: '0',
              color: 'var(--text-muted)',
            }}
            onClick={() => navigate('/resident/amenities/discover')}
          >
            <i className="fa-solid fa-arrow-left" style={{ marginRight: '8px' }}></i> Back to
            Amenities
          </button>
        </div>

        {/* Amenity Hero Header Card - Mobile Responsive */}
        <div className="card mb-4">
          <div className="d-flex flex-column flex-sm-row align-items-center align-items-sm-start gap-3 gap-sm-4 text-center text-sm-start">
            <img
              src={amenity.images?.[0] || 'https://via.placeholder.com/150'}
              alt={amenity.name}
              style={{ width: '84px', height: '84px', objectFit: 'cover', borderRadius: '14px' }}
              className="shadow-sm border"
            />
            <div className="flex-grow-1">
              <h4 style={{ marginBottom: '4px' }} className="fs-3 fw-bold">
                {amenity.name}
              </h4>
              <div
                style={{
                  color: 'var(--text-muted)',
                  display: 'flex',
                  gap: '16px',
                  flexWrap: 'wrap',
                  marginTop: '8px',
                }}
                className="small justify-content-center justify-content-sm-start"
              >
                <span>
                  <i className="fa-solid fa-location-dot" style={{ marginRight: '6px' }}></i>{' '}
                  {amenity.location}
                </span>
                {amenity.bookingRules && amenity.bookingRules.openTime && (
                  <span>
                    <i className="fa-solid fa-clock" style={{ marginRight: '6px' }}></i>{' '}
                    {amenity.bookingRules.openTime} - {amenity.bookingRules.closeTime}
                  </span>
                )}
                {amenity.pricing && amenity.pricing.baseRate !== undefined && (
                  <span>
                    <i className="fa-solid fa-tag" style={{ marginRight: '6px' }}></i> ₹
                    {amenity.pricing.baseRate} / {amenity.pricing.pricingType || 'hour'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {step !== 'success' && <BookingStepper currentStep={step} />}

        {errorMsg && (
          <div className="alert alert-danger d-flex align-items-center gap-2 mb-4 rounded-3 shadow-sm">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <div>{errorMsg}</div>
          </div>
        )}

        {step === 'date' && (
          <DateSelector
            draft={draft}
            updateDraft={updateDraft}
            onNext={proceedToTime}
            errorMsg={errorMsg}
          />
        )}

        {step === 'time' && amenity?.pricing?.pricingType !== 'daily' && (
          <TimeSlotSelector
            draft={draft}
            availableSlots={availableSlots}
            slotsLoading={slotsLoading}
            updateDraft={updateDraft}
            onBack={goBack}
            errorMsg={errorMsg}
          />
        )}

        {step === 'time' && amenity?.pricing?.pricingType === 'daily' && (
          <div className="card p-4 mb-4">
            <h5 className="mb-3">Daily Booking Details</h5>
            <div className="alert alert-success d-flex flex-column gap-2 mb-0">
              <div className="d-flex align-items-center">
                <i className="fa-solid fa-clock me-2"></i>
                <strong>
                  Operating Hours: {amenity.bookingRules?.openTime} -{' '}
                  {amenity.bookingRules?.closeTime}
                </strong>
              </div>
              <div className="d-flex align-items-center">
                <i className="fa-solid fa-money-bill me-2"></i>
                <strong>Daily Price: ₹{amenity.pricing?.baseRate || 0}</strong>
              </div>
            </div>
            <div className="d-flex justify-content-start pt-3 border-top mt-4">
              <button className="btn btn-outline-secondary px-4 rounded-pill" onClick={goBack}>
                <i className="fa-solid fa-arrow-left me-2"></i> Back
              </button>
            </div>
          </div>
        )}

        {(step === 'time' || step === 'submitting') && draft.startTime && draft.endTime && (
          <BookingSummary
            amenity={amenity}
            draft={draft}
            onConfirm={() => setConfirmationVisible(true)}
          />
        )}

        {step === 'success' && (
          <BookingSuccess amenity={amenity} draft={draft} onComplete={complete} />
        )}

        {/* Confirmation Modal with Payment Method Selector */}
        <BookingConfirmationModal
          visible={confirmationVisible}
          onClose={() => setConfirmationVisible(false)}
          onConfirm={handleFinalConfirm}
          isSubmitting={step === 'submitting' || paymentGatewayLoading}
          draft={draft}
          amenity={amenity}
          walletBalance={walletBalance}
          onTopUpClick={() => setShowTopUpModal(true)}
        />

        {/* In-Flow Wallet Recharge Modal */}
        <WalletRechargeModal
          isOpen={showTopUpModal}
          onClose={() => setShowTopUpModal(false)}
          walletBalance={walletBalance}
          isPaymentGatewayConfigured={true}
          onSuccess={handleTopUpSuccess}
          user={user}
        />
      </div>
    </div>
  )
}

export default ResidentBookingView

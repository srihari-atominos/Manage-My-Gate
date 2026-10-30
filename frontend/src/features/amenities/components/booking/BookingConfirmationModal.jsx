import React, { memo, useState, useEffect } from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CFormCheck,
  CAlert,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilWallet, cilCreditCard } from '@coreui/icons'
import { useTranslation } from 'react-i18next'
import { formatCurrency } from '../../utils/amenityUtils.js'
import AppLoader from '../../../../components/common/AppLoader'

const BookingConfirmationModal = memo(
  ({
    visible,
    onClose,
    onConfirm,
    isSubmitting,
    draft,
    amenity,
    walletBalance = 0,
    onTopUpClick,
  }) => {
    const { t } = useTranslation()
    const [numberOfPersons, setNumberOfPersons] = useState(1)
    const [paymentMethod, setPaymentMethod] = useState('WALLET')

    const maxSpots = amenity?.maxBookingsPerUserPerSlot || 2
    const myCount = draft?.myBookingsCount || 0
    const maxAllowed = Math.max(1, maxSpots - myCount)

    useEffect(() => {
      if (visible) {
        setNumberOfPersons(1)
        // Default to ONLINE if wallet balance is 0 and payment is required
        setPaymentMethod('WALLET')
      }
    }, [visible])

    const isDaily = amenity?.pricing?.pricingType === 'daily'
    const baseAmount = isDaily
      ? amenity?.pricing?.baseRate || 0
      : draft?.baseAmount || draft?.price || 0
    const tax = draft?.tax || 0
    const deposit = isDaily ? amenity?.pricing?.securityDeposit || 0 : draft?.deposit || 0

    const totalBase = baseAmount * (isDaily ? 1 : numberOfPersons)
    const totalTax = tax * (isDaily ? 1 : numberOfPersons)
    const finalTotal = totalBase + totalTax + deposit

    const isFree = finalTotal <= 0
    const isWalletShort = !isFree && paymentMethod === 'WALLET' && walletBalance < finalTotal

    const handleConfirmClick = () => {
      const selectedMethod = isFree ? 'WALLET' : paymentMethod
      onConfirm(numberOfPersons, selectedMethod)
    }

    return (
      <CModal
        visible={visible}
        onClose={isSubmitting ? undefined : onClose}
        backdrop="static"
        alignment="center"
        size="lg"
        className="booking-confirmation-modal"
      >
        <CModalHeader closeButton={!isSubmitting}>
          <CModalTitle className="fw-bold">
            {t('amenity_booking.confirm_title', 'Confirm Booking')}
          </CModalTitle>
        </CModalHeader>

        <CModalBody className="p-3 p-sm-4">
          {isSubmitting ? (
            <div className="text-center py-4">
              <AppLoader variant="block" />
              <p className="mb-0 text-muted">
                {t('amenity_booking.securing_slot', 'Securing your slot...')}
              </p>
            </div>
          ) : (
            <div>
              {/* Amenity Overview */}
              <div className="p-3 mb-3 rounded bg-body-secondary border">
                <h5 className="fw-bold mb-1 text-primary">{amenity?.name}</h5>
                <div className="d-flex flex-wrap gap-3 text-muted small mt-2">
                  <span>
                    <i className="fa-regular fa-calendar me-1"></i>
                    <strong>{t('amenity_booking.date', 'Date')}:</strong> {draft?.bookingDate}
                  </span>
                  <span>
                    <i className="fa-regular fa-clock me-1"></i>
                    <strong>{t('amenity_booking.time', 'Time')}:</strong> {draft?.startTime} -{' '}
                    {draft?.endTime}{' '}
                    {isDaily
                      ? `(${t('amenity_booking.full_day', 'Full Day')})`
                      : `(${draft?.duration || 60} ${t('amenity_booking.mins', 'min')})`}
                  </span>
                </div>
              </div>

              {/* Number of Persons Selector */}
              {!isDaily && (
                <div className="mb-3 p-3 border rounded bg-body">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <span className="fw-semibold">
                        {t('amenity_booking.number_of_persons', 'Number of Persons')}
                      </span>
                      <div className="text-muted small">
                        {t('amenity_booking.max_allowed', 'Max spots available per slot')}: {maxAllowed}
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <CButton
                        color="secondary"
                        variant="outline"
                        size="sm"
                        disabled={numberOfPersons <= 1}
                        onClick={() => setNumberOfPersons((p) => Math.max(1, p - 1))}
                      >
                        -
                      </CButton>
                      <span className="fw-bold px-2 fs-5">{numberOfPersons}</span>
                      <CButton
                        color="secondary"
                        variant="outline"
                        size="sm"
                        disabled={numberOfPersons >= maxAllowed}
                        onClick={() => setNumberOfPersons((p) => Math.min(maxAllowed, p + 1))}
                      >
                        +
                      </CButton>
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing Breakdown Card */}
              <div className="p-3 mb-3 border rounded bg-body">
                <h6 className="fw-bold mb-2 small text-uppercase text-muted">
                  {t('amenity_booking.pricing_breakdown', 'Pricing Breakdown')}
                </h6>
                <div className="d-flex justify-content-between py-1 small">
                  <span className="text-muted">
                    {t('amenity_booking.base_amount', 'Base Amount')}{' '}
                    {!isDaily && numberOfPersons > 1 ? `(${numberOfPersons}x)` : ''}
                  </span>
                  <span className="fw-semibold">{formatCurrency(totalBase)}</span>
                </div>
                {totalTax > 0 && (
                  <div className="d-flex justify-content-between py-1 small">
                    <span className="text-muted">{t('amenity_booking.taxes', 'Taxes & Fees')}</span>
                    <span className="fw-semibold">{formatCurrency(totalTax)}</span>
                  </div>
                )}
                {deposit > 0 && (
                  <div className="d-flex justify-content-between py-1 small">
                    <span className="text-muted">
                      {t('amenity_booking.security_deposit', 'Security Deposit (Refundable)')}
                    </span>
                    <span className="fw-semibold">{formatCurrency(deposit)}</span>
                  </div>
                )}
                {amenity?.pricing?.securityDepositDescription && (
                  <p className="text-muted small mb-1 fst-italic" style={{ fontSize: '0.8rem' }}>
                    {amenity.pricing.securityDepositDescription}
                  </p>
                )}
                <hr className="my-2" />
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fw-bold">{t('amenity_booking.total_due', 'Total Due')}</span>
                  <h4 className="fw-bold text-success mb-0">{formatCurrency(finalTotal)}</h4>
                </div>
              </div>

              {/* Payment Method Selector (When Amount > 0) */}
              {!isFree ? (
                <div className="mb-3">
                  <h6 className="fw-bold mb-2 small text-uppercase text-muted">
                    {t('amenity_booking.select_payment_method', 'Select Payment Method')}
                  </h6>

                  <div className="d-flex flex-column gap-2">
                    {/* Option 1: Digital Wallet */}
                    <div
                      className={`p-3 border rounded cursor-pointer transition-all ${
                        paymentMethod === 'WALLET' ? 'border-primary bg-primary bg-opacity-10' : 'bg-body'
                      }`}
                      onClick={() => setPaymentMethod('WALLET')}
                    >
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-3">
                          <CFormCheck
                            type="radio"
                            name="bookingPaymentMethod"
                            id="method-booking-wallet"
                            checked={paymentMethod === 'WALLET'}
                            onChange={() => setPaymentMethod('WALLET')}
                          />
                          <div className="d-flex align-items-center gap-2">
                            <CIcon icon={cilWallet} size="lg" className="text-primary" />
                            <div>
                              <div className="fw-bold">
                                {t('wallet.title', 'Digital Wallet')}
                              </div>
                              <div className="small text-muted">
                                {t('wallet.balance', 'Available Balance')}:{' '}
                                <span className={walletBalance >= finalTotal ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                                  ₹{walletBalance.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          {walletBalance >= finalTotal ? (
                            <CBadge color="success" className="px-2 py-1">
                              {t('amenity_booking.sufficient_balance', 'Sufficient Balance')}
                            </CBadge>
                          ) : (
                            <CBadge color="danger" className="px-2 py-1">
                              {t('amenity_booking.low_balance', 'Low Balance')}
                            </CBadge>
                          )}
                        </div>
                      </div>

                      {/* Insufficient Wallet Warning & Inline Top-up Trigger */}
                      {paymentMethod === 'WALLET' && isWalletShort && (
                        <div className="mt-3 pt-2 border-top">
                          <CAlert color="danger" className="py-2 px-3 mb-2 small d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <span>
                              <i className="fa-solid fa-circle-exclamation me-1"></i>
                              {t(
                                'amenity_booking.insufficient_wallet_msg',
                                'Short by ₹{{amount}} for this booking.',
                                { amount: (finalTotal - walletBalance).toFixed(2) }
                              )}
                            </span>
                            {onTopUpClick && (
                              <CButton
                                color="primary"
                                size="sm"
                                className="fw-semibold text-nowrap"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onTopUpClick()
                                }}
                              >
                                <i className="fa-solid fa-plus me-1"></i>
                                {t('wallet.addMoney', 'Top Up Wallet')}
                              </CButton>
                            )}
                          </CAlert>
                          <div className="small text-muted">
                            {t(
                              'amenity_booking.or_pay_online_hint',
                              'Or switch to Online Payment below to pay instantly.'
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Option 2: Pay Online (Cards, UPI, Net Banking via Razorpay) */}
                    <div
                      className={`p-3 border rounded cursor-pointer transition-all ${
                        paymentMethod === 'ONLINE' ? 'border-primary bg-primary bg-opacity-10' : 'bg-body'
                      }`}
                      onClick={() => setPaymentMethod('ONLINE')}
                    >
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-3">
                          <CFormCheck
                            type="radio"
                            name="bookingPaymentMethod"
                            id="method-booking-online"
                            checked={paymentMethod === 'ONLINE'}
                            onChange={() => setPaymentMethod('ONLINE')}
                          />
                          <div className="d-flex align-items-center gap-2">
                            <CIcon icon={cilCreditCard} size="lg" className="text-primary" />
                            <div>
                              <div className="fw-bold">
                                {t('amenity_booking.pay_online_title', 'Pay Online (Razorpay)')}
                              </div>
                              <div className="small text-muted">
                                {t(
                                  'amenity_booking.pay_online_sub',
                                  'UPI (GPay / PhonePe / Paytm), Credit / Debit Cards, Net Banking'
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <CBadge color="info" className="px-2 py-1 text-white">
                          {t('amenity_booking.instant_gateway', 'Instant')}
                        </CBadge>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <CAlert color="success" className="py-2 px-3 mb-3 small d-flex align-items-center gap-2">
                  <i className="fa-solid fa-circle-check"></i>
                  <span>
                    {t('amenity_booking.free_facility_msg', 'This amenity is complimentary for community residents. No payment required.')}
                  </span>
                </CAlert>
              )}
            </div>
          )}
        </CModalBody>

        {!isSubmitting && (
          <CModalFooter className="d-flex flex-column-reverse flex-sm-row justify-content-sm-end gap-2 gap-sm-3 p-3">
            <CButton
              color="secondary"
              variant="outline"
              onClick={onClose}
              className="w-100 w-sm-auto px-4"
            >
              {t('common.cancel', 'Cancel')}
            </CButton>
            <CButton
              color="primary"
              onClick={handleConfirmClick}
              disabled={isWalletShort}
              className="w-100 w-sm-auto px-4 fw-semibold"
            >
              {isFree
                ? t('amenity_booking.confirm_free_btn', 'Confirm Free Booking')
                : paymentMethod === 'WALLET'
                  ? `${t('amenity_booking.pay_wallet_btn', 'Pay from Wallet')} (${formatCurrency(finalTotal)})`
                  : `${t('amenity_booking.pay_online_btn', 'Pay Online')} (${formatCurrency(finalTotal)})`}
            </CButton>
          </CModalFooter>
        )}
      </CModal>
    )
  },
)

export default BookingConfirmationModal

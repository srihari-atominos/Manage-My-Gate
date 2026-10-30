import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import useResidentWallet from '../hooks/useResidentWallet.js'
import QrPassCard from '../components/wallet/QrPassCard.jsx'
import WalletEmptyState from '../components/wallet/WalletEmptyState.jsx'
import { WalletLoading, WalletError } from '../components/wallet/WalletStates.jsx'
import TransactionHistory from '../components/wallet/TransactionHistory.jsx'
import CancelBookingModal from '../components/booking/CancelBookingModal.jsx'
import WalletRechargeModal from '../components/wallet/WalletRechargeModal.jsx'
import AmenitiesTopNav from '../components/AmenitiesTopNav.jsx'
import { CRow, CCol, CCard, CCardBody } from '@coreui/react'
import '../styles/_amenities.scss'

const ResidentWalletView = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const {
    activePasses,
    transactionHistory,
    balance,
    isPaymentGatewayConfigured,
    loading,
    error,
    loadWallet,
    cancelPass,
  } = useResidentWallet()
  const [showAddMoney, setShowAddMoney] = useState(false)

  const user = useSelector((state) => state.auth?.user)

  const [bookingToCancel, setBookingToCancel] = useState(null)
  const [isCancelling, setIsCancelling] = useState(false)

  useEffect(() => {
    loadWallet()
  }, [loadWallet])

  const handleCancelClick = (booking) => {
    setBookingToCancel(booking)
  }

  const handleConfirmCancel = async (bookingId, reason) => {
    setIsCancelling(true)
    const success = await cancelPass(bookingId, reason)
    setIsCancelling(false)
    if (success) {
      setBookingToCancel(null)
    }
  }

  const handleRechargeSuccess = () => {
    setShowAddMoney(false)
    loadWallet()
  }

  return (
    <div className="amenities-module-wrapper amenity-os-theme">
      <AmenitiesTopNav />
      <div className="view-container">
        {/* Wallet Hero Banner Card - Mobile Responsive */}
        <div className="wallet-hero-card mb-4 shadow-sm border">
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">
            <div>
              <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                <span className="badge bg-primary text-white px-2 py-1">
                  <i className="fa-solid fa-wallet me-1"></i>
                  {t('wallet.title', 'Digital Wallet')}
                </span>
                {(user?.unitNumber || user?.flatNumber) && (
                  <span className="badge bg-secondary text-white px-2 py-1">
                    <i className="fa-solid fa-door-open me-1"></i>
                    Unit {user?.unitNumber || user?.flatNumber}
                  </span>
                )}
              </div>
              <div className="text-muted small">
                {t('wallet.available_balance', 'Available Balance')}
              </div>
              <div className="wallet-balance-amount fw-bold text-success mt-1">
                ₹{Number(balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="w-100 w-sm-auto mt-2 mt-sm-0">
              <button
                className="btn btn-primary wallet-topup-btn w-100 w-sm-auto px-4 py-2 shadow-sm fw-semibold"
                onClick={() => setShowAddMoney(true)}
              >
                <i className="fa-solid fa-plus me-2"></i>
                {t('wallet.addMoney', 'Top Up Wallet')}
              </button>
            </div>
          </div>
        </div>

        {/* Active Passes Section */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="fs-5 fw-bold mb-0">
            {t('wallet.activePasses', 'Active Access Passes')}
          </h4>
          {activePasses.length > 0 && (
            <span className="badge bg-body-secondary text-dark border">
              {activePasses.length} {t('wallet.passes_count', 'active')}
            </span>
          )}
        </div>

        {loading && activePasses.length === 0 ? (
          <CCard className="mb-4 border-0 shadow-sm">
            <CCardBody>
              <WalletLoading />
            </CCardBody>
          </CCard>
        ) : error ? (
          <CCard className="mb-4 border-0 shadow-sm">
            <CCardBody>
              <WalletError message={error} />
            </CCardBody>
          </CCard>
        ) : activePasses.length === 0 ? (
          <CCard className="mb-4 border-0 shadow-sm">
            <CCardBody>
              <WalletEmptyState />
            </CCardBody>
          </CCard>
        ) : (
          <CRow className="g-3 g-sm-4 mb-4">
            {activePasses.map((pass) => (
              <CCol xs={12} sm={6} lg={4} key={pass._id}>
                <div className="wallet-pass-container h-100">
                  <QrPassCard booking={pass} onCancel={handleCancelClick} />
                </div>
              </CCol>
            ))}
          </CRow>
        )}

        {/* Transaction History Section */}
        <div className="mt-4 mb-3">
          <h4 className="fs-5 fw-bold mb-0">
            {t('wallet.transactionHistory', 'Transaction History')}
          </h4>
        </div>
        <TransactionHistory transactions={transactionHistory} loading={loading} />
      </div>

      <WalletRechargeModal
        isOpen={showAddMoney}
        onClose={() => setShowAddMoney(false)}
        walletBalance={balance}
        isPaymentGatewayConfigured={isPaymentGatewayConfigured}
        onSuccess={handleRechargeSuccess}
        user={user}
      />

      <CancelBookingModal
        visible={!!bookingToCancel}
        onClose={() => setBookingToCancel(null)}
        onConfirm={handleConfirmCancel}
        booking={bookingToCancel}
        isSubmitting={isCancelling}
      />
    </div>
  )
}

export default ResidentWalletView

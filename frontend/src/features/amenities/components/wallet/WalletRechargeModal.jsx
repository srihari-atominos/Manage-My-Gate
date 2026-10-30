import React, { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CButton,
  CFormCheck,
  CAlert,
  CInputGroup,
  CInputGroupText,
  CFormInput,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCreditCard, cilWallet } from '@coreui/icons'
import useWalletPayment from '../../hooks/useWalletPayment.js'
import AppLoader from '../../../../components/common/AppLoader'

export const WalletRechargeModal = memo(
  ({
    isOpen,
    onClose,
    walletBalance,
    isPaymentGatewayConfigured = true,
    onSuccess,
    onFailure,
    user,
  }) => {
    const { t } = useTranslation()
    const [amount, setAmount] = useState('1000')
    const [paymentMethod, setPaymentMethod] = useState('RAZORPAY')
    const { rechargeWallet, loading } = useWalletPayment()
    const isGatewayReady = isPaymentGatewayConfigured !== false

    const presetAmounts = [500, 1000, 2000, 5000]

    const handleCheckoutSubmit = async () => {
      if (!isGatewayReady) return
      const numericAmount = Number(amount)
      if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) return

      if (paymentMethod === 'RAZORPAY') {
        await rechargeWallet(numericAmount, onSuccess, onFailure)
      }
    }

    const displayAmount = Number(amount) || 0

    return (
      <CModal
        visible={isOpen}
        onClose={loading ? undefined : onClose}
        backdrop="static"
        alignment="center"
        size="md"
        className="wallet-recharge-modal"
      >
        <CModalHeader closeButton={!loading}>
          <CModalTitle className="fw-bold fs-5">
            <CIcon icon={cilWallet} className="me-2 text-primary" />
            {t('wallet.recharge.modalTitle', 'Top-Up Digital Wallet')}
          </CModalTitle>
        </CModalHeader>

        <CModalBody className="p-3 p-sm-4">
          {loading ? (
            <div className="text-center py-5">
              <AppLoader variant="block" />
              <p className="mb-0 text-muted mt-3">
                {t('wallet.recharge.processing', 'Connecting to payment gateway...')}
              </p>
            </div>
          ) : (
            <div>
              {!isGatewayReady && (
                <CAlert color="warning" className="mb-3 text-start small">
                  <strong>
                    {t('wallet.recharge.unavailableTitle', 'Online Recharge Unavailable:')}
                  </strong>{' '}
                  {t(
                    'wallet.recharge.unavailableDesc',
                    'The community administration has not connected an online payment gateway. Please contact management for manual or offline top-up.',
                  )}
                </CAlert>
              )}

              {/* Recharge Summary Card */}
              <div className="p-3 mb-3 rounded border bg-body-secondary text-start">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted small">
                    {t('wallet.recharge.targetLabel', 'Target Wallet')}
                  </span>
                  <span className="fw-bold text-primary">
                    {t('wallet.recharge.targetWallet', 'Personal Wallet')}
                  </span>
                </div>
                {(user?.unitNumber || user?.flatNumber) && (
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted small">
                      {t('wallet.recharge.unitLabel', 'Unit / Flat')}
                    </span>
                    <span className="fw-medium">{user.unitNumber || user.flatNumber}</span>
                  </div>
                )}
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted small">
                    {t('wallet.recharge.balanceLabel', 'Current Balance')}
                  </span>
                  <span className="fw-bold text-success">
                    ₹{Number(walletBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Preset Chips (Responsive 2x2 on Mobile) */}
              <div className="mb-3">
                <label className="form-label text-muted small mb-2 fw-semibold">
                  {t('wallet.recharge.quick_presets', 'Quick Select Amount')}
                </label>
                <div className="wallet-preset-grid">
                  {presetAmounts.map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      className={`wallet-preset-chip ${Number(amount) === preset ? 'active' : ''}`}
                      onClick={() => setAmount(preset.toString())}
                    >
                      + ₹{preset.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Input */}
              <div className="mb-3">
                <label className="form-label text-muted small mb-1 fw-semibold">
                  {t('wallet.recharge.amountLabel', 'Enter Amount (₹)')}
                </label>
                <CInputGroup>
                  <CInputGroupText className="bg-body border-end-0 fw-bold">₹</CInputGroupText>
                  <CFormInput
                    type="number"
                    min="10"
                    max="100000"
                    className="border-start-0 fs-5 fw-semibold"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </CInputGroup>
              </div>

              {/* Total Recharge Summary Line */}
              <div className="p-3 mb-3 border rounded bg-body d-flex justify-content-between align-items-center">
                <span className="fw-semibold">
                  {t('wallet.recharge.totalAmount', 'Total Top-Up')}
                </span>
                <h4 className="fw-bold text-success mb-0">
                  ₹{displayAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h4>
              </div>

              {/* Payment Method Selector */}
              <h6 className="fw-bold mb-2 small text-uppercase text-muted text-start">
                {t('wallet.recharge.selectMethodTitle', 'Payment Method')}
              </h6>

              {/* Razorpay Option */}
              <div
                className={`p-3 border rounded mb-4 cursor-pointer text-start transition-all ${
                  paymentMethod === 'RAZORPAY' ? 'border-primary bg-primary bg-opacity-10' : 'bg-body'
                }`}
                onClick={() => setPaymentMethod('RAZORPAY')}
              >
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-3">
                    <CFormCheck
                      type="radio"
                      name="paymentMethod"
                      id="method-razorpay"
                      checked={paymentMethod === 'RAZORPAY'}
                      onChange={() => setPaymentMethod('RAZORPAY')}
                    />
                    <div className="d-flex align-items-center gap-2">
                      <CIcon icon={cilCreditCard} size="lg" className="text-primary" />
                      <div>
                        <div className="fw-bold">
                          {t('wallet.recharge.razorpayTitle', 'Razorpay Online Gateway')}
                        </div>
                        <div className="text-muted small">
                          {t(
                            'wallet.recharge.razorpaySub',
                            'Instant top-up via UPI (GPay/PhonePe), Credit & Debit Cards, Net Banking',
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile-Responsive Stacked Footer Actions */}
              <div className="d-flex flex-column-reverse flex-sm-row justify-content-sm-end gap-2 gap-sm-3 pt-2">
                <CButton
                  color="secondary"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="w-100 w-sm-auto px-4"
                >
                  {t('wallet.recharge.cancelBtn', 'Cancel')}
                </CButton>
                <CButton
                  color="primary"
                  onClick={handleCheckoutSubmit}
                  disabled={loading || !isGatewayReady || !amount || Number(amount) <= 0}
                  className="w-100 w-sm-auto px-4 fw-semibold shadow-sm"
                >
                  {isGatewayReady
                    ? `${t('wallet.recharge.payBtn', 'Confirm & Pay')} ₹${displayAmount.toLocaleString('en-IN')}`
                    : t('wallet.recharge.gatewayNotConfigured', 'Gateway Not Configured')}
                </CButton>
              </div>
            </div>
          )}
        </CModalBody>
      </CModal>
    )
  },
)

export default WalletRechargeModal

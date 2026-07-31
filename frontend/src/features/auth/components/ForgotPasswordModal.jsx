import React, { useState, useEffect } from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CAlert,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilEnvelopeOpen, cilLockLocked } from '@coreui/icons'
import { useTranslation } from 'react-i18next'
import useAuth from '../hooks/useAuth.js'

export const ForgotPasswordModal = ({ visible, setVisible }) => {
  const { t } = useTranslation()
  const {
    sendPasswordResetOtp,
    verifyResetOtp,
    resetAccountPassword,
    loading,
    otpSent,
    error,
    successMsg,
    clearStatus,
  } = useAuth()

  const [step, setStep] = useState(0) // 0: identifier, 1: OTP, 2: New Password
  const [identifier, setIdentifier] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')

  // Watch for otpSent to progress to step 1
  useEffect(() => {
    if (otpSent && step === 0) {
      setStep(1)
    }
  }, [otpSent, step])

  const handleClose = () => {
    setVisible(false)
    clearStatus()
    setStep(0)
    setIdentifier('')
    setCode('')
    setNewPassword('')
    setConfirmPassword('')
    setLocalError('')
  }

  const handleSendOtp = async (e) => {
    e.preventDefault()
    if (!identifier) return
    await sendPasswordResetOtp(identifier)
  }

  const handleNextToPassword = async (e) => {
    e.preventDefault()
    setLocalError('')
    if (!code) {
      setLocalError('Please enter the OTP')
      return
    }
    if (code.length < 6) {
      setLocalError('OTP must be at least 6 characters')
      return
    }
    const res = await verifyResetOtp(identifier, code)
    if (res.meta.requestStatus === 'fulfilled') {
      setStep(2)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setLocalError('')
    if (!code || !newPassword || !confirmPassword) return
    if (newPassword !== confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }
    const res = await resetAccountPassword(identifier, code, newPassword)
    if (res.meta.requestStatus === 'fulfilled') {
      setTimeout(handleClose, 2000)
    }
  }

  return (
    <CModal visible={visible} onClose={handleClose} alignment="center">
      <CModalHeader>
        <CModalTitle>{t('auth.forgot.title', 'Reset Password')}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {(error || localError) && <CAlert color="danger">{localError || error}</CAlert>}
        {successMsg && <CAlert color="success">{successMsg}</CAlert>}

        {step === 0 && (
          <CForm onSubmit={handleSendOtp}>
            <p>
              {t(
                'auth.forgot.instruction',
                'Enter your email or phone number to receive a reset code.',
              )}
            </p>
            <CInputGroup className="mb-3">
              <CInputGroupText>
                <CIcon icon={cilEnvelopeOpen} />
              </CInputGroupText>
              <CFormInput
                placeholder={t('auth.forgot.identifier', 'Email or Phone')}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={loading}
                required
              />
            </CInputGroup>
            <div className="d-grid">
              <CButton type="submit" color="primary" disabled={loading || !identifier}>
                {loading ? <CSpinner size="sm" /> : t('auth.forgot.sendBtn', 'Send Reset Code')}
              </CButton>
            </div>
          </CForm>
        )}

        {step === 1 && (
          <CForm onSubmit={handleNextToPassword}>
            <p>{t('auth.forgot.verifyInstruction', 'Enter the code sent to your device.')}</p>
            <CInputGroup className="mb-3">
              <CInputGroupText>OTP</CInputGroupText>
              <CFormInput
                placeholder={t('auth.forgot.code', '6-digit Code')}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={loading}
                required
                maxLength={6}
              />
            </CInputGroup>
            <div className="d-grid">
              <CButton type="submit" color="primary" disabled={loading || !code}>
                {t('common.next', 'Next')}
              </CButton>
            </div>
          </CForm>
        )}

        {step === 2 && (
          <CForm onSubmit={handleResetPassword}>
            <p>{t('auth.forgot.newPasswordInstruction', 'Enter your new password.')}</p>
            <CInputGroup className="mb-3">
              <CInputGroupText>
                <CIcon icon={cilLockLocked} />
              </CInputGroupText>
              <CFormInput
                type="password"
                placeholder={t('auth.forgot.newPassword', 'New Password')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                required
                minLength={6}
              />
            </CInputGroup>
            <CInputGroup className="mb-3">
              <CInputGroupText>
                <CIcon icon={cilLockLocked} />
              </CInputGroupText>
              <CFormInput
                type="password"
                placeholder={t('auth.forgot.confirmPassword', 'Confirm Password')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
                minLength={6}
              />
            </CInputGroup>
            <div className="d-flex justify-content-between mt-3">
              <CButton
                type="button"
                color="secondary"
                variant="ghost"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                {t('common.back', 'Back')}
              </CButton>
              <CButton
                type="submit"
                color="success"
                disabled={loading || !newPassword || !confirmPassword}
              >
                {loading ? <CSpinner size="sm" /> : t('auth.forgot.resetBtn', 'Reset Password')}
              </CButton>
            </div>
          </CForm>
        )}
      </CModalBody>
      <CModalFooter>
        {step === 0 && (
          <CButton color="secondary" variant="ghost" onClick={handleClose}>
            {t('common.cancel', 'Cancel')}
          </CButton>
        )}
      </CModalFooter>
    </CModal>
  )
}

export default ForgotPasswordModal

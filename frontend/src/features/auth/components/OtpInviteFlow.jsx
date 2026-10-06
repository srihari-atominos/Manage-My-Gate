import React, { useState } from 'react'
import { CCard, CCardBody, CButton, CForm, CFormInput, CSpinner, CAlert } from '@coreui/react'
import { useTranslation } from 'react-i18next'
import { initiateInvitationOtp, verifyInvitationOtp } from '../services/authService'

export const OtpInviteFlow = ({
  token,
  email,
  onSuccess,
  onAcceptDeviceRouting,
  isMobileDevice,
}) => {
  const { t } = useTranslation()
  const [step, setStep] = useState('accept') // 'accept' -> 'otp'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [code, setCode] = useState('')

  const handleAccept = async () => {
    if (isMobileDevice) {
      // Defer to parent for handoff
      onAcceptDeviceRouting()
      return
    }

    setLoading(true)
    setError('')
    try {
      await initiateInvitationOtp(token)
      setStep('otp')
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to initiate OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await verifyInvitationOtp(token, code)
      onSuccess(response.data)
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'otp') {
    return (
      <CCard className="border-0">
        <CCardBody className="p-0">
          <h4 className="mb-3">{t('auth.invite.enterOtp', 'Enter Verification Code')}</h4>
          <p className="text-muted small mb-4">
            {t('auth.invite.otpSentTo', 'A verification code has been sent to')}{' '}
            <strong>{email}</strong>
          </p>
          {error && <CAlert color="danger">{error}</CAlert>}
          <CForm onSubmit={handleVerify}>
            <CFormInput
              type="text"
              className="mb-3"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={loading}
              maxLength={6}
            />
            <CButton
              type="submit"
              color="primary"
              className="w-100"
              disabled={loading || code.length < 6}
            >
              {loading ? <CSpinner size="sm" /> : t('auth.invite.verifyOtp', 'Verify & Sign In')}
            </CButton>
          </CForm>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <CCard className="border-0">
      <CCardBody className="p-0 text-center">
        <h4 className="mb-3">{t('auth.invite.acceptTitle', 'Accept Workspace Invitation')}</h4>
        <p className="text-muted small mb-4">
          {t(
            'auth.invite.acceptDesc',
            'This organization uses secure OTP login. Click below to accept the invitation and receive a verification code.',
          )}
        </p>
        {error && <CAlert color="danger">{error}</CAlert>}
        <CButton
          color="primary"
          size="lg"
          className="px-5 w-100 py-3 rounded-3 shadow-sm"
          onClick={handleAccept}
          disabled={loading}
        >
          {loading ? <CSpinner size="sm" /> : t('auth.invite.acceptCta', 'Accept Invitation')}
        </CButton>
      </CCardBody>
    </CCard>
  )
}

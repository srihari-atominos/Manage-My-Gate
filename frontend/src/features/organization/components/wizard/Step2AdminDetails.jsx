import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useTranslation } from 'react-i18next'
import {
  CForm,
  CFormInput,
  CFormSelect,
  CButton,
  CRow,
  CCol,
  CInputGroup,
  CBadge,
  CSpinner,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilLockUnlocked, cilCheckCircle } from '@coreui/icons'
import { sendAdminEmailOtp, verifyAdminEmailOtp } from '../../services/organizationApi.js'
import { checkAccountStatus } from '../../../auth/services/authService.js'

const adminSchema = yup.object().shape({
  fullName: yup.string().required('Full Name is required').min(2, 'Must be at least 2 characters'),
  username: yup
    .string()
    .required('Username is required')
    .matches(/^[a-zA-Z0-9_.-]+$/, 'Only letters, numbers, underscores, dots, and hyphens'),
  email: yup.string().required('Email is required').email('Invalid email format'),
  password: yup.string(),
  confirmPassword: yup.string().oneOf([yup.ref('password'), null], 'Passwords must match'),
})

const COUNTRY_CODES = [
  { code: '+91', country: 'India (+91)' },
  { code: '+971', country: 'UAE (+971)' },
  { code: '+966', country: 'Saudi Arabia (+966)' },
  { code: '+974', country: 'Qatar (+974)' },
  { code: '+965', country: 'Kuwait (+965)' },
  { code: '+968', country: 'Oman (+968)' },
  { code: '+973', country: 'Bahrain (+973)' },
  { code: '+1', country: 'USA/Canada (+1)' },
  { code: '+44', country: 'UK (+44)' },
  { code: '+61', country: 'Australia (+61)' },
  { code: '+65', country: 'Singapore (+65)' },
  { code: '+60', country: 'Malaysia (+60)' },
  { code: '+20', country: 'Egypt (+20)' },
  { code: '+27', country: 'South Africa (+27)' },
  { code: '+49', country: 'Germany (+49)' },
  { code: '+33', country: 'France (+33)' },
]

const parsePhoneParts = (rawPhone) => {
  if (!rawPhone) return { code: '+91', number: '' }
  const matched = rawPhone.match(/^(\+\d+)\s*(.*)$/)
  if (matched) {
    return { code: matched[1], number: matched[2] }
  }
  return { code: '+91', number: rawPhone }
}

const Step2AdminDetails = ({ data, onNext, onBack }) => {
  const { t } = useTranslation()

  const initialPhoneParts = parsePhoneParts(data?.phone)
  const [selectedCountryCode, setSelectedCountryCode] = useState(initialPhoneParts.code)
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneParts.number)
  const [phoneError, setPhoneError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // OTP Verification state
  const [isEmailVerified, setIsEmailVerified] = useState(data?.emailVerified || false)
  const [verifiedEmail, setVerifiedEmail] = useState(data?.emailVerified ? data?.email : '')
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [otpSuccessMsg, setOtpSuccessMsg] = useState('')
  const [isExistingUser, setIsExistingUser] = useState(data?.isExistingUser || false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(adminSchema),
    defaultValues: {
      fullName: data?.fullName || '',
      username: data?.username || '',
      email: data?.email || '',
      password: data?.password || '',
      confirmPassword: data?.confirmPassword || '',
    },
  })

  const currentEmail = watch('email')

  // Invalidate verification if email input changes
  useEffect(() => {
    if (verifiedEmail && currentEmail?.trim().toLowerCase() !== verifiedEmail.trim().toLowerCase()) {
      setIsEmailVerified(false)
      setOtpSent(false)
      setOtpCode('')
      setOtpSuccessMsg('')
      setOtpError('')
    }
  }, [currentEmail, verifiedEmail])

  // Phone validation helper
  const validatePhone = (code, number) => {
    const cleanDigits = number.trim().replace(/\D/g, '')
    if (!cleanDigits) return 'Phone number is required.'

    if (code === '+91') {
      if (cleanDigits.length !== 10) {
        return 'Indian phone numbers (+91) must be exactly 10 digits.'
      }
      if (!/^[6-9]\d{9}$/.test(cleanDigits)) {
        return 'Indian mobile numbers must start with 6, 7, 8, or 9.'
      }
    } else {
      if (cleanDigits.length < 7 || cleanDigits.length > 15) {
        return 'Phone number must be between 7 and 15 digits.'
      }
    }
    return ''
  }

  useEffect(() => {
    if (phoneNumber) {
      setPhoneError(validatePhone(selectedCountryCode, phoneNumber))
    }
  }, [selectedCountryCode, phoneNumber])

  const handleSendOtp = async () => {
    setOtpError('')
    setOtpSuccessMsg('')

    if (!currentEmail || errors.email) {
      setOtpError('Please enter a valid email address first.')
      return
    }

    setSendingOtp(true)
    try {
      const res = await sendAdminEmailOtp(currentEmail.trim())
      const dataPayload = res?.data || res
      setOtpSent(true)
      const msg = dataPayload?.devCode
        ? `OTP sent to ${currentEmail}. (Dev Code: ${dataPayload.devCode})`
        : `Verification code sent to ${currentEmail}.`
      setOtpSuccessMsg(msg)
    } catch (err) {
      setOtpError(err?.response?.data?.message || err?.message || 'Failed to send OTP')
    } finally {
      setSendingOtp(false)
    }
  }

  const handleVerifyOtp = async () => {
    setOtpError('')

    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpError('Please enter the 6-digit OTP code.')
      return
    }

    setVerifyingOtp(true)
    try {
      await verifyAdminEmailOtp(currentEmail.trim(), otpCode.trim())
      setIsEmailVerified(true)
      setVerifiedEmail(currentEmail.trim())
      setOtpSent(false)
      setOtpCode('')
      setOtpSuccessMsg('Email address verified successfully!')

      // Check if user already exists
      try {
        const accountRes = await checkAccountStatus(currentEmail.trim())
        const accountData = accountRes?.data?.data || accountRes?.data || accountRes
        setIsExistingUser(accountData?.exists === true)
      } catch (accErr) {
        console.warn('Failed to check account status:', accErr)
        setIsExistingUser(false)
      }

    } catch (err) {
      setOtpError(err?.response?.data?.message || err?.message || 'Invalid OTP code')
    } finally {
      setVerifyingOtp(false)
    }
  }

  const handleFormSubmit = async (formDataValues) => {
    if (!isEmailVerified) {
      setOtpError('Please verify the Community Admin email address via OTP before proceeding.')
      return
    }

    setIsSubmitting(true)
    let fullPhone = ''
    if (!isExistingUser) {
      const err = validatePhone(selectedCountryCode, phoneNumber)
      if (err) {
        setPhoneError(err)
        setIsSubmitting(false)
        return
      }
      if (!formDataValues.password) {
        setOtpError('Password is required for new users.')
        setIsSubmitting(false)
        return
      }
      if (formDataValues.password !== formDataValues.confirmPassword) {
        setOtpError('Passwords must match.')
        setIsSubmitting(false)
        return
      }
      fullPhone = `${selectedCountryCode} ${phoneNumber.trim()}`

      // Check if phone number is already registered to another user
      try {
        const phoneRes = await checkAccountStatus(fullPhone)
        const phoneData = phoneRes?.data?.data || phoneRes?.data || phoneRes
        if (phoneData?.exists) {
          setPhoneError('This phone number is already associated with an existing account.')
          setIsSubmitting(false)
          return
        }
      } catch (err) {
        console.warn('Failed to verify phone uniqueness:', err)
      }
    }

    setIsSubmitting(false)
    onNext({
      ...formDataValues,
      phone: fullPhone,
      emailVerified: true,
      isExistingUser,
    })
  }

  return (
    <CForm onSubmit={handleSubmit(handleFormSubmit)}>
      <h5 className="mb-4">
        {t('organization.wizard.adminDetailsTitle', {
          defaultValue: 'Community Admin Configuration',
        })}
      </h5>
      <p className="text-muted small mb-4">
        {t('organization.wizard.adminDetailsDesc', {
          defaultValue:
            'This user will be assigned as Community Admin for this organization.',
        })}
      </p>

      <CRow className="mb-3">
        <CCol md={6}>
          <CFormInput
            label={t('organization.wizard.fullName', { defaultValue: 'Full Name' })}
            {...register('fullName')}
            invalid={!!errors.fullName}
            feedbackInvalid={errors.fullName?.message}
          />
        </CCol>
        <CCol md={6}>
          <CFormInput
            label={t('organization.wizard.username', { defaultValue: 'Username' })}
            {...register('username')}
            invalid={!!errors.username}
            feedbackInvalid={errors.username?.message}
          />
        </CCol>
      </CRow>

      <CRow className="mb-3">
        <CCol md={6}>
          <div className="d-flex justify-content-between align-items-center mb-1">
            <label className="form-label mb-0">
              {t('organization.wizard.email', { defaultValue: 'Email' })}
            </label>
            {isEmailVerified && (
              <CBadge color="success" className="d-flex align-items-center gap-1">
                <CIcon icon={cilCheckCircle} size="sm" />
                Verified
              </CBadge>
            )}
          </div>
          <CInputGroup className="has-validation">
            <CFormInput
              type="email"
              {...register('email')}
              invalid={!!errors.email}
              disabled={isEmailVerified}
            />
            {!isEmailVerified && (
              <CButton
                type="button"
                color="primary"
                variant="outline"
                onClick={handleSendOtp}
                disabled={sendingOtp || !currentEmail || !!errors.email}
              >
                {sendingOtp ? <CSpinner size="sm" /> : 'Send OTP'}
              </CButton>
            )}
            {isEmailVerified && (
              <CButton
                type="button"
                color="secondary"
                variant="outline"
                onClick={() => setIsEmailVerified(false)}
              >
                Change Email
              </CButton>
            )}
          </CInputGroup>
          {errors.email && <div className="text-danger small mt-1">{errors.email.message}</div>}

          {!isEmailVerified && otpSent && (
            <div className="mt-2 p-2 border rounded bg-light">
              <label className="form-label small text-muted">Enter 6-digit OTP Code</label>
              <CInputGroup>
                <CFormInput
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                />
                <CButton
                  type="button"
                  color="success"
                  onClick={handleVerifyOtp}
                  disabled={verifyingOtp || otpCode.trim().length !== 6}
                >
                  {verifyingOtp ? <CSpinner size="sm" /> : 'Verify'}
                </CButton>
              </CInputGroup>
            </div>
          )}

          {otpSuccessMsg && (
            <CAlert color="info" className="py-1 px-2 small mt-2 mb-0">
              {otpSuccessMsg}
            </CAlert>
          )}

          {otpError && (
            <CAlert color="danger" className="py-1 px-2 small mt-2 mb-0">
              {otpError}
            </CAlert>
          )}
        </CCol>

        {isEmailVerified && !isExistingUser && (
          <CCol md={6}>
            <label className="form-label">
              {t('organization.wizard.phone', { defaultValue: 'Phone Number' })}
            </label>
            <CInputGroup className={phoneError ? 'is-invalid' : ''}>
              <CFormSelect
                style={{ maxWidth: '140px' }}
                value={selectedCountryCode}
                onChange={(e) => setSelectedCountryCode(e.target.value)}
                aria-label="Country Code"
              >
                {COUNTRY_CODES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.country}
                  </option>
                ))}
              </CFormSelect>
              <CFormInput
                type="text"
                placeholder={selectedCountryCode === '+91' ? '10-digit mobile number' : 'Phone number'}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                aria-label="Admin Phone Number"
                invalid={!!phoneError}
              />
            </CInputGroup>
            {phoneError && <div className="text-danger small mt-1 ps-1">{phoneError}</div>}
          </CCol>
        )}
      </CRow>

      {isExistingUser && isEmailVerified && (
        <CAlert color="success" className="mb-4">
          <CIcon icon={cilCheckCircle} className="me-2" />
          An existing account was found for this email address. They will be added to the organization with their current credentials. Phone number and password setup are not required.
        </CAlert>
      )}

      {isEmailVerified && !isExistingUser && (
        <CRow className="mb-4">
          <CCol md={6}>
            <label className="form-label">
              {t('organization.wizard.password', { defaultValue: 'Password' })}
            </label>
            <CInputGroup className="has-validation">
              <CFormInput
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                invalid={!!errors.password}
              />
              <CButton
                type="button"
                color="secondary"
                variant="outline"
                onClick={() => setShowPassword(!showPassword)}
              >
                <CIcon icon={showPassword ? cilLockUnlocked : cilLockLocked} />
              </CButton>
              {errors.password && <div className="invalid-feedback">{errors.password.message}</div>}
            </CInputGroup>
          </CCol>
          <CCol md={6}>
            <CFormInput
              type={showPassword ? 'text' : 'password'}
              label={t('organization.wizard.confirmPassword', { defaultValue: 'Confirm Password' })}
              {...register('confirmPassword')}
              invalid={!!errors.confirmPassword}
              feedbackInvalid={errors.confirmPassword?.message}
            />
          </CCol>
        </CRow>
      )}

      <div className="d-flex justify-content-between mt-4">
        <CButton color="secondary" variant="ghost" onClick={onBack}>
          {t('common.back', { defaultValue: 'Back' })}
        </CButton>
        <CButton
          color="primary"
          type="submit"
          disabled={!!phoneError || !isEmailVerified || sendingOtp || verifyingOtp || isSubmitting}
        >
          {isSubmitting ? <CSpinner size="sm" /> : t('common.next', { defaultValue: 'Next' })}
        </CButton>
      </div>
    </CForm>
  )
}

export default Step2AdminDetails

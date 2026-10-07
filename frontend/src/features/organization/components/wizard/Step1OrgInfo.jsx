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
  CSpinner,
} from '@coreui/react'
import { checkOrganizationName } from '../../services/organizationApi.js'

const orgInfoSchema = yup.object().shape({
  name: yup.string().required('Organization Name is required'),
  contactEmail: yup.string().email('Invalid email format').nullable().notRequired(),
  country: yup.string().required('Country is required'),
  state: yup.string().required('State is required'),
  city: yup.string().nullable().notRequired(),
  timezone: yup.string().required('Timezone is required'),
})

const COUNTRY_LIST = [
  'India',
  'United Arab Emirates',
  'Saudi Arabia',
  'Qatar',
  'Kuwait',
  'Oman',
  'Bahrain',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Singapore',
  'Malaysia',
  'Egypt',
  'South Africa',
  'Germany',
  'France',
  'Italy',
  'Spain',
  'Netherlands',
  'Switzerland',
  'Sweden',
  'Norway',
  'New Zealand',
  'Japan',
  'South Korea',
  'China',
  'Brazil',
  'Mexico',
  'Indonesia',
  'Philippines',
  'Thailand',
  'Vietnam',
  'Nigeria',
  'Kenya',
  'Argentina',
  'Chile',
  'Colombia',
  'Ireland',
  'Other',
]

const TIMEZONE_LIST = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Riyadh',
  'Asia/Qatar',
  'Asia/Kuwait',
  'Asia/Muscat',
  'Asia/Bahrain',
  'Asia/Singapore',
  'Asia/Kuala_Lumpur',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Europe/Madrid',
  'Europe/Amsterdam',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Perth',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Pacific/Auckland',
  'UTC',
]

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

const Step1OrgInfo = ({ data, onNext, onCancel }) => {
  const { t } = useTranslation()

  const initialPhoneParts = parsePhoneParts(data?.contactPhone)
  const [selectedCountryCode, setSelectedCountryCode] = useState(initialPhoneParts.code)
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneParts.number)
  const [phoneError, setPhoneError] = useState('')

  const [checkingName, setCheckingName] = useState(false)
  const [isNameAvailable, setIsNameAvailable] = useState(null)
  const [nameCheckError, setNameCheckError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(orgInfoSchema),
    defaultValues: {
      name: data?.name || '',
      contactEmail: data?.contactEmail || '',
      country: data?.country || 'India',
      state: data?.state || '',
      city: data?.city || '',
      timezone: data?.timezone || 'Asia/Kolkata',
    },
  })

  const orgName = watch('name')

  // Phone number validation helper
  const validatePhone = (code, number) => {
    const cleanDigits = number.trim().replace(/\D/g, '')
    if (!cleanDigits) return '' // Optional / non-blocking if empty

    if (code === '+91') {
      if (cleanDigits.length !== 10) {
        return 'Indian phone numbers (+91) must be exactly 10 digits.'
      }
      if (!/^[6-9]\d{9}$/.test(cleanDigits)) {
        return 'Indian mobile numbers must start with 6, 7, 8, or 9.'
      }
    } else {
      if (cleanDigits.length < 7 || cleanDigits.length > 15) {
        return 'International phone numbers must be between 7 and 15 digits.'
      }
    }
    return ''
  }

  // Validate phone whenever input changes
  useEffect(() => {
    if (phoneNumber) {
      const err = validatePhone(selectedCountryCode, phoneNumber)
      setPhoneError(err)
    } else {
      setPhoneError('')
    }
  }, [selectedCountryCode, phoneNumber])

  // Debounced live organization name availability check
  useEffect(() => {
    if (!orgName || orgName.trim().length < 1) {
      setIsNameAvailable(null)
      setNameCheckError('')
      setCheckingName(false)
      return
    }

    setCheckingName(true)
    setIsNameAvailable(null)
    setNameCheckError('')

    const timer = setTimeout(async () => {
      try {
        const response = await checkOrganizationName(orgName.trim())
        const available = response.data?.available ?? response.data?.data?.available
        setIsNameAvailable(Boolean(available))
      } catch (err) {
        if (err.response?.status === 429) {
          setNameCheckError('Too many checks. Please wait.')
        } else {
          setNameCheckError('Failed to verify name availability.')
        }
        setIsNameAvailable(false)
      } finally {
        setCheckingName(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [orgName])

  const handleFormSubmit = (formDataValues) => {
    if (isNameAvailable === false) {
      return
    }

    const err = validatePhone(selectedCountryCode, phoneNumber)
    if (err) {
      setPhoneError(err)
      return
    }

    const fullPhone = phoneNumber.trim() ? `${selectedCountryCode} ${phoneNumber.trim()}` : ''
    onNext({
      ...formDataValues,
      contactPhone: fullPhone,
      organizationType: 'Residential',
    })
  }

  return (
    <CForm onSubmit={handleSubmit(handleFormSubmit)}>
      {/* Row 1: Organization Name (with live name check indicator) */}
      <CRow className="mb-4">
        <CCol md={12}>
          <CFormInput
            label={t('organization.wizard.orgName', { defaultValue: 'Organization Name' })}
            {...register('name')}
            invalid={!!errors.name || isNameAvailable === false}
            feedbackInvalid={errors.name?.message}
            placeholder="Enter organization or community name"
          />
          {/* Live Validation Feedback */}
          {(checkingName || isNameAvailable !== null || nameCheckError) && (
            <div className="small mt-1 ps-1" aria-live="polite">
              {checkingName && (
                <span className="text-info">
                  <CSpinner size="sm" variant="grow" className="me-1" />
                  Checking name availability...
                </span>
              )}
              {!checkingName && isNameAvailable === true && (
                <span className="text-success fw-semibold">✓ Name is available</span>
              )}
              {!checkingName && isNameAvailable === false && !nameCheckError && (
                <span className="text-danger fw-semibold">
                  ✗ Organization name is already taken
                </span>
              )}
              {nameCheckError && <span className="text-danger">✗ {nameCheckError}</span>}
            </div>
          )}
        </CCol>
      </CRow>

      {/* Removed Contact Phone and Contact Email as requested */}

      {/* Row 3: Country (Comprehensive Dropdown), State, City (Optional) */}
      <CRow className="mb-3">
        <CCol md={4}>
          <CFormSelect
            label={t('organization.wizard.country', { defaultValue: 'Country' })}
            {...register('country')}
            invalid={!!errors.country}
            feedbackInvalid={errors.country?.message}
          >
            <option value="">Select Country</option>
            {COUNTRY_LIST.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </CFormSelect>
        </CCol>
        <CCol md={4}>
          <CFormInput
            label={t('organization.wizard.state', { defaultValue: 'State' })}
            {...register('state')}
            invalid={!!errors.state}
            feedbackInvalid={errors.state?.message}
            placeholder="Enter state/province"
          />
        </CCol>
        <CCol md={4}>
          <CFormInput
            label={t('organization.wizard.city', { defaultValue: 'City (Optional)' })}
            {...register('city')}
            invalid={!!errors.city}
            feedbackInvalid={errors.city?.message}
            placeholder="Enter city (optional)"
          />
        </CCol>
      </CRow>

      {/* Row 4: Timezone */}
      <CRow className="mb-4">
        <CCol md={6}>
          <CFormSelect
            label={t('organization.wizard.timezone', {
              defaultValue: 'Timezone',
            })}
            {...register('timezone')}
            invalid={!!errors.timezone}
            feedbackInvalid={errors.timezone?.message}
          >
            <option value="">Select Timezone</option>
            {TIMEZONE_LIST.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </CFormSelect>
        </CCol>
      </CRow>

      {/* Bottom Action Buttons */}
      <div className="d-flex justify-content-between mt-4 border-top pt-3">
        <CButton color="secondary" variant="ghost" onClick={onCancel}>
          {t('common.cancel', { defaultValue: 'Cancel' })}
        </CButton>
        <CButton
          color="primary"
          type="submit"
          disabled={checkingName || isNameAvailable === false || !!phoneError}
        >
          {t('common.next', { defaultValue: 'Next' })}
        </CButton>
      </div>
    </CForm>
  )
}

export default Step1OrgInfo

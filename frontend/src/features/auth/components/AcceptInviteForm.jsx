import React, { useMemo } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
  CAlert,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked } from '@coreui/icons'
import useAuth from '../hooks/useAuth'
import '../styles/_auth.scss'

/**
 * Yup validation schema creator with translations.
 */
const createValidationSchema = (t) =>
  yup.object().shape({
    password: yup
      .string()
      .required(t('auth.invite.passwordRequired'))
      .min(8, t('auth.invite.passwordMinLength')),
    confirmPassword: yup
      .string()
      .required(t('auth.invite.confirmPasswordRequired'))
      .oneOf([yup.ref('password')], t('auth.invite.passwordsMustMatch')),
  })

/**
 * AcceptInviteForm Component
 *
 * Clean, modern form for accepting invitations and setting initial account password.
 * Adheres to the "Thin View" architectural boundary pattern.
 */
export const AcceptInviteForm = () => {
  const { t } = useTranslation()
  const { loading, handleAcceptInvitation } = useAuth()
  const { token: routeToken } = useParams()
  const [searchParams] = useSearchParams()

  // Extract token from path parameter or search parameter fallback
  const token = routeToken || searchParams.get('token')

  const validationSchema = useMemo(() => createValidationSchema(t), [t])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data) => {
    if (token) {
      await handleAcceptInvitation(token, data.password)
    }
  }

  // Render error page if token is missing
  if (!token) {
    return (
      <div className="accept-invite-error-container">
        <h2 className="text-danger mb-3 fw-bold">{t('auth.invite.title')}</h2>
        <CAlert color="danger" className="py-3 mb-4 rounded-3 border-0">
          {t('auth.invite.invalidToken')}
        </CAlert>
        <Link to="/login" className="accept-invite-link">
          {t('auth.invite.backToLogin')}
        </Link>
      </div>
    )
  }

  return (
    <CCard className="accept-invite-card border-0">
      <CCardBody className="p-0">
        <CForm onSubmit={handleSubmit(onSubmit)}>
          <h1 className="accept-invite-title">{t('auth.invite.title')}</h1>
          <p className="accept-invite-subtitle">{t('auth.invite.subtitle')}</p>

          <CInputGroup className="mb-3">
            <CInputGroupText className="accept-invite-input-icon border-0">
              <CIcon icon={cilLockLocked} />
            </CInputGroupText>
            <CFormInput
              type="password"
              className="accept-invite-input border-0"
              placeholder={t('auth.invite.password')}
              autoComplete="new-password"
              disabled={loading}
              invalid={!!errors.password}
              {...register('password')}
            />
            {errors.password && (
              <div className="invalid-feedback text-danger small mt-1">
                {errors.password.message}
              </div>
            )}
          </CInputGroup>

          <CInputGroup className="mb-4">
            <CInputGroupText className="accept-invite-input-icon border-0">
              <CIcon icon={cilLockLocked} />
            </CInputGroupText>
            <CFormInput
              type="password"
              className="accept-invite-input border-0"
              placeholder={t('auth.invite.confirmPassword')}
              autoComplete="new-password"
              disabled={loading}
              invalid={!!errors.confirmPassword}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <div className="invalid-feedback text-danger small mt-1">
                {errors.confirmPassword.message}
              </div>
            )}
          </CInputGroup>

          <CRow>
            <CCol xs={12} className="d-grid mb-3">
              <CButton
                type="submit"
                className="accept-invite-btn border-0 py-2"
                disabled={loading}
              >
                {loading ? <CSpinner size="sm" variant="grow" /> : t('auth.invite.submit')}
              </CButton>
            </CCol>
            <CCol xs={12} className="text-center">
              <Link to="/login" className="accept-invite-link">
                {t('auth.invite.backToLogin')}
              </Link>
            </CCol>
          </CRow>
        </CForm>
      </CCardBody>
    </CCard>
  )
}

export default AcceptInviteForm

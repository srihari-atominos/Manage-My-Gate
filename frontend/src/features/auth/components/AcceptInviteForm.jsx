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
import { GoogleLogin } from '@react-oauth/google'
import { useMsal } from '@azure/msal-react'
import useAuth from '../hooks/useAuth'
import '../styles/_auth.scss'

/**
 * AcceptInviteFormErrorBoundary Component
 * Isolates runtime UI failures on the Accept Invite page.
 */
class AcceptInviteFormErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('AcceptInviteForm Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="auth-error-boundary-container p-4 text-center">
          <h3 className="text-danger">Something went wrong.</h3>
          <p>Please try reloading the page.</p>
        </div>
      )
    }
    return this.props.children
  }
}

/**
 * Yup validation schema creator with translations.
 */
const createValidationSchema = (t) =>
  yup.object().shape({
    password: yup
      .string()
      .required(t('auth.invite.passwordRequired', 'Password is required'))
      .min(8, t('auth.invite.passwordMinLength', 'Password must be at least 8 characters long')),
    confirmPassword: yup
      .string()
      .required(t('auth.invite.confirmPasswordRequired', 'Confirm password is required'))
      .oneOf([yup.ref('password')], t('auth.invite.passwordsMustMatch', 'Passwords must match')),
  })

/**
 * AcceptInviteForm Component
 *
 * Clean, modern form for accepting invitations and setting initial account password,
 * as well as accepting invitations via SSO providers (Google & Microsoft).
 * Adheres to the "Thin View" architectural boundary pattern.
 */
export const AcceptInviteForm = () => {
  const { t } = useTranslation()
  const { loading, error, handleAcceptInvitation, handleAcceptSsoInvitation } = useAuth()
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

  // MSAL Instance
  const { instance: msalInstance } = useMsal()

  // Microsoft Login Popup Action
  const handleMicrosoftInvite = () => {
    msalInstance
      .loginPopup({
        scopes: ['openid', 'profile', 'user.read'],
      })
      .then(async (response) => {
        if (response && response.idToken && token) {
          await handleAcceptSsoInvitation(token, response.idToken, 'microsoft')
        }
      })
      .catch((err) => {
        console.error('Microsoft login failed:', err)
      })
  }

  const onSubmit = async (data) => {
    if (token) {
      await handleAcceptInvitation(token, data.password)
    }
  }

  // Render error page if token is missing
  if (!token) {
    return (
      <div className="accept-invite-error-container">
        <h2 className="text-danger mb-3 fw-bold">
          {t('auth.invite.title', 'Workspace Invitation')}
        </h2>
        <CAlert color="danger" className="py-3 mb-4 rounded-3 border-0">
          {t('auth.invite.invalidToken', 'Invalid or expired invitation token.')}
        </CAlert>
        <Link to="/login" className="accept-invite-link">
          {t('auth.invite.backToLogin', 'Back to Login')}
        </Link>
      </div>
    )
  }

  return (
    <CCard className="accept-invite-card border-0">
      <CCardBody className="p-0">
        <h1 className="accept-invite-title">{t('auth.invite.title', 'Workspace Invitation')}</h1>
        <p className="accept-invite-subtitle">
          {t('auth.invite.subtitle', 'Accept your invitation using SSO or set up a password.')}
        </p>

        {error && (
          <CAlert color="danger" className="mb-4">
            {error}
          </CAlert>
        )}

        {/* Password Fallback Flow */}
        <CForm onSubmit={handleSubmit(onSubmit)}>
          <CInputGroup className="mb-3">
            <CInputGroupText className="accept-invite-input-icon border-0">
              <CIcon icon={cilLockLocked} />
            </CInputGroupText>
            <CFormInput
              type="password"
              className="accept-invite-input border-0"
              placeholder={t('auth.invite.password', 'Password')}
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
              placeholder={t('auth.invite.confirmPassword', 'Confirm Password')}
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
              <CButton type="submit" className="accept-invite-btn border-0 py-2" disabled={loading}>
                {loading ? (
                  <CSpinner size="sm" variant="grow" />
                ) : (
                  t('auth.invite.submit', 'Set Password & Accept')
                )}
              </CButton>
            </CCol>
          </CRow>
        </CForm>

        <div className="login-divider mb-3">
          <div className="login-divider-line"></div>
          <span className="login-divider-text">{t('auth.invite.or', 'or')}</span>
          <div className="login-divider-line"></div>
        </div>

        {/* Enterprise SSO Invitation Acceptance */}
        <div className="accept-invite-sso-container">
          <div className="d-flex justify-content-center w-100 mb-2">
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                if (token && credentialResponse.credential) {
                  await handleAcceptSsoInvitation(token, credentialResponse.credential, 'google')
                }
              }}
              onError={() => console.error('Google Sign-In failed')}
              type="standard"
              theme="outline"
              size="large"
              text="continue_with"
              shape="rectangular"
              width="320px"
            />
          </div>

          <button
            type="button"
            className="accept-invite-sso-btn"
            onClick={handleMicrosoftInvite}
            disabled={loading}
          >
            {/* Microsoft Icon SVG */}
            <svg
              style={{ width: '20px', height: '20px', flexShrink: 0 }}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 23 23"
            >
              <path fill="#f35325" d="M1 1h10v10H1z" />
              <path fill="#81bc06" d="M12 1h10v10H12z" />
              <path fill="#05a6f0" d="M1 12h10v10H1z" />
              <path fill="#ffba08" d="M12 12h10v10H12z" />
            </svg>
            {t('auth.invite.continueWithMicrosoft', 'Continue with Microsoft')}
          </button>
        </div>

        <div className="text-center mt-3">
          <Link to="/login" className="accept-invite-link">
            {t('auth.invite.backToLogin', 'Back to Login')}
          </Link>
        </div>
      </CCardBody>
    </CCard>
  )
}

export default function AcceptInviteFormWithBoundary(props) {
  return (
    <AcceptInviteFormErrorBoundary>
      <AcceptInviteForm {...props} />
    </AcceptInviteFormErrorBoundary>
  )
}

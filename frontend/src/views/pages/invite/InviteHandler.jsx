import React, { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { toast } from 'react-hot-toast'
import {
  CSpinner,
  CAlert,
  CCard,
  CCardBody,
  CContainer,
  CRow,
  CCol,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CButton,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser, cilPhone } from '@coreui/icons'
import { GoogleLogin } from '@react-oauth/google'
import { useMsal } from '@azure/msal-react'
import apiClient from '../../../services/apiClient.js'
import useAuth from '../../../features/auth/hooks/useAuth.js'
import '../../../features/auth/styles/_auth.scss'

// ─── Inline icon helpers (same pattern as AcceptInviteForm) ─────────────────
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
    <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z" />
    <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z" />
  </svg>
)

const EyeSlashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
    <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z" />
    <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z" />
    <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z" />
  </svg>
)

// ─── Validation schemas ──────────────────────────────────────────────────────
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\\[\]{};':"\\|,.<>\\/?]).{8,}$/

const createSignUpSchema = (t) =>
  yup.object().shape({
    name: yup.string().required(t('auth.invite.nameRequired', 'Full name is required')).min(2),
    phone: yup.string().optional(),
    password: yup
      .string()
      .required(t('auth.invite.passwordRequired', 'Password is required'))
      .min(8, t('auth.invite.passwordMinLength', 'Minimum 8 characters'))
      .matches(passwordRegex, t('auth.invite.passwordStrength', 'Must include uppercase, lowercase, number and special character')),
    confirmPassword: yup
      .string()
      .required(t('auth.invite.confirmPasswordRequired', 'Confirm password is required'))
      .oneOf([yup.ref('password')], t('auth.invite.passwordsMustMatch', 'Passwords must match')),
  })

const createSignInSchema = (t) =>
  yup.object().shape({
    password: yup.string().required(t('auth.invite.passwordRequired', 'Password is required')),
  })

// ─── Main Component ──────────────────────────────────────────────────────────
/**
 * InviteHandler — Unified smart invite landing page.
 *
 * Validates the invite token, then renders a single page with:
 *  - New user tab: set name, phone, password → POST /auth/accept-invite
 *  - Existing user tab: confirm password → POST /auth/login (with inviteToken)
 *  - SSO: Google & Microsoft → POST /auth/accept-invite/sso
 *
 * The active tab is auto-selected based on isExisting from the validate-invite API.
 */
const InviteHandler = () => {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const { login, loginGoogle, loginMicrosoft, handleAcceptInvitation, handleAcceptSsoInvitation, loading: authLoading, error: authError } = useAuth()
  const { instance: msalInstance } = useMsal()

  // ── Invite metadata state ──────────────────────────────────────────────────
  const [validating, setValidating] = useState(true)
  const [validationError, setValidationError] = useState(null)
  const [inviteData, setInviteData] = useState(null)     // { valid, isExisting, email, orgId }
  const [activeTab, setActiveTab] = useState('signup')   // 'signup' | 'signin'

  // ── Password visibility toggles ────────────────────────────────────────────
  const [showSignUpPwd, setShowSignUpPwd] = useState(false)
  const [showSignUpConfirm, setShowSignUpConfirm] = useState(false)
  const [showSignInPwd, setShowSignInPwd] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // ── Forms ──────────────────────────────────────────────────────────────────
  const signUpForm = useForm({ resolver: yupResolver(createSignUpSchema(t)), defaultValues: { name: '', phone: '', password: '', confirmPassword: '' } })
  const signInForm = useForm({ resolver: yupResolver(createSignInSchema(t)), defaultValues: { password: '' } })

  // ── 1. Validate token on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setValidationError(t('auth.invite.noToken', 'No invitation token provided.'))
      setValidating(false)
      return
    }

    let cancelled = false

    const validate = async () => {
      try {
        const res = await apiClient.get('/auth/validate-invite', { params: { token } })
        if (cancelled) return
        const data = res.data?.data || res.data
        if (data?.valid) {
          setInviteData(data)
          setActiveTab(data.isExisting ? 'signin' : 'signup')
        } else {
          setValidationError(t('auth.invite.invalidToken', 'Invalid or expired invitation link.'))
        }
      } catch (err) {
        if (!cancelled) setValidationError(err.response?.data?.message || t('auth.invite.invalidToken', 'Invalid or expired invitation link.'))
      } finally {
        if (!cancelled) setValidating(false)
      }
    }

    validate()
    return () => { cancelled = true }
  }, [token, t])

  // ── 2. Sign Up (new user) ──────────────────────────────────────────────────
  const handleSignUp = useCallback(async (formData) => {
    setSubmitError(null)
    const result = await handleAcceptInvitation(token, formData.password)
    if (!result?.success) {
      setSubmitError(result?.error || t('auth.invite.error', 'Something went wrong. Please try again.'))
    }
    // On success: useAuth navigates to /dashboard automatically
  }, [token, handleAcceptInvitation, t])

  // ── 3. Sign In (existing user) — backend accepts inviteToken in login ──────
  const handleSignIn = useCallback(async (formData) => {
    setSubmitError(null)
    const result = await login({ login: inviteData.email, password: formData.password, inviteToken: token })
    if (result?.success) {
      toast.success(t('auth.invite.success', 'Welcome! You have joined the community.'))
      const workspaces = result.payload?.data?.availableWorkspaces || []
      navigate(workspaces.length === 0 ? '/workspace-setup' : '/dashboard')
    } else {
      setSubmitError(result?.error || t('auth.login.error', 'Invalid credentials. Please try again.'))
    }
  }, [login, inviteData, token, navigate, t])

  // ── 4. SSO handlers — behaviour differs by user type ──────────────────────
  //    New users  → POST /auth/accept-invite/sso  (handleAcceptSsoInvitation)
  //    Existing   → POST /auth/login/google|microsoft (loginGoogle/loginMicrosoft)
  //    The acceptInviteWithSSO backend method throws 400 if user.status !== 'Pending Verification'
  const handleGoogleSSO = useCallback(async (credentialResponse) => {
    setSubmitError(null)
    if (!credentialResponse?.credential) return
    if (inviteData?.isExisting) {
      // Existing user — use standard Google login with inviteToken for auto-acceptance
      const result = await loginGoogle(credentialResponse.credential, token)
      if (!result?.success) {
        setSubmitError(result?.error || t('auth.invite.ssoError', 'Google sign-in failed. Please try again.'))
      }
    } else {
      // New user — use dedicated SSO invite acceptance endpoint
      await handleAcceptSsoInvitation(token, credentialResponse.credential, 'google')
    }
  }, [token, inviteData, loginGoogle, handleAcceptSsoInvitation, t])

  const handleMicrosoftSSO = useCallback(() => {
    setSubmitError(null)
    msalInstance.loginPopup({ scopes: ['openid', 'profile', 'user.read'] })
      .then(async (response) => {
        if (!response?.idToken) return
        if (inviteData?.isExisting) {
          // Existing user — use standard Microsoft login with inviteToken
          const result = await loginMicrosoft(response.idToken, token)
          if (!result?.success) {
            setSubmitError(result?.error || t('auth.invite.ssoError', 'Microsoft sign-in failed. Please try again.'))
          }
        } else {
          // New user — use dedicated SSO invite acceptance endpoint
          await handleAcceptSsoInvitation(token, response.idToken, 'microsoft')
        }
      })
      .catch((err) => {
        console.error('Microsoft SSO failed:', err)
        setSubmitError(t('auth.invite.ssoError', 'Microsoft sign-in failed. Please try again.'))
      })
  }, [token, inviteData, loginMicrosoft, handleAcceptSsoInvitation, msalInstance, t])


  // ── Loading state ──────────────────────────────────────────────────────────
  if (validating) {
    return (
      <div className="invite-handler-loading">
        <CSpinner color="primary" variant="grow" className="mb-3" />
        <p className="text-muted">{t('auth.invite.validating', 'Validating your invitation...')}</p>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (validationError) {
    return (
      <div className="invite-handler-wrapper">
        <CContainer>
          <CRow className="justify-content-center">
            <CCol md={6}>
              <CCard className="invite-handler-card border-0 shadow-lg text-center">
                <CCardBody className="p-5">
                  <div className="invite-handler-error-icon mb-3">✉️</div>
                  <h3 className="text-danger fw-bold mb-3">{t('auth.invite.errorTitle', 'Invitation Error')}</h3>
                  <CAlert color="danger">{validationError}</CAlert>
                  <Link to="/login" className="btn btn-primary px-4 mt-2">{t('auth.invite.backToLogin', 'Go to Login')}</Link>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>
        </CContainer>
      </div>
    )
  }

  // ── Main invite page ───────────────────────────────────────────────────────
  return (
    <div className="invite-handler-wrapper">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={8} lg={6}>

            {/* ── Hero Banner ── */}
            <div className="invite-handler-hero text-center mb-4">
              <div className="invite-handler-emoji mb-2">🎉</div>
              <h2 className="invite-handler-title fw-bold">
                {t('auth.invite.heroTitle', "You're Invited!")}
              </h2>
              <p className="invite-handler-subtitle text-muted">
                {t('auth.invite.heroSubtitle', 'You have been invited to join a community workspace.')}
              </p>
            </div>

            {/* ── Invite context card ── */}
            <div className="invite-handler-context-strip mb-4 text-center">
              <span className="invite-handler-email-badge">
                ✉️ {inviteData?.email}
              </span>
            </div>

            {/* ── Auth card ── */}
            <CCard className="invite-handler-card border-0 shadow-lg">
              <CCardBody className="p-4">

                {/* ── Tab navigation ── */}
                <CNav variant="tabs" className="invite-handler-tabs mb-4">
                  <CNavItem>
                    <CNavLink
                      active={activeTab === 'signup'}
                      onClick={() => setActiveTab('signup')}
                      className="invite-handler-tab-link"
                      style={{ cursor: 'pointer' }}
                    >
                      {t('auth.invite.tabSignUp', 'New User')}
                    </CNavLink>
                  </CNavItem>
                  <CNavItem>
                    <CNavLink
                      active={activeTab === 'signin'}
                      onClick={() => setActiveTab('signin')}
                      className="invite-handler-tab-link"
                      style={{ cursor: 'pointer' }}
                    >
                      {t('auth.invite.tabSignIn', 'Existing User')}
                    </CNavLink>
                  </CNavItem>
                </CNav>

                {/* ── Shared error alert ── */}
                {(submitError || authError) && (
                  <CAlert color="danger" className="mb-3">
                    {submitError || authError}
                  </CAlert>
                )}

                <CTabContent>

                  {/* ══ Sign Up Tab ══════════════════════════════════════════ */}
                  <CTabPane visible={activeTab === 'signup'}>
                    <CForm onSubmit={signUpForm.handleSubmit(handleSignUp)}>

                      {/* Name */}
                      <CInputGroup className="mb-3">
                        <CInputGroupText className="accept-invite-input-icon border-0">
                          <CIcon icon={cilUser} />
                        </CInputGroupText>
                        <CFormInput
                          className="accept-invite-input border-0"
                          placeholder={t('auth.invite.namePlaceholder', 'Full Name')}
                          disabled={authLoading}
                          invalid={!!signUpForm.formState.errors.name}
                          {...signUpForm.register('name')}
                        />
                        {signUpForm.formState.errors.name && (
                          <div className="invalid-feedback">{signUpForm.formState.errors.name.message}</div>
                        )}
                      </CInputGroup>

                      {/* Phone */}
                      <CInputGroup className="mb-3">
                        <CInputGroupText className="accept-invite-input-icon border-0">
                          <CIcon icon={cilPhone} />
                        </CInputGroupText>
                        <CFormInput
                          className="accept-invite-input border-0"
                          placeholder={t('auth.invite.phonePlaceholder', 'Phone Number (optional)')}
                          disabled={authLoading}
                          {...signUpForm.register('phone')}
                        />
                      </CInputGroup>

                      {/* Password */}
                      <CInputGroup className="mb-3 position-relative">
                        <CInputGroupText className="accept-invite-input-icon border-0">
                          <CIcon icon={cilLockLocked} />
                        </CInputGroupText>
                        <CFormInput
                          type={showSignUpPwd ? 'text' : 'password'}
                          className="accept-invite-input border-0 pe-5"
                          placeholder={t('auth.invite.password', 'Password')}
                          autoComplete="new-password"
                          disabled={authLoading}
                          invalid={!!signUpForm.formState.errors.password}
                          {...signUpForm.register('password')}
                        />
                        <button type="button" className="invite-handler-eye-btn" onClick={() => setShowSignUpPwd(!showSignUpPwd)}>
                          {showSignUpPwd ? <EyeSlashIcon /> : <EyeIcon />}
                        </button>
                        {signUpForm.formState.errors.password && (
                          <div className="invalid-feedback">{signUpForm.formState.errors.password.message}</div>
                        )}
                      </CInputGroup>

                      {/* Confirm Password */}
                      <CInputGroup className="mb-4 position-relative">
                        <CInputGroupText className="accept-invite-input-icon border-0">
                          <CIcon icon={cilLockLocked} />
                        </CInputGroupText>
                        <CFormInput
                          type={showSignUpConfirm ? 'text' : 'password'}
                          className="accept-invite-input border-0 pe-5"
                          placeholder={t('auth.invite.confirmPassword', 'Confirm Password')}
                          autoComplete="new-password"
                          disabled={authLoading}
                          invalid={!!signUpForm.formState.errors.confirmPassword}
                          {...signUpForm.register('confirmPassword')}
                        />
                        <button type="button" className="invite-handler-eye-btn" onClick={() => setShowSignUpConfirm(!showSignUpConfirm)}>
                          {showSignUpConfirm ? <EyeSlashIcon /> : <EyeIcon />}
                        </button>
                        {signUpForm.formState.errors.confirmPassword && (
                          <div className="invalid-feedback">{signUpForm.formState.errors.confirmPassword.message}</div>
                        )}
                      </CInputGroup>

                      <CButton type="submit" className="accept-invite-btn border-0 py-2 w-100 mb-3" disabled={authLoading}>
                        {authLoading
                          ? <CSpinner size="sm" variant="grow" />
                          : t('auth.invite.submitSignUp', 'Activate & Join Community')
                        }
                      </CButton>
                    </CForm>

                    {/* SSO divider */}
                    <div className="login-divider mb-3">
                      <div className="login-divider-line" />
                      <span className="login-divider-text">{t('auth.invite.or', 'or')}</span>
                      <div className="login-divider-line" />
                    </div>

                    <InviteSSOButtons
                      loading={authLoading}
                      onGoogle={handleGoogleSSO}
                      onMicrosoft={handleMicrosoftSSO}
                      t={t}
                    />
                  </CTabPane>

                  {/* ══ Sign In Tab ══════════════════════════════════════════ */}
                  <CTabPane visible={activeTab === 'signin'}>
                    <CForm onSubmit={signInForm.handleSubmit(handleSignIn)}>

                      {/* Email — pre-filled read-only */}
                      <CInputGroup className="mb-3">
                        <CInputGroupText className="accept-invite-input-icon border-0">✉️</CInputGroupText>
                        <CFormInput
                          className="accept-invite-input border-0"
                          value={inviteData?.email || ''}
                          readOnly
                          disabled
                          aria-label={t('auth.invite.emailLabel', 'Email')}
                        />
                      </CInputGroup>

                      {/* Password */}
                      <CInputGroup className="mb-4 position-relative">
                        <CInputGroupText className="accept-invite-input-icon border-0">
                          <CIcon icon={cilLockLocked} />
                        </CInputGroupText>
                        <CFormInput
                          type={showSignInPwd ? 'text' : 'password'}
                          className="accept-invite-input border-0 pe-5"
                          placeholder={t('auth.invite.existingPassword', 'Your existing password')}
                          autoComplete="current-password"
                          disabled={authLoading}
                          invalid={!!signInForm.formState.errors.password}
                          {...signInForm.register('password')}
                        />
                        <button type="button" className="invite-handler-eye-btn" onClick={() => setShowSignInPwd(!showSignInPwd)}>
                          {showSignInPwd ? <EyeSlashIcon /> : <EyeIcon />}
                        </button>
                        {signInForm.formState.errors.password && (
                          <div className="invalid-feedback">{signInForm.formState.errors.password.message}</div>
                        )}
                      </CInputGroup>

                      <CButton type="submit" className="accept-invite-btn border-0 py-2 w-100 mb-3" disabled={authLoading}>
                        {authLoading
                          ? <CSpinner size="sm" variant="grow" />
                          : t('auth.invite.submitSignIn', 'Sign In & Join Community')
                        }
                      </CButton>
                    </CForm>

                    {/* SSO divider */}
                    <div className="login-divider mb-3">
                      <div className="login-divider-line" />
                      <span className="login-divider-text">{t('auth.invite.or', 'or')}</span>
                      <div className="login-divider-line" />
                    </div>

                    <InviteSSOButtons
                      loading={authLoading}
                      onGoogle={handleGoogleSSO}
                      onMicrosoft={handleMicrosoftSSO}
                      t={t}
                    />

                    <div className="text-center mt-2">
                      <Link to="/forgot-password" className="accept-invite-link small">
                        {t('auth.login.forgotPassword', 'Forgot your password?')}
                      </Link>
                    </div>
                  </CTabPane>
                </CTabContent>

                {/* ── Decline invitation ── */}
                <div className="text-center mt-4 pt-3 border-top">
                  <span className="text-muted small">
                    {t('auth.invite.declineText', 'Not expecting this? ')}
                    <Link to="/login" className="text-danger small text-decoration-none fw-semibold">
                      {t('auth.invite.declineLink', 'Decline invitation')}
                    </Link>
                  </span>
                </div>

              </CCardBody>
            </CCard>

          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

// ─── SSO Buttons sub-section (reused in both tabs) ───────────────────────────
const InviteSSOButtons = ({ loading, onGoogle, onMicrosoft, t }) => (
  <div className="accept-invite-sso-container">
    <div className="d-flex justify-content-center w-100 mb-2">
      <GoogleLogin
        onSuccess={onGoogle}
        onError={() => console.error('Google SSO failed')}
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
      onClick={onMicrosoft}
      disabled={loading}
      accessibilityRole="button"
      aria-label={t('auth.invite.continueWithMicrosoft', 'Continue with Microsoft')}
    >
      <svg style={{ width: '20px', height: '20px', flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23">
        <path fill="#f35325" d="M1 1h10v10H1z" />
        <path fill="#81bc06" d="M12 1h10v10H12z" />
        <path fill="#05a6f0" d="M1 12h10v10H1z" />
        <path fill="#ffba08" d="M12 12h10v10H12z" />
      </svg>
      {t('auth.invite.continueWithMicrosoft', 'Continue with Microsoft')}
    </button>
  </div>
)

export default InviteHandler

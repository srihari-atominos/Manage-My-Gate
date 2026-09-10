import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CSpinner,
  CCard,
  CCardBody,
  CContainer,
  CRow,
  CCol,
  CAlert,
} from '@coreui/react'
import useAuth from '../../../features/auth/hooks/useAuth.js'
import ErrorBoundary from '../../../components/ErrorBoundary/ErrorBoundary.jsx'
import { InviteHeader } from '../../../features/auth/components/InviteHeader.jsx'
import { InviteStatusCard } from '../../../features/auth/components/InviteStatusCard.jsx'
import { InviteSignUpForm } from '../../../features/auth/components/InviteSignUpForm.jsx'
import { InviteSignInForm } from '../../../features/auth/components/InviteSignInForm.jsx'
import { InviteSsoButtons } from '../../../features/auth/components/InviteSsoButtons.jsx'
import { InviteMobileHandoffCard } from '../../../features/auth/components/InviteMobileHandoffCard.jsx'
import '../../../features/auth/styles/_auth.scss'

const isMobileDevice = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const userAgent = navigator.userAgent || navigator.vendor || window.opera || ''
  return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())
}

/**
 * InviteHandlerContent Component
 *
 * Inner view for the canonical workspace invitation landing experience (/invite/:token).
 * Orchestrates token validation, lifecycle-state presentation, tab selection
 * between New User (Sign Up) and Existing User (Sign In), and Single Sign-On.
 */
const InviteHandlerContent = () => {
  const { token: routeToken } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const {
    currentUser,
    isAuthenticated,
    invitation,
    handleValidateInvitation,
    handleAcceptInvitation,
    handleAcceptSsoInvitation,
    handleCreateInviteHandoff,
    login,
    logout,
  } = useAuth()

  const token = routeToken || searchParams.get('token') || ''

  // Form submission state
  const [submitting, setSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState('')

  // Mobile handoff state
  const [handoffData, setHandoffData] = useState(null)

  // Active tab state: 'signup' | 'signin'
  const [activeTab, setActiveTab] = useState('signup')
  const [tabInitialized, setTabInitialized] = useState(false)

  // 1. Trigger invitation token validation on mount or token change
  useEffect(() => {
    if (token) {
      handleValidateInvitation(token)
    }
  }, [token])

  // 2. Set default tab according to whether user is detected as existing
  useEffect(() => {
    if (invitation.valid && invitation.data && !tabInitialized) {
      if (invitation.data.isExisting) {
        setActiveTab('signin')
      } else {
        setActiveTab('signup')
      }
      setTabInitialized(true)
    }
  }, [invitation.valid, invitation.data, tabInitialized])

  const inviteData = invitation.data
  const isLoading = invitation.loading
  const hasError = !token || !invitation.valid || !!invitation.error
  const errorMessage = !token
    ? t('auth.invite.invalidToken', 'No invitation token provided.')
    : invitation.error || t('auth.invite.invalidToken', 'This invitation link is invalid or has expired.')

  // Handler: Tab Switching
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setSubmissionError('')
  }

  // Helper: Process mobile handoff or redirect to web dashboard
  const processSuccessfulAcceptance = async () => {
    if (isMobileDevice()) {
      const handoffRes = await handleCreateInviteHandoff()
      if (handoffRes.success && handoffRes.data) {
        setHandoffData(handoffRes.data)
        if (handoffRes.data.deepLink) {
          window.location.href = handoffRes.data.deepLink
        }
        return
      }
    }
    navigate('/dashboard', { replace: true })
  }

  // Handler: New User Sign Up submission
  const handleSignUpSubmit = async (formData) => {
    setSubmitting(true)
    setSubmissionError('')

    try {
      const result = await handleAcceptInvitation(
        {
          token,
          password: formData.password,
          name: formData.name,
          phone: formData.phone || '',
          email: inviteData?.email,
        },
        null,
        { skipNavigate: true }
      )

      if (!result.success) {
        setSubmissionError(result.error || t('auth.invite.error', 'Failed to activate account.'))
      } else {
        await processSuccessfulAcceptance()
      }
    } catch (err) {
      setSubmissionError(err.message || t('auth.invite.error', 'Failed to activate account.'))
    } finally {
      setSubmitting(false)
    }
  }

  // Handler: Existing User Sign In submission
  const handleSignInSubmit = async ({ email, password }) => {
    setSubmitting(true)
    setSubmissionError('')

    try {
      // Step 1: Validate credentials & log user in
      const loginResult = await login({ email, password })
      if (!loginResult.success) {
        setSubmissionError(loginResult.error || t('auth.invite.invalidCredentials', 'Invalid email or password.'))
        setSubmitting(false)
        return
      }

      // Step 2: Accept invitation and associate workspace
      const acceptResult = await handleAcceptInvitation(
        { token, email },
        null,
        { skipNavigate: true }
      )
      if (!acceptResult.success) {
        setSubmissionError(acceptResult.error || t('auth.invite.error', 'Failed to join workspace.'))
      } else {
        await processSuccessfulAcceptance()
      }
    } catch (err) {
      setSubmissionError(err.message || t('auth.invite.error', 'Failed to sign in and accept invitation.'))
    } finally {
      setSubmitting(false)
    }
  }

  // Handler: Authenticated User direct acceptance
  const handleAcceptExistingAuthenticated = async () => {
    setSubmitting(true)
    setSubmissionError('')

    try {
      const result = await handleAcceptInvitation(
        { token, email: inviteData?.email },
        null,
        { skipNavigate: true }
      )
      if (!result.success) {
        setSubmissionError(result.error || t('auth.invite.error', 'Failed to accept invitation.'))
      } else {
        await processSuccessfulAcceptance()
      }
    } catch (err) {
      setSubmissionError(err.message || t('auth.invite.error', 'Failed to accept invitation.'))
    } finally {
      setSubmitting(false)
    }
  }

  // Handler: Single Sign-On (Google / Microsoft)
  const handleSsoSuccess = async (ssoCredential, provider) => {
    setSubmitting(true)
    setSubmissionError('')

    try {
      const result = await handleAcceptSsoInvitation(token, ssoCredential, provider, { skipNavigate: true })
      if (!result.success) {
        setSubmissionError(result.error || t('auth.invite.error', 'SSO acceptance failed.'))
      } else {
        await processSuccessfulAcceptance()
      }
    } catch (err) {
      setSubmissionError(err.message || t('auth.invite.error', 'SSO acceptance failed.'))
    } finally {
      setSubmitting(false)
    }
  }

  // Handler: Sign Out & Switch Account
  const handleSignOut = () => {
    logout()
    setSubmissionError('')
  }

  // 0. Mobile Handoff State (Rendered after successful acceptance on mobile device)
  if (handoffData) {
    return (
      <div className="invite-page-wrapper">
        <CContainer>
          <CRow className="justify-content-center">
            <CCol xs={12} className="d-flex justify-content-center">
              <div className="invite-card-container">
                <InviteMobileHandoffCard
                  handoffData={handoffData}
                  orgName={inviteData?.orgName}
                />
              </div>
            </CCol>
          </CRow>
        </CContainer>
      </div>
    )
  }

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="invite-page-wrapper">
        <div className="text-center text-white">
          <CSpinner color="primary" variant="grow" className="mb-3" />
          <h5 className="fw-semibold">{t('auth.invite.validating', 'Validating workspace invitation...')}</h5>
        </div>
      </div>
    )
  }

  // 2. Terminal Lifecycle / Validation Error State
  if (hasError) {
    return (
      <div className="invite-page-wrapper">
        <CContainer>
          <CRow className="justify-content-center">
            <CCol xs={12} className="d-flex justify-content-center">
              <div className="invite-card-container">
                <InviteStatusCard
                  status={invitation.error || 'INVALID'}
                  errorMessage={errorMessage}
                  isAuthenticated={isAuthenticated}
                />
              </div>
            </CCol>
          </CRow>
        </CContainer>
      </div>
    )
  }

  // 3. Valid Invitation Experience
  return (
    <div className="invite-page-wrapper">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol xs={12} className="d-flex justify-content-center">
            <div className="invite-card-container">
              <CCard className="invite-card border-0 shadow-lg rounded-4 overflow-hidden">
                {/* Attribution Header */}
                <InviteHeader inviteData={inviteData} />

                <CCardBody className="p-4 p-md-5">
                  {/* Global submission error display if any */}
                  {submissionError && (
                    <CAlert color="danger" className="mb-4 py-2 small" dismissible onClose={() => setSubmissionError('')}>
                      {submissionError}
                    </CAlert>
                  )}

                  {/* Segmented Tab Controls: New User vs Existing User */}
                  <div className="invite-tabs-container">
                    <button
                      type="button"
                      className={`invite-tab-btn ${activeTab === 'signup' ? 'active' : ''}`}
                      onClick={() => handleTabChange('signup')}
                      disabled={submitting}
                    >
                      {t('auth.invite.tabSignUp', 'New User (Sign Up)')}
                    </button>
                    <button
                      type="button"
                      className={`invite-tab-btn ${activeTab === 'signin' ? 'active' : ''}`}
                      onClick={() => handleTabChange('signin')}
                      disabled={submitting}
                    >
                      {t('auth.invite.tabSignIn', 'Existing User (Sign In)')}
                    </button>
                  </div>

                  {/* Tab 1: New User Sign Up */}
                  {activeTab === 'signup' && (
                    <div>
                      <InviteSignUpForm
                        email={inviteData?.email}
                        token={token}
                        onSubmit={handleSignUpSubmit}
                        submitting={submitting}
                        submissionError={submissionError}
                      />

                      {/* SSO Providers */}
                      <InviteSsoButtons
                        onSsoSuccess={handleSsoSuccess}
                        disabled={submitting}
                      />

                      <div className="text-center mt-4 pt-2 border-top">
                        <small className="text-muted">
                          {t('auth.invite.alreadyHaveAccount', 'Already registered?')}{' '}
                          <button
                            type="button"
                            className="btn btn-link p-0 text-primary fw-semibold text-decoration-none small"
                            onClick={() => handleTabChange('signin')}
                          >
                            {t('auth.invite.signInTabCta', 'Sign In Instead')}
                          </button>
                        </small>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Existing User Sign In */}
                  {activeTab === 'signin' && (
                    <div>
                      <InviteSignInForm
                        email={inviteData?.email}
                        token={token}
                        orgName={inviteData?.orgName}
                        isAuthenticated={isAuthenticated}
                        currentUser={currentUser}
                        onSubmit={handleSignInSubmit}
                        onAcceptExistingAuthenticated={handleAcceptExistingAuthenticated}
                        onSignOut={handleSignOut}
                        submitting={submitting}
                        submissionError={submissionError}
                      />

                      {/* SSO Providers for Existing Users */}
                      <InviteSsoButtons
                        onSsoSuccess={handleSsoSuccess}
                        disabled={submitting}
                      />

                      <div className="text-center mt-4 pt-2 border-top">
                        <small className="text-muted">
                          {t('auth.invite.needNewAccount', 'Need to create an account?')}{' '}
                          <button
                            type="button"
                            className="btn btn-link p-0 text-primary fw-semibold text-decoration-none small"
                            onClick={() => handleTabChange('signup')}
                          >
                            {t('auth.invite.signUpTabCta', 'Sign Up Instead')}
                          </button>
                        </small>
                      </div>
                    </div>
                  )}
                </CCardBody>
              </CCard>
            </div>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

/**
 * Top-Level Export Wrapped in Error Boundary
 */
export const InviteHandler = () => (
  <ErrorBoundary>
    <InviteHandlerContent />
  </ErrorBoundary>
)

export default InviteHandler

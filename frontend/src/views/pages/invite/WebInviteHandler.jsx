import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardBody,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CButton,
  CAlert,
  CSpinner,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser, cilHome, cilShieldAlt } from '@coreui/icons'
import apiClient from '../../../services/apiClient.js'
import toast from 'react-hot-toast'

export const WebInviteHandler = () => {
  const { token: routeToken } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const token = routeToken || searchParams.get('token') || ''

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [inviteData, setInviteData] = useState(null)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    if (!token) {
      setError('No invitation token was provided.')
      setLoading(false)
      return
    }

    let isMounted = true

    const validate = async () => {
      try {
        const res = await apiClient.get(`/auth/validate-invite?token=${encodeURIComponent(token)}`)
        if (!isMounted) return
        const data = res.data?.data || res.data

        if (data && data.valid) {
          setInviteData(data)
          if (data.isExisting) {
            toast('Your account already exists. Please sign in to access this workspace.')
            navigate(`/login?invite_token=${token}&email=${encodeURIComponent(data.email || '')}`, {
              replace: true,
            })
            return
          }
        } else {
          setError('This invitation link is invalid or has expired.')
        }
      } catch (err) {
        if (!isMounted) return
        const msg =
          err.response?.data?.message ||
          'This invitation link is invalid or has expired. Please contact your administrator.'
        setError(msg)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    validate()

    return () => {
      isMounted = false
    }
  }, [token, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setValidationError('')

    if (!password || password.length < 6) {
      setValidationError('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.')
      return
    }

    setSubmitting(true)

    try {
      await apiClient.post('/auth/accept-invite', {
        token,
        password,
        email: inviteData?.email,
      })

      toast.success('Account activated successfully! Please sign in.')
      navigate(`/login?email=${encodeURIComponent(inviteData?.email || '')}`, { replace: true })
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to activate account. Please try again.'
      setValidationError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-vh-100 d-flex flex-row align-items-center justify-content-center bg-dark text-white">
        <div className="text-center">
          <CSpinner color="primary" variant="grow" className="mb-3" />
          <h5>Validating workspace invitation...</h5>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-vh-100 d-flex flex-row align-items-center bg-dark">
        <CContainer>
          <CRow className="justify-content-center">
            <CCol md={6} lg={5}>
              <CCard className="border-0 shadow-lg rounded-4 overflow-hidden">
                <CCardBody className="p-5 text-center">
                  <div
                    className="d-inline-flex align-items-center justify-content-center bg-danger-subtle text-danger rounded-circle mb-3"
                    style={{ width: '64px', height: '64px' }}
                  >
                    <CIcon icon={cilShieldAlt} size="xl" />
                  </div>
                  <h3 className="fw-bold mb-2">Invitation Invalid</h3>
                  <CAlert color="danger" className="mb-4">
                    {error}
                  </CAlert>
                  <p className="text-muted small mb-4">
                    If you believe this is an error, please ask your Community Administrator to resend
                    the invitation.
                  </p>
                  <Link to="/login" className="btn btn-primary px-4 py-2 rounded-pill fw-semibold">
                    Go to Login
                  </Link>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>
        </CContainer>
      </div>
    )
  }

  return (
    <div className="min-vh-100 d-flex flex-row align-items-center bg-dark py-5">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={7} lg={5}>
            <CCard className="border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="bg-primary text-white p-4 text-center">
                <CBadge color="light" text="primary" className="mb-2 px-3 py-1 text-uppercase fw-bold">
                  Web Workspace Invitation
                </CBadge>
                <h2 className="fw-bold mb-1">You're Invited!</h2>
                <p className="text-white-50 small mb-0">
                  You have been invited to join <strong>{inviteData?.orgName || 'Community'}</strong>
                </p>
              </div>

              <CCardBody className="p-4 p-md-5">
                {/* Invitation Details Summary */}
                <div className="bg-light p-3 rounded-3 mb-4 border">
                  <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                    <span className="text-muted small d-flex align-items-center gap-1">
                      <CIcon icon={cilHome} size="sm" /> Community:
                    </span>
                    <span className="fw-bold text-dark">{inviteData?.orgName || 'ManageMyGate'}</span>
                  </div>

                  {(() => {
                    const unitValue = (inviteData?.unit || inviteData?.villa || '').trim();
                    const isInvalidUnit =
                      !unitValue ||
                      unitValue.toLowerCase() === 'none' ||
                      (inviteData?.role && unitValue.toLowerCase() === inviteData.role.trim().toLowerCase());
                    if (isInvalidUnit) return null;
                    return (
                      <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                        <span className="text-muted small d-flex align-items-center gap-1">
                          <CIcon icon={cilHome} size="sm" /> Villa / Unit:
                        </span>
                        <span className="fw-semibold text-dark">{unitValue}</span>
                      </div>
                    );
                  })()}

                  {inviteData?.role ? (
                    <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                      <span className="text-muted small d-flex align-items-center gap-1">
                        <CIcon icon={cilShieldAlt} size="sm" /> Role:
                      </span>
                      <CBadge color="info">{inviteData.role}</CBadge>
                    </div>
                  ) : null}

                  <div className="d-flex align-items-center justify-content-between">
                    <span className="text-muted small d-flex align-items-center gap-1">
                      <CIcon icon={cilUser} size="sm" /> Email:
                    </span>
                    <span className="small text-muted">{inviteData?.email}</span>
                  </div>
                </div>

                <h5 className="fw-bold mb-3 text-dark">Create your password</h5>

                {validationError ? (
                  <CAlert color="danger" className="mb-3 py-2 small">
                    {validationError}
                  </CAlert>
                ) : null}

                <CForm onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">New Password *</label>
                    <CInputGroup>
                      <CInputGroupText className="bg-light">
                        <CIcon icon={cilLockLocked} />
                      </CInputGroupText>
                      <CFormInput
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <CButton
                        type="button"
                        color="light"
                        variant="outline"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </CButton>
                    </CInputGroup>
                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                      At least 6 characters required.
                    </small>
                  </div>

                  <div className="mb-4">
                    <label className="form-label small fw-semibold text-muted">Confirm Password *</label>
                    <CInputGroup>
                      <CInputGroupText className="bg-light">
                        <CIcon icon={cilLockLocked} />
                      </CInputGroupText>
                      <CFormInput
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </CInputGroup>
                  </div>

                  <CButton
                    type="submit"
                    color="primary"
                    className="w-100 py-2 fw-bold rounded-3"
                    disabled={submitting || !password || !confirmPassword}
                  >
                    {submitting ? (
                      <>
                        <CSpinner size="sm" className="me-2" />
                        Activating Account...
                      </>
                    ) : (
                      'Set Password & Activate Account'
                    )}
                  </CButton>
                </CForm>

                <div className="text-center mt-4 pt-2 border-top">
                  <small className="text-muted">
                    Already completed password setup?{' '}
                    <Link to="/login" className="text-primary fw-semibold text-decoration-none">
                      Sign In
                    </Link>
                  </small>
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default WebInviteHandler

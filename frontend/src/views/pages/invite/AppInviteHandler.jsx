import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardBody,
  CButton,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCloudDownload, cilCopy, cilCheck } from '@coreui/icons'
import toast from 'react-hot-toast'

const PLAY_STORE_PACKAGE = 'com.atominosconsulting.nahom'

export const AppInviteHandler = () => {
  const { token: routeToken } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const token = routeToken || searchParams.get('token') || ''
  const [copied, setCopied] = useState(false)
  const [autoRedirectAttempted, setAutoRedirectAttempted] = useState(false)

  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent || '' : ''
  const isAndroid = /android/i.test(userAgent)
  const isIOS = /iphone|ipad|ipod/i.test(userAgent)

  const playStoreUrl = `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}&referrer=token%3D${encodeURIComponent(token)}`
  const deepLinkUrl = `managemygate://invite/app?token=${encodeURIComponent(token)}`

  useEffect(() => {
    if (!token) return

    // If accessed from an Android mobile device, try launching the app or redirecting to Play Store
    if (isAndroid && !autoRedirectAttempted) {
      setAutoRedirectAttempted(true)

      // Attempt to launch via custom scheme first
      const timeout = setTimeout(() => {
        // If app did not catch the intent within 1.5 seconds, redirect to Play Store
        window.location.href = playStoreUrl
      }, 1500)

      window.location.href = deepLinkUrl

      return () => clearTimeout(timeout)
    }
  }, [token, autoRedirectAttempted, deepLinkUrl, playStoreUrl, isAndroid])

  const handleCopyToken = () => {
    if (!token) return
    navigator.clipboard.writeText(token)
    setCopied(true)
    toast.success('Invitation code copied!')
    setTimeout(() => setCopied(false), 3000)
  }

  const handleOpenApp = () => {
    window.location.href = deepLinkUrl
  }

  const handleGoToPlayStore = () => {
    window.location.href = playStoreUrl
  }

  const handleContinueInBrowser = () => {
    navigate(`/invite/web/${token}`)
  }

  return (
    <div
      className="min-vh-100 d-flex flex-column justify-content-center align-items-center py-4 py-sm-5 px-3"
      style={{
        background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
      }}
    >
      <CContainer className="p-0">
        <CRow className="justify-content-center g-0">
          <CCol xs={12} sm={10} md={8} lg={6} xl={5} style={{ maxWidth: '460px' }}>
            <CCard className="border-0 shadow-lg rounded-4 overflow-hidden mx-auto bg-white">
              {/* Card Header */}
              <div
                className="text-white p-4 text-center"
                style={{ background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 50%, #7c3aed 100%)' }}
              >
                <CBadge
                  color="light"
                  text="dark"
                  className="mb-2 px-3 py-1 text-uppercase fw-bold rounded-pill"
                  style={{ fontSize: '0.7rem', letterSpacing: '0.08em' }}
                >
                  Mobile App Invitation
                </CBadge>
                <h3 className="fw-bold mb-1" style={{ fontSize: '1.5rem', letterSpacing: '-0.02em' }}>
                  Nahom Mobile App
                </h3>
                <p className="text-white-50 small mb-0">
                  Official Community & Resident Portal
                </p>
              </div>

              <CCardBody className="p-4 p-sm-4 text-center">
                {/* Modern Smartphone Icon Badge */}
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3 shadow-xs"
                  style={{
                    width: '72px',
                    height: '72px',
                    background: 'linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%)',
                    color: '#4f46e5',
                  }}
                >
                  <svg
                    width="34"
                    height="34"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                    <path d="m9 10 2 2 4-4" />
                  </svg>
                </div>

                <h4 className="fw-bold text-dark mb-2" style={{ fontSize: '1.3rem' }}>
                  Open Nahom to Accept
                </h4>
                <p className="text-muted small mb-4" style={{ lineHeight: '1.55' }}>
                  To complete your profile and set your password, open or install the Nahom mobile app on your phone.
                </p>

                {/* Primary CTA: Play Store / App Store */}
                <CButton
                  color="primary"
                  className="w-100 py-3 fw-bold rounded-3 mb-2 d-flex align-items-center justify-content-center gap-2 shadow-sm text-white"
                  style={{ fontSize: '0.95rem' }}
                  onClick={handleGoToPlayStore}
                >
                  <CIcon icon={cilCloudDownload} size="lg" />
                  {isIOS ? 'Download on App Store' : 'Get it on Google Play'}
                </CButton>

                {/* Secondary CTA: Open Installed App */}
                <CButton
                  variant="outline"
                  color="secondary"
                  className="w-100 py-2 fw-semibold rounded-3 mb-3 d-flex align-items-center justify-content-center gap-2"
                  style={{ fontSize: '0.88rem' }}
                  onClick={handleOpenApp}
                >
                  Already installed? Open Nahom App
                </CButton>

                {/* Web Browser Alternative CTA for Users without App */}
                <div className="pt-3 pb-1 border-top my-3">
                  <span className="text-muted small d-block mb-2">
                    Don't have the app installed yet?
                  </span>
                  <CButton
                    color="success"
                    variant="ghost"
                    className="w-100 py-2 fw-bold rounded-3 text-success d-flex align-items-center justify-content-center gap-1 border border-success-subtle bg-success-subtle"
                    style={{ fontSize: '0.88rem' }}
                    onClick={handleContinueInBrowser}
                  >
                    Accept in Mobile Browser &rarr;
                  </CButton>
                </div>

                {/* Invitation Code Recovery Box */}
                {token ? (
                  <div className="bg-light p-3 rounded-3 border text-start mt-3">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <span className="text-muted small fw-semibold">Your Invitation Code:</span>
                      <CButton
                        size="sm"
                        color={copied ? 'success' : 'light'}
                        variant="ghost"
                        onClick={handleCopyToken}
                        className="py-1 px-2.5 small fw-semibold"
                      >
                        <CIcon icon={copied ? cilCheck : cilCopy} size="sm" className="me-1" />
                        {copied ? 'Copied' : 'Copy'}
                      </CButton>
                    </div>
                    <code
                      className="text-break text-dark d-block p-2.5 bg-white rounded border small fw-bold font-monospace"
                      style={{ fontSize: '0.78rem', userSelect: 'all', wordBreak: 'break-all', lineHeight: '1.4' }}
                    >
                      {token}
                    </code>
                    <small className="text-muted d-block mt-2" style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
                      After installing the Nahom app, you can continue automatically by tapping the
                      link in your email or pasting this code into the app.
                    </small>
                  </div>
                ) : null}
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default AppInviteHandler

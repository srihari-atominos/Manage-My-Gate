import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
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
import { cilCloudDownload, cilCopy, cilCheck, cilPhone } from '@coreui/icons'
import toast from 'react-hot-toast'

const PLAY_STORE_PACKAGE = 'com.atominosconsulting.nahom'

export const AppInviteHandler = () => {
  const { token: routeToken } = useParams()
  const [searchParams] = useSearchParams()

  const token = routeToken || searchParams.get('token') || ''
  const [copied, setCopied] = useState(false)
  const [autoRedirectAttempted, setAutoRedirectAttempted] = useState(false)

  const playStoreUrl = `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}&referrer=token%3D${encodeURIComponent(token)}`
  const deepLinkUrl = `managemygate://invite/app?token=${encodeURIComponent(token)}`

  useEffect(() => {
    if (!token) return

    // If accessed from an Android mobile device, try launching the app or redirecting to Play Store
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent || '' : ''
    const isAndroid = /android/i.test(userAgent)

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
  }, [token, autoRedirectAttempted, deepLinkUrl, playStoreUrl])

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

  return (
    <div className="min-vh-100 d-flex flex-row align-items-center bg-dark py-5">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={7} lg={5}>
            <CCard className="border-0 shadow-lg rounded-4 overflow-hidden">
              <div
                className="text-white p-4 text-center"
                style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
              >
                <CBadge color="light" text="dark" className="mb-2 px-3 py-1 text-uppercase fw-bold">
                  Mobile App Invitation
                </CBadge>
                <h2 className="fw-bold mb-1">Nahom Mobile App</h2>
                <p className="text-white-50 small mb-0">
                  This invitation is designed for the Nahom Mobile Application
                </p>
              </div>

              <CCardBody className="p-4 p-md-5 text-center">
                <div
                  className="d-inline-flex align-items-center justify-content-center bg-primary-subtle text-primary rounded-circle mb-3"
                  style={{ width: '72px', height: '72px' }}
                >
                  <CIcon icon={cilPhone} size="xxl" />
                </div>

                <h4 className="fw-bold text-dark mb-2">Open Nahom to Accept</h4>
                <p className="text-muted small mb-4">
                  To complete your profile and set your password, install and open the Nahom app on
                  your Android device.
                </p>

                {/* Primary CTA: Play Store */}
                <CButton
                  color="primary"
                  className="w-100 py-3 fw-bold rounded-3 mb-3 d-flex align-items-center justify-content-center gap-2 shadow-sm"
                  onClick={handleGoToPlayStore}
                >
                  <CIcon icon={cilCloudDownload} size="lg" />
                  Get it on Google Play
                </CButton>

                {/* Secondary CTA: Open Installed App */}
                <CButton
                  variant="outline"
                  color="secondary"
                  className="w-100 py-2 fw-semibold rounded-3 mb-4"
                  onClick={handleOpenApp}
                >
                  Already installed? Open Nahom App
                </CButton>

                {/* Invitation Code Recovery Box */}
                {token ? (
                  <div className="bg-light p-3 rounded-3 border text-start">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <span className="text-muted small fw-semibold">Your Invitation Code:</span>
                      <CButton
                        size="sm"
                        color={copied ? 'success' : 'light'}
                        variant="ghost"
                        onClick={handleCopyToken}
                        className="py-0 px-2 small"
                      >
                        <CIcon icon={copied ? cilCheck : cilCopy} size="sm" className="me-1" />
                        {copied ? 'Copied' : 'Copy'}
                      </CButton>
                    </div>
                    <code
                      className="text-break text-dark d-block p-2 bg-white rounded border small fw-bold"
                      style={{ fontSize: '0.8rem', userSelect: 'all' }}
                    >
                      {token}
                    </code>
                    <small className="text-muted d-block mt-2" style={{ fontSize: '0.75rem' }}>
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

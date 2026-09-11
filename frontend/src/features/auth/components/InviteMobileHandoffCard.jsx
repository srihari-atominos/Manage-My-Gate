import React from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { CCard, CCardBody } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilDevices, cilArrowRight } from '@coreui/icons'

/**
 * InviteMobileHandoffCard Component
 *
 * Rendered after an invitation has been successfully accepted on a mobile browser.
 * Provides deep-link CTA to open the installed native app with the single-use handoff ticket,
 * links to Google Play / Apple App Store for first-time installation,
 * and a web continuity fallback button to remain in the web browser.
 */
export const InviteMobileHandoffCard = ({ handoffData, orgName }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const playStoreFallback = 'https://play.google.com/store/apps/details?id=com.atominosconsulting.nahom'
  const appStoreFallback = 'https://apps.apple.com/app/manage-my-gate/id6470000000'

  const playUrl = handoffData?.playStoreUrl || playStoreFallback
  const appUrl = handoffData?.appStoreUrl || appStoreFallback
  const deepLink = handoffData?.deepLink

  const handleOpenApp = () => {
    if (deepLink) {
      window.location.href = deepLink
    }
  }

  const handleContinueInWeb = () => {
    navigate('/dashboard', { replace: true })
  }

  return (
    <CCard className="border-0 shadow-lg rounded-4 overflow-hidden text-center p-4 p-md-5">
      <CCardBody className="p-0">
        <div className="mb-3 d-inline-flex align-items-center justify-content-center bg-success-subtle text-success rounded-circle p-3" style={{ width: 68, height: 68 }}>
          <CIcon icon={cilCheckCircle} size="xxl" />
        </div>

        <h4 className="fw-bold text-foreground mb-2">
          {t('auth.handoff.joinedTitle', 'Workspace Joined Successfully!')}
        </h4>

        <p className="text-muted small mb-4">
          {orgName ? (
            t('auth.handoff.joinedSubtitleWithOrg', 'Your account is active and you are now a member of {{orgName}}.', { orgName })
          ) : (
            t('auth.handoff.joinedSubtitle', 'Your account is active and your invitation has been accepted.')
          )}
        </p>

        {/* Primary CTA: Open in App */}
        <div className="d-grid gap-2 mb-3">
          <button
            type="button"
            className="btn btn-primary btn-lg fw-semibold d-flex align-items-center justify-content-center shadow-sm"
            onClick={handleOpenApp}
          >
            <CIcon icon={cilDevices} className="me-2" />
            {t('auth.handoff.openAppCta', 'Open Manage-My-Gate App')}
          </button>
        </div>

        {/* Store Installation Links */}
        <div className="bg-light rounded-3 p-3 mb-4 text-start">
          <div className="small fw-semibold text-secondary mb-2">
            {t('auth.handoff.notInstalled', 'App not installed yet?')}
          </div>
          <p className="small text-muted mb-2">
            {t('auth.handoff.installInstruction', 'Download the mobile app to manage gate access, approvals, and notices on the go.')}
          </p>
          <div className="d-flex flex-wrap gap-2 pt-1 justify-content-center">
            {playUrl && (
              <a
                href={playUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-success btn-sm fw-semibold d-inline-flex align-items-center me-2"
              >
                {t('auth.handoff.googlePlay', 'Google Play Store')}
              </a>
            )}
            {appUrl && (
              <a
                href={appUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-dark btn-sm fw-semibold d-inline-flex align-items-center"
              >
                {t('auth.handoff.appStore', 'Apple App Store')}
              </a>
            )}
          </div>
        </div>

        {/* Web Continuity Fallback */}
        <div className="pt-2 border-top">
          <button
            type="button"
            className="btn btn-link text-decoration-none text-muted small p-0 d-inline-flex align-items-center"
            onClick={handleContinueInWeb}
          >
            <span>{t('auth.handoff.continueInWeb', 'Continue in Web Browser')}</span>
            <CIcon icon={cilArrowRight} size="sm" className="ms-1" />
          </button>
        </div>
      </CCardBody>
    </CCard>
  )
}

InviteMobileHandoffCard.propTypes = {
  handoffData: PropTypes.shape({
    handoffId: PropTypes.string,
    deepLink: PropTypes.string,
    universalLink: PropTypes.string,
    playStoreUrl: PropTypes.string,
    appStoreUrl: PropTypes.string,
  }),
  orgName: PropTypes.string,
}

export default InviteMobileHandoffCard

import React from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { GoogleLogin } from '@react-oauth/google'
import { useMsal } from '@azure/msal-react'
import { CButton } from '@coreui/react'

/**
 * InviteSsoButtons Component
 *
 * Provides single-click Google and Microsoft SSO invitation acceptance.
 * Reuses existing provider token flows and delegates to backend accept-invite/sso.
 */
export const InviteSsoButtons = ({ onSsoSuccess, disabled }) => {
  const { t } = useTranslation()
  const { instance: msalInstance } = useMsal()

  const handleMicrosoftClick = async () => {
    try {
      const response = await msalInstance.loginPopup({
        scopes: ['openid', 'profile', 'user.read', 'email'],
      })
      if (response && response.idToken) {
        onSsoSuccess(response.idToken, 'microsoft')
      }
    } catch (err) {
      console.error('Microsoft SSO login error:', err)
    }
  }

  return (
    <div className="invite-sso-container">
      <div className="d-flex align-items-center my-4">
        <div className="flex-grow-1 border-top" />
        <span className="px-3 text-muted small text-uppercase fw-semibold" style={{ letterSpacing: '0.05em' }}>
          {t('auth.invite.orContinueWith', 'Or continue with')}
        </span>
        <div className="flex-grow-1 border-top" />
      </div>

      <div className="d-flex flex-column gap-2.5">
        {/* Google SSO */}
        <div className="google-login-wrapper w-100 d-flex justify-content-center">
          <GoogleLogin
            onSuccess={(credentialResponse) => {
              if (credentialResponse?.credential) {
                onSsoSuccess(credentialResponse.credential, 'google')
              }
            }}
            onError={() => {
              console.error('Google SSO Error')
            }}
            type="standard"
            theme="outline"
            size="large"
            width="100%"
            text="continue_with"
          />
        </div>

        {/* Microsoft SSO */}
        <CButton
          type="button"
          color="light"
          variant="outline"
          className="w-100 py-2 d-flex align-items-center justify-content-center gap-2 border rounded-3 fw-semibold text-dark shadow-xs"
          disabled={disabled}
          onClick={handleMicrosoftClick}
        >
          <svg width="18" height="18" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
          </svg>
          <span>{t('auth.invite.continueWithMicrosoft', 'Continue with Microsoft')}</span>
        </CButton>
      </div>
    </div>
  )
}

InviteSsoButtons.propTypes = {
  onSsoSuccess: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
}

export default InviteSsoButtons

import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import 'core-js'

import config from './config/config.js'
import App from './App'
import store from './store/store'
import { injectStore } from './services/apiClient'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'

injectStore(store)
import { setActiveWorkspace } from './features/workspace/store/workspaceSlice.js'
import './i18n.js'

// Google and Microsoft SSO Providers Setup
import { GoogleOAuthProvider } from '@react-oauth/google'
import { PublicClientApplication } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'

const msalConfig = {
  auth: {
    clientId: config.microsoftClientId,
    authority: `https://login.microsoftonline.com/${config.microsoftTenantId}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
}

// MSAL instance initialization
let msalInstance = null;
try {
  if (config.microsoftClientId) {
    msalInstance = new PublicClientApplication(msalConfig);
  } else {
    console.warn('MSAL configuration missing client ID. SSO will be disabled.');
  }
} catch (error) {
  console.error('Failed to instantiate MSAL PublicClientApplication:', error);
}

// Retrieve the saved user object from localStorage and hydrate workspace context
try {
  const savedUserStr = localStorage.getItem('user')
  if (savedUserStr) {
    const savedUser = JSON.parse(savedUserStr)
    if (savedUser && savedUser.orgId) {
      const cachedWorkspacesStr = localStorage.getItem('availableWorkspaces')
      const cachedWorkspaces = cachedWorkspacesStr ? JSON.parse(cachedWorkspacesStr) : []
      const matchedOrg = cachedWorkspaces.find((w) => w.orgId === savedUser.orgId)
      store.dispatch(
        setActiveWorkspace({
          activeOrganizationId: savedUser.orgId,
          activeRole: savedUser.role,
          allowedFeatures: savedUser.permissions || [],
          isPlatform: savedUser.isPlatform || false,
          organizationName: matchedOrg ? matchedOrg.name : null,
          availableWorkspaces: cachedWorkspaces,
        }),
      )
    }
  }
} catch (error) {
  console.error('Failed to bootstrap workspace hydration from localStorage:', error)
}

const googleClientId = config.googleClientId
console.log('====== GOOGLE SSO DEBUG INFO ======')
console.log('Current Browser Origin:', window.location.origin)
console.log('Using Client ID:', googleClientId)
console.log('If these do not EXACTLY match Google Cloud Console, it will fail with 403.')
console.log('===================================')

const renderApp = () => (
  <ErrorBoundary>
    <Provider store={store}>
      <GoogleOAuthProvider clientId={googleClientId || 'dummy-client-id'}>
        {msalInstance ? (
          <MsalProvider instance={msalInstance}>
            <App />
          </MsalProvider>
        ) : (
          <App />
        )}
      </GoogleOAuthProvider>
    </Provider>
  </ErrorBoundary>
)

// Initialize MSAL and then render the app
if (msalInstance) {
  msalInstance
    .initialize()
    .then(() => {
      createRoot(document.getElementById('root')).render(renderApp())
    })
    .catch((err) => {
      console.error('MSAL Initialization failed:', err)
      // Render anyway so the rest of the app works, even if Microsoft SSO fails
      createRoot(document.getElementById('root')).render(renderApp())
    })
} else {
  createRoot(document.getElementById('root')).render(renderApp())
}

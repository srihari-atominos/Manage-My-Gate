import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import 'core-js'

import App from './App'
import store from './store/store'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'
import { setActiveWorkspace } from './features/workspace/store/workspaceSlice.js'
import './i18n.js'

// Google and Microsoft SSO Providers Setup
import { GoogleOAuthProvider } from '@react-oauth/google'
import { PublicClientApplication } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'

const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MICROSOFT_TENANT_ID || 'common'}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  }
}

// MSAL instance initialization
const msalInstance = new PublicClientApplication(msalConfig)

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
        })
      )
    }
  }
} catch (error) {
  console.error('Failed to bootstrap workspace hydration from localStorage:', error)
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const renderApp = () => (
  <ErrorBoundary>
    <Provider store={store}>
      <GoogleOAuthProvider clientId={googleClientId}>
        <MsalProvider instance={msalInstance}>
          <App />
        </MsalProvider>
      </GoogleOAuthProvider>
    </Provider>
  </ErrorBoundary>
);

// Initialize MSAL and then render the app
msalInstance.initialize().then(() => {
  createRoot(document.getElementById('root')).render(renderApp());
}).catch(err => {
  console.error("MSAL Initialization failed:", err);
  // Render anyway so the rest of the app works, even if Microsoft SSO fails
  createRoot(document.getElementById('root')).render(renderApp());
});

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
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || 'placeholder-ms-client-id',
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
    if (savedUser && Array.isArray(savedUser.organizations) && savedUser.organizations.length > 0) {
      const firstOrg = savedUser.organizations[0]
      store.dispatch(
        setActiveWorkspace({
          activeOrganizationId: firstOrg.id,
          activeRole: firstOrg.role,
          allowedFeatures: firstOrg.allowedFeatures || [],
          organizationName: firstOrg.name,
        })
      )
    }
  }
} catch (error) {
  console.error('Failed to bootstrap workspace hydration from localStorage:', error)
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <Provider store={store}>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || 'placeholder-google-client-id'}>
        <MsalProvider instance={msalInstance}>
          <App />
        </MsalProvider>
      </GoogleOAuthProvider>
    </Provider>
  </ErrorBoundary>,
)

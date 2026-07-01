import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import 'core-js'

import App from './App'
import store from './store/store'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'
import { setActiveWorkspace } from './features/workspace/store/workspaceSlice.js'
import './i18n.js'

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
      <App />
    </Provider>
  </ErrorBoundary>,
)

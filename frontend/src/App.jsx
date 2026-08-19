/**
 * App Component
 *
 * Root application component that sets up routing, theme management,
 * and lazy-loaded page components with suspense boundaries.
 *
 * Features:
 * - Client-side routing with HashRouter
 * - Theme detection from URL parameters and Redux state
 * - Lazy loading for all routes with loading spinner fallback
 * - Public routes (login, register, error pages)
 * - Protected routes wrapped in DefaultLayout
 *
 * @module App
 */

import React, { Suspense, useEffect } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Toaster } from 'react-hot-toast'
import AuthGuard from './features/auth/components/AuthGuard'

import { CSpinner, useColorModes } from '@coreui/react'
import './scss/style.scss'

// We use those styles to show code examples, you should remove them in your application.
import './scss/examples.scss'

// Containers
const DefaultLayout = React.lazy(() => import('./layout/DefaultLayout'))

// Pages
const Login = React.lazy(() => import('./views/pages/login/Login'))
const Register = React.lazy(() => import('./views/pages/register/Register'))
const AcceptInvitePage = React.lazy(() => import('./views/pages/acceptInvite/AcceptInvitePage'))
const InviteHandler = React.lazy(() => import('./views/pages/invite/InviteHandler'))
const Page404 = React.lazy(() => import('./views/pages/page404/Page404'))
const Page500 = React.lazy(() => import('./views/pages/page500/Page500'))
const GetStarted = React.lazy(() => import('./views/pages/getStarted/GetStarted'))
const FeatureConfigWizard = React.lazy(
  () => import('./features/workspace/views/FeatureConfigWizard'),
)
const PublicCheckoutPage = React.lazy(() => import('./views/pages/pay/PublicCheckoutPage'))
const SetPasswordPage = React.lazy(() => import('./views/pages/auth/SetPasswordPage'))
const EnquiryPendingView = React.lazy(() => import('./features/workspace/views/EnquiryPendingView'))

/**
 * Main Application Component
 *
 * Manages application-wide concerns:
 * - Theme initialization and persistence
 * - Client-side routing configuration
 * - Lazy loading with suspense fallbacks
 * - Theme detection from URL query parameters
 *
 * Theme priority:
 * 1. URL parameter (?theme=dark)
 * 2. Redux stored theme
 * 3. Browser/system preference (auto)
 *
 * @component
 * @returns {React.ReactElement} Application root with routing
 *
 * @example
 * // Standard usage in index.js
 * import App from './App'
 * ReactDOM.render(<App />, document.getElementById('root'))
 */
const App = () => {
  const { isColorModeSet, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')
  const storedTheme = useSelector((state) => state.ui.theme)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.href.split('?')[1])
    const theme = urlParams.get('theme') && urlParams.get('theme').match(/^[A-Za-z0-9\s]+/)[0]
    if (theme) {
      setColorMode(theme)
    }

    if (isColorModeSet()) {
      return
    }

    setColorMode(storedTheme)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <HashRouter>
        <Suspense
          fallback={
            <div className="pt-3 text-center">
              <CSpinner color="primary" variant="grow" />
            </div>
          }
        >
          <Routes>
            <Route exact path="/login" name="Login Page" element={<Login />} />
            <Route exact path="/register" name="Register Page" element={<Register />} />
            <Route
              exact
              path="/login-createOrg"
              name="Login Create Org Page"
              element={<Register />}
            />
            <Route exact path="/start" name="Get Started Page" element={<GetStarted />} />
            <Route
              exact
              path="/accept-invite/:token"
              name="Accept Invitation Page"
              element={<AcceptInvitePage />}
            />
            <Route
              exact
              path="/accept-invite"
              name="Accept Invitation Page"
              element={<AcceptInvitePage />}
            />
            <Route exact path="/invite" name="Invite Handler" element={<InviteHandler />} />
            <Route exact path="/pay/:id" name="Payment Checkout" element={<PublicCheckoutPage />} />
            <Route exact path="/pay" name="Payment Checkout" element={<PublicCheckoutPage />} />
            <Route exact path="/set-password" name="Set Password Page" element={<SetPasswordPage />} />
            <Route exact path="/404" name="Page 404" element={<Page404 />} />
            <Route exact path="/500" name="Page 500" element={<Page500 />} />
            <Route
              exact
              path="/workspace-setup"
              name="Workspace Setup Page"
              element={
                <AuthGuard allowSsoBypass={true}>
                  <FeatureConfigWizard />
                </AuthGuard>
              }
            />
            <Route
              exact
              path="/enquiry-pending"
              name="Enquiry Pending Page"
              element={
                <AuthGuard allowSsoBypass={true}>
                  <EnquiryPendingView />
                </AuthGuard>
              }
            />
            <Route path="*" name="Home" element={<DefaultLayout />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </>
  )
}

export default App

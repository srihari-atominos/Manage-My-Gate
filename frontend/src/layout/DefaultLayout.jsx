/**
 * DefaultLayout Component
 *
 * Main application layout wrapper that composes the primary UI structure
 * for authenticated/protected routes.
 *
 * Layout structure:
 * - AppSidebar: Collapsible navigation sidebar
 * - AppHeader: Top navigation bar with user menu and theme switcher
 * - AppContent: Main content area with route rendering
 * - AppFooter: Footer with links and copyright
 *
 * This layout is used for all routes defined in routes.js, providing
 * a consistent structure across the application.
 *
 * @component
 * @example
 * // Used in App.js for protected routes
 * <Route path="*" element={<DefaultLayout />} />
 */

import React from 'react'
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { AppContent, AppSidebar, AppHeader } from '../components/index'
import useNotificationSocket from '../features/notification/hooks/useNotificationSocket.js'
import useWalkInListener from '../features/visitorManagement/hooks/useWalkInListener.js'
import GlobalGateApprovalModal from '../features/visitorManagement/components/GlobalGateApprovalModal.jsx'

/**
 * DefaultLayout functional component
 *
 * Renders the main application layout with:
 * - Fixed sidebar navigation
 * - Sticky header
 * - Flexible content area
 * - Footer at bottom
 *
 * Uses flexbox for proper content stretching and footer positioning.
 *
 * @returns {React.ReactElement} Complete application layout
 */
const DefaultLayout = () => {
  const { token, user } = useSelector((state) => state.auth)

  // Initialize real-time notification socket listener
  useNotificationSocket(user?.id || user?._id)

  // Initialize real-time gate walk-in approval request listener
  useWalkInListener()

  // Redirect to login if not authenticated
  if (!token) {
    return <Navigate to="/login" replace />
  }

  return (
    <div>
      <AppSidebar />
      <div className="wrapper d-flex flex-column min-vh-100">
        <AppHeader />
        <div className="body flex-grow-1">
          <AppContent />
        </div>
      </div>
      <GlobalGateApprovalModal />
    </div>
  )
}

export default DefaultLayout

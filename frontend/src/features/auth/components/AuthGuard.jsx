import React from 'react'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import { Navigate, Outlet } from 'react-router-dom'

/**
 * AuthGuard Component
 *
 * Route guard component that checks the Redux auth state.
 * If user is not authenticated, redirects to /login.
 * Otherwise, checks if allowedRoles criteria is met, else redirects to /403.
 * Renders children or standard nested Outlet.
 */
export const AuthGuard = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles.length > 0) {
    // Standard roles check supporting both user.roles (array) and user.role (string)
    const userRoles = Array.isArray(user?.roles) ? user.roles : user?.role ? [user.role] : []

    const hasRequiredRole = allowedRoles.some((role) => userRoles.includes(role))

    if (!hasRequiredRole) {
      return <Navigate to="/403" replace />
    }
  }

  return children ? children : <Outlet />
}

AuthGuard.propTypes = {
  children: PropTypes.node,
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
}

export default AuthGuard

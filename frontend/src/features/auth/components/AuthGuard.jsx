import React from 'react'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import { Navigate, Outlet } from 'react-router-dom'

/**
 * AuthGuard Component
 * 
 * Route guard component that checks the Redux auth state.
 * If user is not authenticated, redirects to /login.
 * Otherwise, renders children or standard nested Outlet.
 */
export const AuthGuard = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children ? children : <Outlet />
}

AuthGuard.propTypes = {
  children: PropTypes.node,
}

export default AuthGuard

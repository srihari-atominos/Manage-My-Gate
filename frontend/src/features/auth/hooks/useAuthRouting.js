import { useSelector, useDispatch } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { acceptPendingInvitation } from '../store/authSlice.js'

/**
 * useAuthRouting Custom Hook
 * Handles smart routing redirects after authentication based on URL query params
 * (e.g., intent=create, token=XYZ) and workspace configuration state.
 *
 * Adheres to the "Thin View" architectural pattern.
 */
export const useAuthRouting = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()

  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)
  const token = useSelector((state) => state.auth.token)
  const user = useSelector((state) => state.auth.user)
  const availableWorkspaces = useSelector((state) => state.workspace?.availableWorkspaces) || []
  const authWorkspaces = user?.availableWorkspaces || []
  const loading = useSelector((state) => state.auth.loading)
  const error = useSelector((state) => state.auth.error)

  /**
   * Evaluates authentication state and URL params to perform the appropriate redirect.
   */
  const handlePostAuthRedirect = (options = {}) => {
    if (!isAuthenticated || !token) return

    // Parse URL query parameters from multiple sources (supports HashRouter & normal search)
    const searchParams = new URLSearchParams(location.search)
    const hrefSearch = window.location.href.includes('?')
      ? window.location.href.substring(window.location.href.indexOf('?'))
      : ''
    const hrefParams = new URLSearchParams(hrefSearch.replace(/#.*/, ''))

    const storedIntent = sessionStorage.getItem('auth_intent')
    const intent =
      searchParams.get('intent') ||
      hrefParams.get('intent') ||
      location.state?.intent ||
      storedIntent

    const inviteToken =
      searchParams.get('invite_token') ||
      hrefParams.get('invite_token') ||
      searchParams.get('token') ||
      hrefParams.get('token') ||
      location.state?.inviteToken ||
      location.state?.token

    // Clear stored temporary auth intent once evaluated
    sessionStorage.removeItem('auth_intent')

    // If an invitation token is present and not explicitly skipped, accept it and refresh context
    if (inviteToken && !options.skipInviteToken) {
      dispatch(acceptPendingInvitation(inviteToken))
        .unwrap()
        .then(() => {
          navigate('/dashboard', { replace: true })
        })
        .catch((err) => {
          console.warn('[useAuthRouting] Could not auto-accept invite token:', err)
          navigate('/dashboard', { replace: true })
        })
      return
    }

    // Existing Organization Users / Fallback:
    navigate('/dashboard')
  }

  return {
    isAuthenticated,
    token,
    availableWorkspaces,
    loading,
    error,
    handlePostAuthRedirect,
  }
}

export default useAuthRouting

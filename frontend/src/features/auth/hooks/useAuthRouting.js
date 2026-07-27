import { useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'

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

  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)
  const token = useSelector((state) => state.auth.token)
  const availableWorkspaces = useSelector((state) => state.workspace.availableWorkspaces) || []
  const loading = useSelector((state) => state.auth.loading)
  const error = useSelector((state) => state.auth.error)

  /**
   * Evaluates authentication state and URL params to perform the appropriate redirect.
   */
  const handlePostAuthRedirect = () => {
    if (!isAuthenticated || !token) return

    // Parse URL query parameters
    const searchParams = new URLSearchParams(location.search)
    const intent = searchParams.get('intent')
    const inviteToken = searchParams.get('token')

    // 1. Invite Sign-up/Login Flow:
    // If we have an invite token, route to the accept-invite page with the token parameter
    if (inviteToken) {
      navigate(`/accept-invite/${inviteToken}`)
      return
    }

    // 2. Intent-Based Login/Signup:
    // If the intent parameter is set to "create" or "create-org", route directly to workspace setup
    if (intent === 'create' || intent === 'create-org') {
      navigate('/workspace-setup?intent=create')
      return
    }

    // 3. Onboarding Origin-Based Redirect:
    // If authenticated from register or login-createOrg, force workspace-setup with create intent.
    if (location.pathname === '/login-createOrg' || location.pathname === '/register') {
      navigate('/workspace-setup?intent=create')
      return
    }

    // 4. Decoupled Normal Registration / Login Flow:
    // If the user does not have any active workspaces (availableWorkspaces.length === 0),
    // they must set up a workspace first, so redirect to /workspace-setup.
    // Otherwise, drop them into the standard /dashboard.
    if (availableWorkspaces.length === 0) {
      navigate('/workspace-setup')
    } else {
      navigate('/dashboard')
    }
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

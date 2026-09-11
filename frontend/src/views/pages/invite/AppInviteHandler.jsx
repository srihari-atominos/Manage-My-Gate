import React, { useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { CSpinner } from '@coreui/react'

/**
 * AppInviteHandler (Legacy Route)
 *
 * Backward-compatibility redirect handler that smoothly redirects
 * legacy /invite/app/:token requests to the canonical universal /invite/:token entry point.
 */
export const AppInviteHandler = () => {
  const { token: routeToken } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const token = routeToken || searchParams.get('token') || ''

  useEffect(() => {
    if (token) {
      navigate(`/invite/${token}`, { replace: true })
    } else {
      navigate('/login', { replace: true })
    }
  }, [token, navigate])

  return (
    <div className="min-vh-100 d-flex flex-row align-items-center justify-content-center bg-dark text-white">
      <div className="text-center">
        <CSpinner color="primary" variant="grow" className="mb-3" />
        <h5>Redirecting to workspace invitation...</h5>
      </div>
    </div>
  )
}

export default AppInviteHandler

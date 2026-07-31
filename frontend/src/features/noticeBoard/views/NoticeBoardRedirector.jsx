import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth.js'

const NoticeBoardRedirector = () => {
  const navigate = useNavigate()
  const { checkPermission } = useAuth()

  useEffect(() => {
    if (checkPermission('notices:dashboard')) {
      navigate('/admin/notices/dashboard', { replace: true })
    } else if (checkPermission('notices:active_board')) {
      navigate('/notices/board', { replace: true })
    } else if (checkPermission('notices:manage_notices')) {
      navigate('/admin/notices/manage', { replace: true })
    } else if (checkPermission('notices:polls')) {
      navigate('/notices/polls', { replace: true })
    } else {
      navigate('/dashboard', { replace: true })
    }
  }, [checkPermission, navigate])

  return null
}

export default NoticeBoardRedirector

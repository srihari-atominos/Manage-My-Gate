import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth.js'

const NoticeBoardRedirector = () => {
  const navigate = useNavigate()
  const { checkPermission } = useAuth()

  useEffect(() => {
    if (checkPermission('notices:create')) {
      navigate('/admin/notices/dashboard', { replace: true })
    } else if (checkPermission('notices:read')) {
      navigate('/notices/board', { replace: true })
    } else {
      navigate('/dashboard', { replace: true })
    }
  }, [checkPermission, navigate])

  return null
}

export default NoticeBoardRedirector

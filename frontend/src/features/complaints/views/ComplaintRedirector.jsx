import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth'

const ComplaintRedirector = () => {
  const navigate = useNavigate()
  const { checkPermission } = useAuth()

  useEffect(() => {
    if (checkPermission('complaints:dashboard')) {
      navigate('/admin/complaints/dashboard', { replace: true })
    } else if (checkPermission('complaints:raise_ticket')) {
      navigate('/admin/complaints/create', { replace: true })
    } else if (checkPermission('complaints:track_requests')) {
      navigate('/admin/complaints/my-tickets', { replace: true })
    } else if (checkPermission('complaints:complaint_management')) {
      navigate('/admin/complaints/manage', { replace: true })
    } else if (checkPermission('complaints:staff_vendors')) {
      navigate('/admin/complaints/staff', { replace: true })
    } else if (checkPermission('complaints:assignee')) {
      navigate('/admin/complaints/assignee', { replace: true })
    } else {
      // Fallback
      navigate('/dashboard', { replace: true })
    }
  }, [checkPermission, navigate])

  return null
}

export default ComplaintRedirector

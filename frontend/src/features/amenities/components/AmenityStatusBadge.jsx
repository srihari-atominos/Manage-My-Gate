import React from 'react'
import { CBadge } from '@coreui/react'

export const AmenityStatusBadge = ({ status }) => {
  const getBadgeColor = (s) => {
    switch (s?.toLowerCase()) {
      case 'active':
      case 'completed':
      case 'approved':
        return 'success'
      case 'pending':
        return 'warning'
      case 'confirmed':
      case 'checked-in':
        return 'info'
      case 'cancelled':
      case 'rejected':
      case 'inactive':
        return 'danger'
      default:
        return 'secondary'
    }
  }

  return (
    <CBadge color={getBadgeColor(status)} shape="rounded-pill">
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
    </CBadge>
  )
}

export default AmenityStatusBadge

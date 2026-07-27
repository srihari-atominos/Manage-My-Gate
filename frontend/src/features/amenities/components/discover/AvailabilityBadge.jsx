import React, { memo } from 'react'
import { CBadge } from '@coreui/react'

const AvailabilityBadge = memo(({ isAvailable = true, text = 'Available' }) => {
  // In the future, this component will derive state from live booking slots
  return (
    <CBadge color={isAvailable ? 'success' : 'warning'} shape="rounded-pill" className="px-3 py-2">
      <i className={`fa-solid ${isAvailable ? 'fa-check-circle' : 'fa-clock'} me-2`}></i>
      {text}
    </CBadge>
  )
})

export default AvailabilityBadge

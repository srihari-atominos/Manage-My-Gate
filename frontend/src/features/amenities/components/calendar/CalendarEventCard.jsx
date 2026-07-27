import React, { memo } from 'react'
import AmenityStatusBadge from '../AmenityStatusBadge.jsx'

const CalendarEventCard = memo(({ event, onClick, isCompact = false }) => {
  // Simplified status color mapping
  const getColorClasses = (status) => {
    switch (status) {
      case 'approved':
      case 'confirmed':
        return 'bg-success bg-opacity-10 border-success text-success'
      case 'pending':
        return 'bg-warning bg-opacity-10 border-warning text-warning-dark'
      case 'cancelled':
      case 'rejected':
        return 'bg-danger bg-opacity-10 border-danger text-danger'
      case 'checked_in':
        return 'bg-info bg-opacity-10 border-info text-info-dark'
      default:
        return 'bg-secondary bg-opacity-10 border-secondary text-secondary'
    }
  }

  const colorClass = getColorClasses(event.colorKey)

  if (isCompact) {
    return (
      <div
        className={`p-1 mb-1 border rounded shadow-sm cursor-pointer d-flex align-items-center ${colorClass}`}
        style={{ lineHeight: 1.2, overflow: 'hidden', whiteSpace: 'nowrap' }}
        onClick={() => onClick(event)}
        title={`${event.title} - ${event.subtitle} (${event.start} - ${event.end})`}
        role="button"
        tabIndex="0"
        onKeyDown={(e) => {
          if (e.key === 'Enter') onClick(event)
        }}
      >
        <span className="fw-bold me-1">{event.start}</span>
        <span className="text-truncate">{event.title}</span>
      </div>
    )
  }

  return (
    <div
      className={`p-2 mb-2 border rounded shadow-sm cursor-pointer ${colorClass}`}
      onClick={() => onClick(event)}
      role="button"
      tabIndex="0"
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick(event)
      }}
    >
      <div className="d-flex justify-content-between align-items-start mb-1">
        <div className="fw-bold small text-truncate pe-2">{event.title}</div>
        <div className="small fw-bold">{event.start}</div>
      </div>
      <div className="small text-truncate mb-2" style={{ opacity: 0.85 }}>
        {event.subtitle}
      </div>
      <div className="d-flex justify-content-between align-items-end">
        <AmenityStatusBadge status={event.status} />
        <span className="small opacity-75">{event.end}</span>
      </div>
    </div>
  )
})

export default CalendarEventCard

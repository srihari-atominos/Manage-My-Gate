import React, { memo } from 'react';
import { CCard, CCardBody } from '@coreui/react';
import AmenityStatusBadge from '../AmenityStatusBadge.jsx';

const UpcomingBookingsWidget = memo(({ upcomingEvents, onEventClick }) => {
  if (!upcomingEvents || upcomingEvents.length === 0) {
    return (
      <CCard className="border-0 shadow-sm mb-4 bg-light text-center">
        <CCardBody className="p-4">
          <i className="fa-solid fa-calendar-check fs-2 text-muted mb-2"></i>
          <p className="text-muted mb-0 small">No upcoming bookings</p>
        </CCardBody>
      </CCard>
    );
  }

  // Display only the next 3
  const displayEvents = upcomingEvents.slice(0, 3);

  return (
    <CCard className="border-0 shadow-sm mb-4">
      <CCardBody className="p-0">
        <div className="p-3 border-bottom bg-light">
          <h6 className="fw-bold mb-0 text-uppercase text-muted" style={{ letterSpacing: '1px' }}>Upcoming Bookings</h6>
        </div>
        <div>
          {displayEvents.map((event, index) => (
            <div 
              key={event.id} 
              className={`p-3 cursor-pointer hover-bg-light ${index !== displayEvents.length - 1 ? 'border-bottom' : ''}`}
              onClick={() => onEventClick(event)}
              role="button"
              tabIndex="0"
              onKeyDown={(e) => { if (e.key === 'Enter') onEventClick(event); }}
            >
              <div className="fw-bold text-truncate mb-1">{event.amenityName}</div>
              <div className="small text-muted mb-2">
                <i className="fa-regular fa-calendar me-2"></i>
                {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} | {event.start}
              </div>
              <AmenityStatusBadge status={event.status} />
            </div>
          ))}
        </div>
      </CCardBody>
    </CCard>
  );
});

export default UpcomingBookingsWidget;

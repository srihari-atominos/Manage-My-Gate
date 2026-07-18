import React, { memo } from 'react';
import CalendarEventCard from './CalendarEventCard.jsx';

const AgendaRenderer = memo(({ events, onEventClick, onDateSelect }) => {
  if (!events || events.length === 0) {
    return (
      <div className="text-center p-5 border rounded bg-body-secondary">
        <i className="fa-solid fa-calendar-xmark fs-1 text-muted mb-3"></i>
        <h5 className="text-muted">No events scheduled</h5>
      </div>
    );
  }

  // Group events by date
  const groupedEvents = events.reduce((acc, event) => {
    const date = event.date || 'Unknown Date';
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedEvents).sort();

  return (
    <div className="calendar-agenda-view">
      {sortedDates.map(dateStr => (
        <div key={dateStr} className="mb-4">
          <h6 
            className="fw-bold mb-3 pb-2 border-bottom text-primary cursor-pointer" 
            onClick={() => onDateSelect && onDateSelect(dateStr)}
            style={{ cursor: 'pointer' }}
          >
            {new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h6>
          <div className="d-flex flex-column gap-2">
            {groupedEvents[dateStr].sort((a,b) => a.start.localeCompare(b.start)).map(event => (
              <CalendarEventCard key={event.id} event={event} onClick={onEventClick} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

export default AgendaRenderer;

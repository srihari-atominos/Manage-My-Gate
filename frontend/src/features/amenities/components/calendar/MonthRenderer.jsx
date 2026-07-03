import React, { memo } from 'react';
import CalendarEventCard from './CalendarEventCard.jsx';

const MonthRenderer = memo(({ currentDate, events, onEventClick }) => {
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = [];

  // Pad empty cells before the 1st
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  
  // Fill actual days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Pad empty cells after the last day to complete the grid (up to 42 cells, i.e. 6 rows)
  while (days.length % 7 !== 0) {
    days.push(null);
  }

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && 
           currentDate.getMonth() === today.getMonth() && 
           currentDate.getFullYear() === today.getFullYear();
  };

  const getEventsForDay = (day) => {
    if (!day) return [];
    // Format YYYY-MM-DD
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    // In our event model, date is already YYYY-MM-DD
    // If raw date is an ISO string, we'd slice it. Let's assume it's just prefix-matched.
    return events.filter(e => e.date && e.date.startsWith(dateStr));
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="calendar-month-grid border rounded shadow-sm bg-white overflow-hidden">
      {/* Header Row */}
      <div className="d-flex bg-light border-bottom">
        {weekDays.map(day => (
          <div key={day} className="flex-grow-1 text-center py-2 fw-bold text-muted small border-end" style={{ width: '14.28%' }}>
            {day}
          </div>
        ))}
      </div>
      
      {/* Days Grid */}
      <div className="d-flex flex-wrap">
        {days.map((day, index) => {
          const dayEvents = getEventsForDay(day);
          const todayMarker = day && isToday(day) ? 'bg-primary text-white rounded-circle' : '';
          
          return (
            <div 
              key={index} 
              className={`border-end border-bottom p-1 p-md-2 d-flex flex-column ${day ? 'bg-white' : 'bg-light bg-opacity-50'}`}
              style={{ width: '14.28%', minHeight: '120px' }}
            >
              {day && (
                <>
                  <div className="text-end mb-1">
                    <span className={`d-inline-block text-center small fw-semibold ${todayMarker}`} style={{ width: '24px', height: '24px', lineHeight: '24px' }}>
                      {day}
                    </span>
                  </div>
                  <div className="flex-grow-1 overflow-auto" style={{ maxHeight: '80px' }}>
                    {dayEvents.map(event => (
                      <CalendarEventCard key={event.id} event={event} onClick={onEventClick} isCompact={true} />
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default MonthRenderer;

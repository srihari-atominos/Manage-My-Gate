import React, { memo } from 'react';
import MonthRenderer from './MonthRenderer.jsx';
import AgendaRenderer from './AgendaRenderer.jsx';

const CalendarGrid = memo(({ viewMode, currentDate, events, onEventClick, monthIndicators, onDateSelect }) => {
  // Mobile devices can be detected if needed, or we just rely on CSS media queries hiding the month grid
  // For React, if viewMode is explicitly 'agenda', we show AgendaRenderer.
  // We'll treat 'week' and 'day' as Agenda views for this phase since complex timeline grids are deferred.

  if (viewMode === 'month') {
    return (
      <div className="d-none d-md-block">
        <MonthRenderer currentDate={currentDate} monthIndicators={monthIndicators} onDateSelect={onDateSelect} />
      </div>
    );
  }

  // Fallback for week/day/agenda or mobile month view (we hide the month grid on small screens)
  return <AgendaRenderer events={events} onEventClick={onEventClick} />;
});

export default CalendarGrid;

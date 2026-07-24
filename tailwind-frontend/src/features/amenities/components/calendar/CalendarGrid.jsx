import React, { memo } from 'react';
import MonthRenderer from './MonthRenderer.jsx';
import WeekRenderer from './WeekRenderer.jsx';
import DayRenderer from './DayRenderer.jsx';

const CalendarGrid = memo(({ viewMode, currentDate, events, onEventClick, monthIndicators, onDateSelect, selectedDate }) => {
  if (viewMode === 'week') {
    return <WeekRenderer currentDate={currentDate} events={events} onEventClick={onEventClick} onDateSelect={onDateSelect} />;
  }
  
  if (viewMode === 'day') {
    return <DayRenderer currentDate={currentDate} events={events} onEventClick={onEventClick} />;
  }

  return (
    <MonthRenderer currentDate={currentDate} events={events} onDateSelect={onDateSelect} selectedDate={selectedDate} />
  );
});

export default CalendarGrid;

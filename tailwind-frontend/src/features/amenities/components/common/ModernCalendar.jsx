import React, { useMemo } from 'react';

const ModernCalendar = ({ date, selectedDate, onDateSelect, bookedDays = [], renderDayContent }) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  
  const calendarData = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    
    const days = [];
    // Empty slots
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    // Actual days
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        day: d,
        isToday: d === today.getDate() && month === today.getMonth() && year === today.getFullYear(),
        isSelected: selectedDate && selectedDate.getDate() === d && selectedDate.getMonth() === month && selectedDate.getFullYear() === year,
        hasBooking: bookedDays.includes(d),
      });
    }
    return days;
  }, [year, month, selectedDate, bookedDays]);

  const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <>
      <div className="cal-grid">
        {DOW.map((day, idx) => (
          <div key={idx} className="cal-dow">{day}</div>
        ))}
      </div>
      <div className="cal-grid" style={{ marginTop: '8px' }}>
        {calendarData.map((data, idx) => {
          if (!data) return <div key={`empty-${idx}`} className="cal-day cal-day-empty"></div>;
          
          return (
            <div 
              key={`day-${data.day}`} 
              className={`cal-day ${data.isToday ? 'cal-day-today' : ''} ${data.isSelected ? 'selected' : ''}`}
              onClick={() => onDateSelect && onDateSelect(data.day)}
            >
              {data.day}
              {data.hasBooking && <span className="cal-day-dot"></span>}
              {renderDayContent && renderDayContent(data.day)}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default ModernCalendar;

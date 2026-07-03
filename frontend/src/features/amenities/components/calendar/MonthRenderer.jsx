import React, { memo } from 'react';

const MonthRenderer = memo(({ currentDate, monthIndicators = [], onDateSelect }) => {
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

  const hasIndicator = (day) => {
    if (!day) return false;
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return monthIndicators.includes(dateStr);
  };

  const handleCellClick = (day) => {
    if (!day) return;
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onDateSelect(dateStr);
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
          const showDot = hasIndicator(day);
          const todayMarker = day && isToday(day) ? 'bg-primary text-white rounded-circle' : '';
          
          return (
            <div 
              key={index} 
              className={`border-end border-bottom p-1 p-md-2 d-flex flex-column ${day ? 'bg-white cursor-pointer' : 'bg-light bg-opacity-50'}`}
              style={{ width: '14.28%', minHeight: '120px', cursor: day ? 'pointer' : 'default' }}
              onClick={() => handleCellClick(day)}
            >
              {day && (
                <>
                  <div className="text-end mb-1">
                    <span className={`d-inline-block text-center small fw-semibold ${todayMarker}`} style={{ width: '24px', height: '24px', lineHeight: '24px' }}>
                      {day}
                    </span>
                  </div>
                  <div className="flex-grow-1 d-flex justify-content-center align-items-center">
                    {showDot && (
                      <div className="bg-primary rounded-circle" style={{ width: '8px', height: '8px' }}></div>
                    )}
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

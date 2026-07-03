import React, { memo } from 'react';
import { CButton, CButtonGroup } from '@coreui/react';

const CalendarHeader = memo(({ currentDate, viewMode, setViewMode, navigateDate, setToday }) => {
  const formatHeader = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
      <div className="d-flex align-items-center gap-3">
        <CButton color="secondary" variant="outline" onClick={setToday}>Today</CButton>
        <CButtonGroup>
          <CButton color="secondary" variant="ghost" onClick={() => navigateDate(-1)} aria-label="Previous">
            <i className="fa-solid fa-chevron-left"></i>
          </CButton>
          <CButton color="secondary" variant="ghost" onClick={() => navigateDate(1)} aria-label="Next">
            <i className="fa-solid fa-chevron-right"></i>
          </CButton>
        </CButtonGroup>
        <h4 className="mb-0 fw-bold m-0" style={{ minWidth: '220px' }}>{formatHeader()}</h4>
      </div>

      <CButtonGroup>
        <CButton 
          color="secondary" 
          variant={viewMode === 'month' ? '' : 'outline'} 
          onClick={() => setViewMode('month')}
        >
          Month
        </CButton>
        <CButton 
          color="secondary" 
          variant={viewMode === 'week' ? '' : 'outline'} 
          onClick={() => setViewMode('week')}
        >
          Week
        </CButton>
        <CButton 
          color="secondary" 
          variant={viewMode === 'day' ? '' : 'outline'} 
          onClick={() => setViewMode('day')}
        >
          Day
        </CButton>
        <CButton 
          color="secondary" 
          variant={viewMode === 'agenda' ? '' : 'outline'} 
          onClick={() => setViewMode('agenda')}
          className="d-md-none" // Only show agenda toggle on mobile
        >
          Agenda
        </CButton>
      </CButtonGroup>
    </div>
  );
});

export default CalendarHeader;

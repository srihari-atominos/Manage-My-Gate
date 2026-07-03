import React, { useEffect, useState } from 'react';
import { CSpinner } from '@coreui/react';
import useAdminCalendar from '../hooks/useAdminCalendar.js';
import CalendarHeader from '../components/calendar/CalendarHeader.jsx';
import CalendarGrid from '../components/calendar/CalendarGrid.jsx';
import CalendarFilters from '../components/calendar/CalendarFilters.jsx';
import CalendarEventDrawer from '../components/calendar/CalendarEventDrawer.jsx';
import CalendarAnalytics from '../components/calendar/CalendarAnalytics.jsx';
import '../styles/_amenities.scss';

const AdminCalendarView = () => {
  const {
    visibleEvents,
    analytics,
    loading,
    error,
    viewMode,
    setViewMode,
    currentDate,
    navigateDate,
    setToday,
    filters,
    updateFilters,
    loadEvents
  } = useAdminCalendar();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setDrawerVisible(true);
  };

  return (
    <div className="amenities-module-wrapper amenity-os-theme">
      <div className="view-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Admin Calendar</h1>
            <p style={{ color: 'var(--text-muted)' }}>Manage and view all amenity bookings</p>
          </div>
        </div>

        <CalendarAnalytics analytics={analytics} />

        {error && <div className="alert alert-danger" style={{ marginBottom: '24px' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '24px', flexDirection: 'row', flexWrap: 'wrap' }}>
          {/* Sidebar Filters */}
          <div style={{ flex: '1 1 250px', maxWidth: '300px' }}>
            <CalendarFilters filters={filters} updateFilters={updateFilters} />
          </div>
          
          {/* Main Calendar Area */}
          <div style={{ flex: '3 1 600px' }} className="card">
            <CalendarHeader 
              currentDate={currentDate} 
              viewMode={viewMode} 
              setViewMode={setViewMode} 
              navigateDate={navigateDate} 
              setToday={setToday} 
            />
            
            {loading && visibleEvents.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><CSpinner /></div>
            ) : (
              <CalendarGrid 
                viewMode={viewMode}
                currentDate={currentDate}
                events={visibleEvents}
                onEventClick={handleEventClick}
              />
            )}
          </div>
        </div>

      <CalendarEventDrawer 
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        event={selectedEvent}
      />
      </div>
    </div>
  );
};

export default AdminCalendarView;

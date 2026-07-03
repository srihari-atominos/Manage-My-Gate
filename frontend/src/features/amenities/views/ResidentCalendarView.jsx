import React, { useEffect, useState } from 'react';
import { CSpinner } from '@coreui/react';
import { useNavigate } from 'react-router-dom';
import useResidentCalendar from '../hooks/useResidentCalendar.js';
import CalendarHeader from '../components/calendar/CalendarHeader.jsx';
import CalendarGrid from '../components/calendar/CalendarGrid.jsx';
import ResidentEventDrawer from '../components/residentCalendar/ResidentEventDrawer.jsx';
import UpcomingBookingsWidget from '../components/residentCalendar/UpcomingBookingsWidget.jsx';
import usePermission from '../../../hooks/usePermission.js';
import '../styles/_amenities.scss';

const ResidentCalendarView = () => {
  const navigate = useNavigate();
  const canCancel = usePermission('amenities', 'cancel_booking');
  const {
    rawEvents,
    upcomingEvents,
    loading,
    error,
    viewMode,
    setViewMode,
    currentDate,
    navigateDate,
    setToday,
    loadEvents,
    cancelBooking
  } = useResidentCalendar();

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
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>My Bookings</h1>
            <p style={{ color: 'var(--text-muted)' }}>Manage your upcoming and past amenity reservations</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/resident/amenities/discover')}>
            <i className="fa-solid fa-plus" style={{ marginRight: '8px' }}></i> Book Amenity
          </button>
        </div>

        {error && <div className="alert alert-danger" style={{ marginBottom: '24px' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '24px', flexDirection: 'row', flexWrap: 'wrap' }}>
          {/* Main Calendar Area */}
          <div style={{ flex: '3 1 600px' }} className="card">
            <CalendarHeader 
              currentDate={currentDate} 
              viewMode={viewMode} 
              setViewMode={setViewMode} 
              navigateDate={navigateDate} 
              setToday={setToday} 
            />
            
            {loading && rawEvents.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><CSpinner /></div>
            ) : (
              <CalendarGrid 
                viewMode={viewMode}
                currentDate={currentDate}
                events={rawEvents}
                onEventClick={handleEventClick}
              />
            )}
          </div>
          
          {/* Sidebar */}
          <div style={{ flex: '1 1 300px', maxWidth: '400px' }}>
            <UpcomingBookingsWidget upcomingEvents={upcomingEvents} onEventClick={handleEventClick} />
          </div>
        </div>

        <ResidentEventDrawer 
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          event={selectedEvent}
          onCancel={canCancel ? cancelBooking : null}
        />
      </div>
    </div>
  );
};

export default ResidentCalendarView;

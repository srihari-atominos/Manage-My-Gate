import React, { useState } from 'react';
import { useComplaints } from '../hooks/useComplaints';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';

const ComplaintCalendar = () => {
  const { calendarEvents, isLoading } = useComplaints();
  
  // Transform complaint data into calendar events
  const events = calendarEvents?.map(c => ({
    title: `${c.complaintNumber} - ${c.category}`,
    date: c.createdAt,
    extendedProps: { ...c }
  })) || [];

  return (
    <>
      <div className="page-header">
        <h1 id="pageTitle">Maintenance Calendar</h1>
        <div className="sub" id="pageSub">View scheduled maintenance and SLA deadlines</div>
      </div>
      
      <div className="content">
        <section className="screen active" id="calendar">
          <div className="card">
            {isLoading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>Loading Calendar...</div>
            ) : (
              <FullCalendar
                plugins={[ dayGridPlugin, timeGridPlugin ]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek'
                }}
                events={events}
                eventContent={(arg) => (
                  <div style={{ padding: '2px 4px', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <b>{arg.event.title}</b>
                  </div>
                )}
                height="auto"
              />
            )}
          </div>
        </section>
      </div>
    </>
  );
};

export default ComplaintCalendar;

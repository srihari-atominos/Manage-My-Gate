import React, { memo } from 'react';
import { CRow, CCol, CCard, CCardBody } from '@coreui/react';

const CalendarAnalytics = memo(({ analytics }) => {
  if (!analytics) return null;

  const bookingKpis = analytics.bookingKpis || {};
  const revenue = analytics.revenue || {};
  
  const todayBookings = bookingKpis.todayBookings || 0;
  const upcomingCount = bookingKpis.upcomingBookings || 0;
  const dailyRevenue = revenue.dailyRevenue || 0;
  
  const completed = bookingKpis.completedBookings || 0;
  const cancelled = (bookingKpis.cancelledBookings || 0) + (bookingKpis.rejectedBookings || 0);
  const active = bookingKpis.checkedInBookings || 0;
  const pending = bookingKpis.pendingBookings || 0;
  
  const currentlyInside = active;

  return (
    <CRow className="g-3 mb-4">
      {/* Top Row */}
      <CCol xs={6} md={3}>
        <CCard className="border-0 shadow-sm bg-primary text-white h-100">
          <CCardBody className="p-3">
            <div className="small text-uppercase fw-bold mb-1 opacity-75">Bookings Today</div>
            <div className="fs-3 fw-bold">{todayBookings}</div>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol xs={6} md={3}>
        <CCard className="border-0 shadow-sm bg-info text-white h-100">
          <CCardBody className="p-3">
            <div className="small text-uppercase fw-bold mb-1 opacity-75">Upcoming</div>
            <div className="fs-3 fw-bold">{upcomingCount}</div>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol xs={6} md={3}>
        <CCard className="border-0 shadow-sm bg-success text-white h-100">
          <CCardBody className="p-3">
            <div className="small text-uppercase fw-bold mb-1 opacity-75">Revenue Today</div>
            <div className="fs-3 fw-bold">₹{dailyRevenue}</div>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol xs={6} md={3}>
        <CCard className="border-0 shadow-sm bg-warning text-white h-100">
          <CCardBody className="p-3">
            <div className="small text-uppercase fw-bold mb-1 opacity-75">Currently Inside</div>
            <div className="fs-3 fw-bold">{currentlyInside}</div>
          </CCardBody>
        </CCard>
      </CCol>

      {/* Bottom Row */}
      <CCol xs={6} md={3}>
        <CCard className="border-0 shadow-sm h-100" style={{ backgroundColor: '#F8FAFC' }}>
          <CCardBody className="p-3">
            <div className="small text-uppercase fw-bold mb-1 text-muted">Active Bookings</div>
            <div className="fs-4 fw-bold text-dark">{active}</div>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol xs={6} md={3}>
        <CCard className="border-0 shadow-sm h-100" style={{ backgroundColor: '#F8FAFC' }}>
          <CCardBody className="p-3">
            <div className="small text-uppercase fw-bold mb-1 text-muted">Completed</div>
            <div className="fs-4 fw-bold text-dark">{completed}</div>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol xs={6} md={3}>
        <CCard className="border-0 shadow-sm h-100" style={{ backgroundColor: '#F8FAFC' }}>
          <CCardBody className="p-3">
            <div className="small text-uppercase fw-bold mb-1 text-muted">Pending</div>
            <div className="fs-4 fw-bold text-dark">{pending}</div>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol xs={6} md={3}>
        <CCard className="border-0 shadow-sm h-100" style={{ backgroundColor: '#FEF2F2' }}>
          <CCardBody className="p-3">
            <div className="small text-uppercase fw-bold mb-1 text-danger">Cancelled</div>
            <div className="fs-4 fw-bold text-danger">{cancelled}</div>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
});

export default CalendarAnalytics;

import React, { memo } from 'react';
import { CRow, CCol, CCard, CCardBody } from '@coreui/react';

const CalendarAnalytics = memo(({ analytics }) => {
  if (!analytics) return null;

  return (
    <CRow className="g-3 mb-4">
      <CCol xs={6} md={3}>
        <CCard className="border-0 shadow-sm bg-primary text-white h-100">
          <CCardBody className="p-3">
            <div className="small text-uppercase fw-bold mb-1 opacity-75">Total Bookings</div>
            <div className="fs-3 fw-bold">{analytics.total}</div>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol xs={6} md={3}>
        <CCard className="border-0 shadow-sm bg-success text-white h-100">
          <CCardBody className="p-3">
            <div className="small text-uppercase fw-bold mb-1 opacity-75">Confirmed</div>
            <div className="fs-3 fw-bold">{analytics.confirmed}</div>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol xs={6} md={3}>
        <CCard className="border-0 shadow-sm bg-info text-white h-100">
          <CCardBody className="p-3">
            <div className="small text-uppercase fw-bold mb-1 opacity-75">Checked-in</div>
            <div className="fs-3 fw-bold">{analytics.checkedIn}</div>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol xs={6} md={3}>
        <CCard className="border-0 shadow-sm bg-danger text-white h-100">
          <CCardBody className="p-3">
            <div className="small text-uppercase fw-bold mb-1 opacity-75">Cancelled</div>
            <div className="fs-3 fw-bold">{analytics.cancelled}</div>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
});

export default CalendarAnalytics;

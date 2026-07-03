import React, { memo } from 'react';
import { CCard, CCardBody, CFormInput, CFormSelect } from '@coreui/react';

const CalendarFilters = memo(({ filters, updateFilters }) => {
  return (
    <CCard className="border-0 shadow-sm mb-4">
      <CCardBody className="p-3">
        <h6 className="fw-bold mb-3 text-uppercase text-muted" style={{ letterSpacing: '1px' }}>Filters</h6>
        
        <div className="mb-3">
          <CFormInput 
            type="text" 
            placeholder="Search Resident or Amenity..." 
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
          />
        </div>

        <div className="mb-3">
          <label className="form-label small fw-semibold text-muted mb-1">Status</label>
          <CFormSelect value={filters.status} onChange={(e) => updateFilters({ status: e.target.value })}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved / Confirmed</option>
            <option value="checked_in">Checked In</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </CFormSelect>
        </div>

        {/* Future: Add Amenity Dropdown fetched from API */}
      </CCardBody>
    </CCard>
  );
});

export default CalendarFilters;

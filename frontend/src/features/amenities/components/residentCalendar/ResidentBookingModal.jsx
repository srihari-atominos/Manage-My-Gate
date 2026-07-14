import React, { memo, useState, useEffect } from 'react';
import { CModal, CModalHeader, CModalTitle, CModalBody, CSpinner } from '@coreui/react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllAmenitySlots } from '../../store/amenitySlice.js';

const ResidentBookingModal = memo(({ 
  visible, 
  onClose, 
  amenities, 
  onSlotSelect 
}) => {
  const dispatch = useDispatch();
  const { allSlots, slotsLoading } = useSelector(state => state.amenities);

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedAmenityId, setSelectedAmenityId] = useState('');

  const activeAmenities = amenities.filter(a => a.status === 'active');

  // Set default date to today when opened
  useEffect(() => {
    if (visible && !selectedDate) {
      const today = new Date();
      const localDateStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      setSelectedDate(localDateStr);
    }
  }, [visible, selectedDate]);

  // Fetch slots whenever date or amenity changes
  useEffect(() => {
    if (visible && selectedDate && selectedAmenityId) {
      dispatch(fetchAllAmenitySlots({ id: selectedAmenityId, date: selectedDate }));
    }
  }, [visible, selectedDate, selectedAmenityId, dispatch]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Available': return 'var(--success)';
      case 'Booked': return 'var(--danger)';
      case 'Maintenance': return 'var(--warning)';
      case 'Closed':
      default: return 'var(--secondary)';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Available': return 'badge-success';
      case 'Booked': return 'badge-danger';
      case 'Maintenance': return 'badge-warning';
      case 'Closed':
      default: return 'badge-secondary';
    }
  };

  const handleSlotClick = (slot) => {
    if (slot.status === 'Available') {
      onSlotSelect(selectedAmenityId, selectedDate, slot);
      onClose(); // Close this modal so they proceed to confirmation
    }
  };

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" size="lg">
      <CModalHeader>
        <CModalTitle>Book an Amenity</CModalTitle>
      </CModalHeader>
      <CModalBody style={{ minHeight: '300px' }}>
        
        <div className="row mb-4">
          <div className="col-md-6 mb-3 mb-md-0">
            <label className="fw-medium form-label" >Select Date</label>
            <input 
              type="date" 
              className="form-control" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="col-md-6">
            <label className="fw-medium form-label" >Select Amenity</label>
            <select 
              className="form-control" 
              value={selectedAmenityId} 
              onChange={(e) => setSelectedAmenityId(e.target.value)}
              style={{ borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            >
              <option value="">-- Choose Amenity --</option>
              {activeAmenities.map(a => (
                <option key={a._id} value={a._id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedAmenityId && selectedDate && (
          <div>
            <h6 style={{ color: 'var(--text-muted)', marginBottom: '12px' }} className="small">Available Slots</h6>
            {slotsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <CSpinner size="sm" />
              </div>
            ) : allSlots && allSlots.length > 0 ? (
              <div>
                {/* Legend */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }} className="small">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--success)' }}></div> Available</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--danger)' }}></div> Booked</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--warning)' }}></div> Maintenance</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--secondary)' }}></div> Closed</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
                  {allSlots.map((slot, index) => {
                    const isAvailable = slot.status === 'Available';
                    return (
                      <div 
                        key={index} 
                        onClick={() => handleSlotClick(slot)}
                        style={{ 
                          padding: '12px 8px', 
                          borderRadius: '8px',
                          border: `1px solid ${getStatusColor(slot.status)}`,
                          background: isAvailable ? 'transparent' : 'var(--bg-secondary)',
                          cursor: isAvailable ? 'pointer' : 'not-allowed',
                          opacity: isAvailable ? 1 : 0.6,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease'
                        }}
                        className={isAvailable ? 'slot-hover' : ''}
                      >
                        <div  className="fw-semibold small">{slot.startTime}</div>
                        <span className={`small badge ${getStatusBadgeClass(slot.status)}`} style={{ padding: '4px 8px' }}>{slot.status}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px', background: 'var(--bg-secondary)', borderRadius: '8px' }} className="small">
                No slots generated for this date.
              </div>
            )}
          </div>
        )}
      </CModalBody>
      <style>{`
        .slot-hover:hover {
          background-color: rgba(40, 167, 69, 0.1) !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
      `}</style>
    </CModal>
  );
});

export default ResidentBookingModal;

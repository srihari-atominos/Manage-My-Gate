import React, { memo } from 'react';
import { CCard, CCardBody, CButton, CSpinner } from '@coreui/react';

const TimeSlotSelector = memo(({ draft, availableSlots = [], slotsLoading, updateDraft, onNext, onBack, errorMsg }) => {
  return (
    <CCard className="border-0 shadow-sm mb-4">
      <CCardBody className="p-4">
        <h5 className="mb-3">Select Time Slot</h5>
        {errorMsg && <div className="alert alert-danger mb-4">{errorMsg}</div>}
        
        {slotsLoading ? (
          <div className="d-flex justify-content-center p-5"><CSpinner color="primary" /></div>
        ) : (
          <div className="d-flex flex-wrap gap-3 mb-4">
            {availableSlots.length === 0 ? (
              <div className="w-100 text-center p-4 text-muted border rounded">
                No slots available on this date.
              </div>
            ) : (
              availableSlots.map((slot, idx) => {
                const isSelected = draft.startTime === slot.startTime && draft.endTime === slot.endTime;
                return (
                  <div 
                    key={idx}
                    className={`p-3 rounded border text-center cursor-pointer ${isSelected ? 'border-primary bg-primary text-white' : 'border-secondary'}`}
                    style={{ cursor: 'pointer', minWidth: '120px' }}
                    onClick={() => updateDraft({ startTime: slot.startTime, endTime: slot.endTime, price: slot.price })}
                  >
                    <div className="fw-semibold">{slot.startTime} - {slot.endTime}</div>
                    <div className={isSelected ? 'text-white-50 small' : 'text-muted small'}>
                      {slot.price > 0 ? `$${slot.price.toFixed(2)}` : 'Free'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
        
        <div className="d-flex justify-content-between pt-3 border-top">
          <CButton color="secondary" variant="ghost" onClick={onBack} className="px-4 rounded-pill">
            <i className="fa-solid fa-arrow-left me-2"></i> Back
          </CButton>
          <CButton color="primary" onClick={onNext} className="px-5 rounded-pill shadow-sm" disabled={!draft.startTime || !draft.endTime}>
            Review Booking <i className="fa-solid fa-arrow-right ms-2"></i>
          </CButton>
        </div>
      </CCardBody>
    </CCard>
  );
});

export default TimeSlotSelector;

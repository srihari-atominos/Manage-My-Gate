import React, { memo } from 'react';
import { CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, CButton, CSpinner } from '@coreui/react';
import { formatCurrency } from '../../utils/amenityUtils.js';

const BookingConfirmationModal = memo(({ visible, onClose, onConfirm, isSubmitting, draft, amenity }) => {
  return (
    <CModal visible={visible} onClose={isSubmitting ? undefined : onClose} backdrop="static">
      <CModalHeader closeButton={!isSubmitting}>
        <CModalTitle>Confirm Booking</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {isSubmitting ? (
          <div className="text-center py-4">
            <CSpinner color="primary" className="mb-3" />
            <p className="mb-0 text-muted">Securing your slot...</p>
          </div>
        ) : (
          <div>
            <p>You are about to book <strong>{amenity?.name}</strong>.</p>
            <p className="mb-1"><strong>Date:</strong> {draft.bookingDate}</p>
            <p className="mb-1"><strong>Time:</strong> {draft.startTime} - {draft.endTime}</p>
            <p className="mb-0"><strong>Total:</strong> {formatCurrency(draft.totalPrice)}</p>
          </div>
        )}
      </CModalBody>
      {!isSubmitting && (
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={onClose}>Cancel</CButton>
          <CButton color="primary" onClick={onConfirm}>Confirm & Pay</CButton>
        </CModalFooter>
      )}
    </CModal>
  );
});

export default BookingConfirmationModal;

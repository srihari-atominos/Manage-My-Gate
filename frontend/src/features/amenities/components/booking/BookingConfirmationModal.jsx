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
            <p className="mb-1"><strong>Time:</strong> {draft.startTime} - {draft.endTime} ({draft.duration} min)</p>
            <hr className="my-2" />
            <p className="mb-1 d-flex justify-content-between"><span>Base Amount:</span> <span>{formatCurrency(draft.baseAmount || draft.price || 0)}</span></p>
            <p className="mb-1 d-flex justify-content-between"><span>Tax:</span> <span>{formatCurrency(draft.tax || 0)}</span></p>
            <p className="mb-1 d-flex justify-content-between"><span>Security Deposit:</span> <span>{formatCurrency(draft.deposit || 0)}</span></p>
            <hr className="my-2" />
            <p className="mb-0 d-flex justify-content-between"><strong>Total Amount:</strong> <strong>{formatCurrency(draft.totalPrice)}</strong></p>
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

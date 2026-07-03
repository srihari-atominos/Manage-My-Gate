import React, { memo, useState } from 'react';
import { COffcanvas, COffcanvasHeader, COffcanvasTitle, COffcanvasBody, CCloseButton, CRow, CCol, CButton, CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, CSpinner } from '@coreui/react';
import AmenityStatusBadge from '../AmenityStatusBadge.jsx';
import { formatCurrency } from '../../utils/amenityUtils.js';

const ResidentEventDrawer = memo(({ visible, onClose, event, onCancel }) => {
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  if (!event) return null;

  const handleCancelClick = () => {
    setCancelError('');
    setCancelModalVisible(true);
  };

  const confirmCancel = async () => {
    setIsCancelling(true);
    setCancelError('');
    try {
      await onCancel(event.id);
      setCancelModalVisible(false);
      onClose(); // Close drawer after successful cancel
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel booking. Please try again later.');
    } finally {
      setIsCancelling(false);
    }
  };

  const isCancellable = event.status === 'pending' || event.status === 'confirmed' || event.status === 'approved';

  return (
    <>
      <COffcanvas placement="end" visible={visible} onHide={onClose}>
        <COffcanvasHeader className="bg-light border-bottom">
          <COffcanvasTitle>My Booking</COffcanvasTitle>
          <CCloseButton className="text-reset" onClick={onClose} />
        </COffcanvasHeader>
        <COffcanvasBody>
          <div className="mb-4">
            <h4 className="fw-bold mb-3">{event.amenityName}</h4>
            <AmenityStatusBadge status={event.status} />
          </div>

          <div className="bg-light p-3 rounded mb-4 shadow-sm border border-opacity-50">
            <CRow className="g-3">
              <CCol xs={12}>
                <div className="small text-muted text-uppercase fw-bold mb-1">Date</div>
                <div className="fw-semibold">{new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
              </CCol>
              <CCol xs={12}>
                <div className="small text-muted text-uppercase fw-bold mb-1">Time</div>
                <div className="fw-semibold">{event.start} - {event.end}</div>
              </CCol>
            </CRow>
          </div>

          <div className="bg-light p-3 rounded mb-4 shadow-sm border border-opacity-50">
            <CRow className="g-3">
              <CCol xs={6}>
                <div className="small text-muted text-uppercase fw-bold mb-1">Total Paid</div>
                <div className="fw-semibold">{formatCurrency(event.price)}</div>
              </CCol>
              <CCol xs={6}>
                <div className="small text-muted text-uppercase fw-bold mb-1">Payment Status</div>
                <div className="fw-semibold text-capitalize">{event.paymentStatus}</div>
              </CCol>
            </CRow>
          </div>

          <hr />

          <div className="d-grid gap-3 mt-auto pt-4">
            {event.qrCode ? (
              <div className="text-center mb-3">
                <p className="text-muted small fw-bold mb-2">ACCESS QR PASS</p>
                <img src={event.qrCode} alt="QR Code" style={{ width: '150px', height: '150px' }} />
                <p className="text-muted small mt-2">Scan at the amenity entrance</p>
              </div>
            ) : (
              <CButton color="primary" variant="outline" disabled>
                <i className="fa-solid fa-qrcode me-2"></i> QR Pass Generating...
              </CButton>
            )}

            {isCancellable && onCancel && (
              <CButton color="danger" variant="ghost" onClick={handleCancelClick}>
                Cancel Booking
              </CButton>
            )}
          </div>
        </COffcanvasBody>
      </COffcanvas>

      {/* Cancellation Confirmation Modal */}
      <CModal visible={cancelModalVisible} onClose={isCancelling ? undefined : () => setCancelModalVisible(false)} backdrop="static">
        <CModalHeader closeButton={!isCancelling}>
          <CModalTitle>Cancel Booking</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {isCancelling ? (
            <div className="text-center py-4">
              <CSpinner color="danger" className="mb-3" />
              <p className="mb-0 text-muted">Cancelling your booking...</p>
            </div>
          ) : (
            <div>
              <p>Are you sure you want to cancel your booking for <strong>{event.amenityName}</strong> on <strong>{event.date}</strong>?</p>
              <p className="text-muted small mb-0">Depending on the amenity rules, deposits may not be fully refundable if cancelled within 24 hours.</p>
              {cancelError && <div className="alert alert-danger mt-3 mb-0">{cancelError}</div>}
            </div>
          )}
        </CModalBody>
        {!isCancelling && (
          <CModalFooter>
            <CButton color="secondary" variant="ghost" onClick={() => setCancelModalVisible(false)}>Keep Booking</CButton>
            <CButton color="danger" onClick={confirmCancel}>Confirm Cancellation</CButton>
          </CModalFooter>
        )}
      </CModal>
    </>
  );
});

export default ResidentEventDrawer;

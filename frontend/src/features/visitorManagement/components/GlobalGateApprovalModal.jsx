import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CBadge
} from '@coreui/react';
import toast from 'react-hot-toast';
import { resolveWalkIn, clearActiveGateRequest } from '../store/visitorLogSlice.js';

export const GlobalGateApprovalModal = () => {
  const dispatch = useDispatch();
  const activeGateRequest = useSelector((state) => state.visitorLog.activeGateRequest);

  if (!activeGateRequest) return null;

  const handleClose = () => {
    dispatch(clearActiveGateRequest());
  };

  const handleAction = async (status) => {
    try {
      const id = activeGateRequest._id || activeGateRequest.id;
      const statusText = status === 'APPROVE' ? 'APPROVED' : 'DENIED';
      
      await dispatch(resolveWalkIn({ id, status })).unwrap();
      
      toast.success(`Gate request resolved as ${statusText.toLowerCase()} successfully!`);
      handleClose();
    } catch (err) {
      toast.error(err.message || `Failed to resolve gate request.`);
    }
  };

  const visitorName = activeGateRequest.visitorName || activeGateRequest.snapshot?.visitorName || 'Walk-in Visitor';
  const company = activeGateRequest.company || activeGateRequest.snapshot?.company || 'Walk-in';
  const purpose = activeGateRequest.purpose || activeGateRequest.snapshot?.purpose || 'Visit';
  const vehicle = activeGateRequest.vehicle || activeGateRequest.snapshot?.vehicleNumber || '—';
  const gateNumber = activeGateRequest.gateNumber || activeGateRequest.snapshot?.gateNumber || 'Gate 1';
  const photoUrl = activeGateRequest.photoUrl || activeGateRequest.snapshot?.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60';
  const idProofType = activeGateRequest.idProofType || activeGateRequest.snapshot?.idProofType || 'None';
  const idProofNumber = activeGateRequest.idProofNumber || activeGateRequest.snapshot?.idProofNumber || '';

  return (
    <CModal visible={!!activeGateRequest} onClose={handleClose} alignment="center" backdrop="static">
      <CModalHeader closeButton>
        <CModalTitle className="fw-bold text-primary">
          🔔 Incoming Gate Request
        </CModalTitle>
      </CModalHeader>
      <CModalBody className="py-4">
        <div className="d-flex align-items-center gap-3 mb-4">
          <img 
            src={photoUrl} 
            alt={visitorName}
            style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary, #0084FF)' }}
          />
          <div>
            <h4 className="m-0 fw-bold text-dark">{visitorName}</h4>
            <div className="d-flex gap-2 align-items-center mt-1">
              <CBadge color="primary">{company}</CBadge>
              <span className="text-muted small">{gateNumber}</span>
            </div>
          </div>
        </div>

        <div className="bg-light p-3 rounded shadow-sm border">
          <div className="mb-2">
            <strong>Purpose:</strong> <span className="text-muted">{purpose}</span>
          </div>
          <div className="mb-2">
            <strong>Vehicle Number:</strong> <span className="text-muted">{vehicle}</span>
          </div>
          {idProofType && idProofType !== 'None' && (
            <div>
              <strong>ID Proof:</strong> <span className="text-muted">{idProofType}: {idProofNumber}</span>
            </div>
          )}
        </div>
      </CModalBody>
      <CModalFooter className="justify-content-between border-top-0 pt-0">
        <CButton 
          color="danger" 
          className="text-white fw-bold px-4 py-2"
          onClick={() => handleAction('REJECT')}
          style={{ minWidth: '120px' }}
        >
          ✖ Deny Entry
        </CButton>
        <CButton 
          color="success" 
          className="text-white fw-bold px-4 py-2"
          onClick={() => handleAction('APPROVE')}
          style={{ minWidth: '120px' }}
        >
          ✔ Approve Entry
        </CButton>
      </CModalFooter>
    </CModal>
  );
};

export default GlobalGateApprovalModal;

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CRow,
  CCol,
  CBadge,
  CSpinner,
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CAlert
} from '@coreui/react';
import { fetchVillaByIdAsync } from '../store/villaSlice';
import { inviteUserAsync } from '../../userManagement/store/userSlice';
import toast from 'react-hot-toast';

export const VillaDetailsModal = ({ visible, onClose, villaId }) => {
  const dispatch = useDispatch();
  const { selectedVilla, selectedVillaLoading } = useSelector((state) => state.villa);
  
  // Local state for sending invitations
  const [inviteEmail, setInviteEmail] = useState('');
  const [residentType, setResidentType] = useState('Owner');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState(null);

  useEffect(() => {
    if (visible && villaId) {
      dispatch(fetchVillaByIdAsync(villaId));
    }
  }, [dispatch, visible, villaId]);

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setInviteError(null);

    // Map residentType to roleName
    let roleName = 'Family Member';
    if (residentType === 'Owner') roleName = 'Resident Owner';
    if (residentType === 'Tenant') roleName = 'Resident Tenant';

    try {
      // Dispatch inviteUserAsync
      const actionResult = await dispatch(inviteUserAsync({
        email: inviteEmail.trim(),
        villaId,
        residentType,
        roleName
      }));

      if (inviteUserAsync.fulfilled.match(actionResult)) {
        toast.success(`Invitation sent successfully to ${inviteEmail}`);
        setInviteEmail('');
        // Reload details to show pending resident
        dispatch(fetchVillaByIdAsync(villaId));
      } else {
        setInviteError(actionResult.payload || 'Failed to send invitation');
      }
    } catch (err) {
      setInviteError(err.message || 'Invitation failed');
    } finally {
      setInviting(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Pending':
        return 'warning';
      default:
        return 'danger';
    }
  };

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      className="villa-details-modal"
      size="lg"
      alignment="center"
    >
      {selectedVillaLoading || !selectedVilla ? (
        <CModalBody className="text-center py-5">
          <CSpinner color="primary" className="mb-2" />
          <div>Loading villa details...</div>
        </CModalBody>
      ) : (
        <>
          <CModalHeader>
            <CModalTitle style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              {selectedVilla.villa.villaNumber} Details
            </CModalTitle>
          </CModalHeader>
          <CModalBody>
            <CRow className="mb-4">
              <CCol sm={4}>
                <div className="text-muted small">BLOCK/PHASE</div>
                <div className="fw-bold">{selectedVilla.villa.block || 'None'}</div>
              </CCol>
              <CCol sm={4}>
                <div className="text-muted small">CONFIGURATION</div>
                <div className="fw-bold">{selectedVilla.villa.configuration || 'Not Configured'}</div>
              </CCol>
              <CCol sm={4}>
                <div className="text-muted small">OCCUPANCY STATUS</div>
                <div>
                  <CBadge color={selectedVilla.villa.occupancyStatus === 'Vacant' ? 'secondary' : selectedVilla.villa.occupancyStatus === 'Owner Occupied' ? 'success' : 'info'}>
                    {selectedVilla.villa.occupancyStatus}
                  </CBadge>
                </div>
              </CCol>
            </CRow>
            
            <CRow>
              {/* Residents List */}
              <CCol md={6} className="border-end pe-md-4">
                <h5 className="mb-3" style={{ fontSize: '0.95rem', fontWeight: 700 }}>Residents Directory</h5>
                
                {selectedVilla.residents.length === 0 ? (
                  <div className="text-center py-4 text-muted small bg-light rounded">
                    No residents registered to this villa yet.
                  </div>
                ) : (
                  <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    {selectedVilla.residents.map((res) => (
                      <div key={res.id} className="resident-list-item">
                        <div className="resident-avatar">
                          {res.name ? res.name.charAt(0).toUpperCase() : (res.email ? res.email.charAt(0).toUpperCase() : 'U')}
                        </div>
                        <div className="resident-info">
                          <div className="resident-name">{res.name || res.email.split('@')[0]}</div>
                          <div className="resident-email">{res.email}</div>
                          <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                            Type: <span className="fw-semibold">{res.residentType}</span>
                          </div>
                        </div>
                        <CBadge color={getStatusBadgeColor(res.status)} size="sm">
                          {res.status}
                        </CBadge>
                      </div>
                    ))}
                  </div>
                )}
              </CCol>

              {/* Onboard Resident Form */}
              <CCol md={6} className="ps-md-4 mt-4 mt-md-0">
                <h5 className="mb-3" style={{ fontSize: '0.95rem', fontWeight: 700 }}>Onboard Resident</h5>
                {inviteError && (
                  <CAlert color="danger" className="py-2 small">
                    {inviteError}
                  </CAlert>
                )}
                
                <CForm onSubmit={handleInviteSubmit}>
                  <div className="mb-3">
                    <CFormLabel htmlFor="invite-email" className="small fw-semibold">Email Address</CFormLabel>
                    <CFormInput
                      id="invite-email"
                      type="email"
                      placeholder="resident@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      size="sm"
                    />
                  </div>
                  <div className="mb-3">
                    <CFormLabel htmlFor="resident-type" className="small fw-semibold">Residency Type</CFormLabel>
                    <CFormSelect
                      id="resident-type"
                      value={residentType}
                      onChange={(e) => setResidentType(e.target.value)}
                      size="sm"
                    >
                      <option value="Owner">Resident Owner</option>
                      <option value="Tenant">Resident Tenant</option>
                      <option value="Family">Family Member</option>
                    </CFormSelect>
                  </div>
                  <CButton
                    type="submit"
                    color="primary"
                    size="sm"
                    className="w-100 fw-semibold"
                    disabled={inviting || !inviteEmail.trim()}
                  >
                    {inviting ? 'Sending Invite...' : 'Send Onboarding Invite'}
                  </CButton>
                </CForm>
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" size="sm" onClick={onClose}>
              Close
            </CButton>
          </CModalFooter>
        </>
      )}
    </CModal>
  );
};

VillaDetailsModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  villaId: PropTypes.string,
};

export default VillaDetailsModal;

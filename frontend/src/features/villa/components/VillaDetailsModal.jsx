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
  CAlert,
  CNav,
  CNavItem,
  CNavLink
} from '@coreui/react';
import { fetchVillaByIdAsync } from '../store/villaSlice';
import { inviteUserAsync } from '../../userManagement/store/userSlice';
import useVilla from '../hooks/useVilla';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export const VillaDetailsModal = ({ visible, onClose, villaId }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { selectedVilla, selectedVillaLoading } = useSelector((state) => state.villa);
  
  // Custom hook containing state selectors and dispatch controller wrappers
  const {
    workspaceUsers,
    fetchWorkspaceUsers,
    assignExistingUser,
    updateResidencyType,
    removeResident
  } = useVilla();
  
  // Tab states: 1 = Assign Existing, 2 = Invite via Email
  const [activeTab, setActiveTab] = useState(1);

  // Form states for Tab 1 (Assign Existing)
  const [assignUserId, setAssignUserId] = useState('');
  const [residencyType, setResidencyType] = useState('Tenant');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState(null);

  // Form states for Tab 2 (Invite via Email)
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteResidencyType, setInviteResidencyType] = useState('Tenant');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState(null);

  // Inline residency type editor states
  const [editingUserId, setEditingUserId] = useState(null);
  const [editResidencyType, setEditResidencyType] = useState('Tenant');

  useEffect(() => {
    if (visible) {
      if (villaId) {
        dispatch(fetchVillaByIdAsync(villaId));
      }
      fetchWorkspaceUsers();
    }
  }, [dispatch, visible, villaId, fetchWorkspaceUsers]);

  const handleAssignExistingSubmit = async (e) => {
    e.preventDefault();
    if (!assignUserId) return;

    setAssigning(true);
    setAssignError(null);

    try {
      await assignExistingUser(villaId, assignUserId, residencyType);
      toast.success(t('villas.details.assignSuccess', 'Resident assigned successfully'));
      setAssignUserId('');
      // Reload details
      dispatch(fetchVillaByIdAsync(villaId));
    } catch (err) {
      setAssignError(err || t('villas.details.assignFailed', 'Failed to assign resident'));
    } finally {
      setAssigning(false);
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setInviteError(null);

    // Map residencyType to roleName
    let roleName = 'Family Member';
    if (inviteResidencyType === 'Resident Owner' || inviteResidencyType === 'Non-Resident Owner') {
      roleName = 'Resident Owner';
    } else if (inviteResidencyType === 'Tenant') {
      roleName = 'Resident Tenant';
    }

    try {
      const actionResult = await dispatch(inviteUserAsync({
        email: inviteEmail.trim(),
        villaId,
        residentType: inviteResidencyType,
        roleName
      }));

      if (inviteUserAsync.fulfilled.match(actionResult)) {
        toast.success(t('villas.details.inviteSuccess', `Invitation sent successfully to ${inviteEmail}`));
        setInviteEmail('');
        dispatch(fetchVillaByIdAsync(villaId));
      } else {
        setInviteError(actionResult.payload || t('villas.details.inviteFailed', 'Failed to send invitation'));
      }
    } catch (err) {
      setInviteError(err.message || t('villas.details.inviteFailed', 'Invitation failed'));
    } finally {
      setInviting(false);
    }
  };

  const startEditResidencyType = (resident) => {
    setEditingUserId(resident.id);
    setEditResidencyType(resident.residentType || 'Tenant');
  };

  const handleSaveResidencyType = async (userId) => {
    try {
      await updateResidencyType(villaId, userId, editResidencyType);
      toast.success(t('villas.details.updateTypeSuccess', 'Residency type updated successfully'));
      setEditingUserId(null);
      dispatch(fetchVillaByIdAsync(villaId));
    } catch (err) {
      toast.error(err || t('villas.details.updateTypeFailed', 'Failed to update residency type'));
    }
  };

  const handleRemoveResident = async (userId) => {
    if (!window.confirm(t('villas.details.confirmRemove', 'Are you sure you want to remove this resident from the unit?'))) {
      return;
    }
    try {
      await removeResident(villaId, userId);
      toast.success(t('villas.details.removeSuccess', 'Resident removed successfully'));
      dispatch(fetchVillaByIdAsync(villaId));
    } catch (err) {
      toast.error(err || t('villas.details.removeFailed', 'Failed to remove resident'));
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
      size="lg"
      alignment="center"
      className="villa-details-modal"
    >
      {selectedVillaLoading || !selectedVilla ? (
        <CModalBody className="text-center py-5">
          <CSpinner color="primary" className="mb-2" />
          <div>{t('villas.details.loading', 'Loading unit details...')}</div>
        </CModalBody>
      ) : (
        <>
          <CModalHeader>
            <CModalTitle style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              {t('villas.details.titlePattern', { number: selectedVilla.villa.unitNumber, defaultValue: `${selectedVilla.villa.unitNumber} Details` })}
            </CModalTitle>
          </CModalHeader>
          <CModalBody>
            <CRow className="mb-4">
              <CCol sm={3}>
                <div className="text-muted small">{t('villas.details.blockOrBuilding', 'BLOCK/BUILDING')}</div>
                <div className="fw-bold">{selectedVilla.villa.blockOrBuilding || '—'}</div>
              </CCol>
              <CCol sm={3}>
                <div className="text-muted small">{t('villas.details.type', 'TYPE')}</div>
                <div className="fw-bold">{t(`villas.types.${selectedVilla.villa.type}`, selectedVilla.villa.type)}</div>
              </CCol>
              <CCol sm={3}>
                <div className="text-muted small">{t('villas.details.status', 'OCCUPANCY STATUS')}</div>
                <div>
                  <CBadge color={selectedVilla.villa.status === 'Vacant' ? 'secondary' : selectedVilla.villa.status === 'Occupied' ? 'success' : 'info'}>
                    {t(`villas.statusTypes.${selectedVilla.villa.status}`, selectedVilla.villa.status)}
                  </CBadge>
                </div>
              </CCol>
              <CCol sm={3}>
                <div className="text-muted small">{t('villas.details.floorArea', 'FLOOR AREA')}</div>
                <div className="fw-bold">
                  {selectedVilla.villa.floorAreaSqFt ? `${selectedVilla.villa.floorAreaSqFt} Sq Ft` : '—'}
                </div>
              </CCol>
            </CRow>
            
            <CRow>
              {/* Left Column: Residents Directory */}
              <CCol md={6} className="border-end pe-md-4">
                <h5 className="mb-3 text-primary" style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                  {t('villas.details.directory', 'Residents Directory')}
                </h5>
                
                {selectedVilla.residents.length === 0 ? (
                  <div className="text-center py-4 text-muted small bg-light rounded">
                    {t('villas.details.noResidents', 'No residents registered to this unit yet.')}
                  </div>
                ) : (
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {selectedVilla.residents.map((res) => {
                      const isEditing = editingUserId === res.id;

                      return (
                        <div key={res.id} className="resident-list-item d-flex flex-column p-2 mb-2 border rounded bg-white">
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2">
                              <div className="resident-avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px', fontSize: '0.85rem', fontWeight: 600 }}>
                                {res.name ? res.name.charAt(0).toUpperCase() : (res.email ? res.email.charAt(0).toUpperCase() : 'U')}
                              </div>
                              <div>
                                <div className="resident-name fw-semibold small" style={{ fontSize: '0.85rem' }}>
                                  {res.name || res.email?.split('@')[0]}
                                </div>
                                <div className="resident-email text-muted" style={{ fontSize: '0.75rem' }}>
                                  {res.email}
                                </div>
                              </div>
                            </div>
                            <div className="d-flex flex-column align-items-end gap-1">
                              <CBadge color={getStatusBadgeColor(res.status)} size="sm">
                                {res.status}
                              </CBadge>
                              <CBadge color="info" size="sm">
                                {t(`villas.details.roles.${res.residentType}`, res.residentType)}
                              </CBadge>
                            </div>
                          </div>

                          {/* Residency Type Editor / Actions Panel */}
                          <div className="mt-2 border-top pt-2">
                            {isEditing ? (
                              <div className="d-flex align-items-center gap-1">
                                <CFormSelect
                                  size="sm"
                                  value={editResidencyType}
                                  onChange={(e) => setEditResidencyType(e.target.value)}
                                  style={{ fontSize: '0.75rem' }}
                                >
                                  <option value="Tenant">{t('villas.details.tenantOpt', 'Tenant')}</option>
                                  <option value="Resident Owner">{t('villas.details.ownerOpt', 'Resident Owner')}</option>
                                  <option value="Family Member">{t('villas.details.familyOpt', 'Family Member')}</option>
                                  <option value="Non-Resident Owner">{t('villas.details.nonResOwnerOpt', 'Non-Resident Owner')}</option>
                                  <option value="Staff">{t('villas.details.staffOpt', 'Staff')}</option>
                                </CFormSelect>
                                <CButton
                                  size="sm"
                                  color="success"
                                  onClick={() => handleSaveResidencyType(res.id)}
                                  className="text-white py-1 px-2"
                                  style={{ fontSize: '0.7rem' }}
                                >
                                  {t('villas.details.save', 'Save')}
                                </CButton>
                                <CButton
                                  size="sm"
                                  color="light"
                                  onClick={() => setEditingUserId(null)}
                                  className="py-1 px-2"
                                  style={{ fontSize: '0.7rem' }}
                                >
                                  {t('villas.details.cancel', 'Cancel')}
                                </CButton>
                              </div>
                            ) : (
                              <div className="d-flex gap-2">
                                <CButton
                                  color="link"
                                  className="p-0 text-decoration-none"
                                  style={{ fontSize: '0.7rem' }}
                                  onClick={() => startEditResidencyType(res)}
                                >
                                  {t('villas.details.editType', 'Edit Type')}
                                </CButton>
                                <span className="text-muted" style={{ fontSize: '0.7rem' }}>|</span>
                                <CButton
                                  color="link"
                                  className="p-0 text-decoration-none text-danger"
                                  style={{ fontSize: '0.7rem' }}
                                  onClick={() => handleRemoveResident(res.id)}
                                >
                                  {t('villas.details.remove', 'Remove')}
                                </CButton>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CCol>

              {/* Right Column: Tabbed Assignment Controls */}
              <CCol md={6} className="ps-md-4 mt-4 mt-md-0">
                <CNav variant="tabs" className="mb-3">
                  <CNavItem>
                    <CNavLink
                      active={activeTab === 1}
                      onClick={() => setActiveTab(1)}
                      style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                      {t('villas.details.tabs.assignExisting', 'Assign Existing')}
                    </CNavLink>
                  </CNavItem>
                  <CNavItem>
                    <CNavLink
                      active={activeTab === 2}
                      onClick={() => setActiveTab(2)}
                      style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                      {t('villas.details.tabs.inviteEmail', 'Invite Resident')}
                    </CNavLink>
                  </CNavItem>
                </CNav>

                {/* Tab Content 1: Assign Existing Workspace User */}
                {activeTab === 1 && (
                  <div>
                    {assignError && (
                      <CAlert color="danger" className="py-2 small">
                        {assignError}
                      </CAlert>
                    )}
                    <CForm onSubmit={handleAssignExistingSubmit}>
                      <div className="mb-3">
                        <CFormLabel htmlFor="assign-user-select" className="small fw-semibold">
                          {t('villas.details.selectUser', 'Select User')}
                        </CFormLabel>
                        <CFormSelect
                          id="assign-user-select"
                          value={assignUserId}
                          onChange={(e) => setAssignUserId(e.target.value)}
                          size="sm"
                          required
                        >
                          <option value="">{t('villas.details.chooseUser', 'Choose a user...')}</option>
                          {workspaceUsers
                            .filter((u) => !selectedVilla.residents.some((r) => r.id === u.id))
                            .map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name || u.email} ({u.email})
                              </option>
                            ))}
                        </CFormSelect>
                      </div>
                      <div className="mb-3">
                        <CFormLabel htmlFor="assign-residency-type" className="small fw-semibold">
                          {t('villas.details.residencyType', 'Residency Type')}
                        </CFormLabel>
                        <CFormSelect
                          id="assign-residency-type"
                          value={residencyType}
                          onChange={(e) => setResidencyType(e.target.value)}
                          size="sm"
                        >
                          <option value="Tenant">{t('villas.details.tenantOpt', 'Tenant')}</option>
                          <option value="Resident Owner">{t('villas.details.ownerOpt', 'Resident Owner')}</option>
                          <option value="Family Member">{t('villas.details.familyOpt', 'Family Member')}</option>
                          <option value="Non-Resident Owner">{t('villas.details.nonResOwnerOpt', 'Non-Resident Owner')}</option>
                          <option value="Staff">{t('villas.details.staffOpt', 'Staff')}</option>
                        </CFormSelect>
                      </div>
                      <CButton
                        type="submit"
                        color="primary"
                        size="sm"
                        className="w-100 fw-semibold"
                        disabled={assigning || !assignUserId}
                      >
                        {assigning ? t('villas.details.assigning', 'Assigning...') : t('villas.details.assignUserBtn', 'Assign User')}
                      </CButton>
                    </CForm>
                  </div>
                )}

                {/* Tab Content 2: Invite Resident via Email */}
                {activeTab === 2 && (
                  <div>
                    {inviteError && (
                      <CAlert color="danger" className="py-2 small">
                        {inviteError}
                      </CAlert>
                    )}
                    <CForm onSubmit={handleInviteSubmit}>
                      <div className="mb-3">
                        <CFormLabel htmlFor="invite-email" className="small fw-semibold">
                          {t('villas.details.emailLabel', 'Email Address')}
                        </CFormLabel>
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
                        <CFormLabel htmlFor="invite-resident-type" className="small fw-semibold">
                          {t('villas.details.typeLabel', 'Residency Type')}
                        </CFormLabel>
                        <CFormSelect
                          id="invite-resident-type"
                          value={inviteResidencyType}
                          onChange={(e) => setInviteResidencyType(e.target.value)}
                          size="sm"
                        >
                          <option value="Tenant">{t('villas.details.tenantOpt', 'Tenant')}</option>
                          <option value="Resident Owner">{t('villas.details.ownerOpt', 'Resident Owner')}</option>
                          <option value="Family Member">{t('villas.details.familyOpt', 'Family Member')}</option>
                          <option value="Non-Resident Owner">{t('villas.details.nonResOwnerOpt', 'Non-Resident Owner')}</option>
                          <option value="Staff">{t('villas.details.staffOpt', 'Staff')}</option>
                        </CFormSelect>
                      </div>
                      <CButton
                        type="submit"
                        color="primary"
                        size="sm"
                        className="w-100 fw-semibold"
                        disabled={inviting || !inviteEmail.trim()}
                      >
                        {inviting ? t('villas.details.sending', 'Sending Invite...') : t('villas.details.sendInvite', 'Send Onboarding Invite')}
                      </CButton>
                    </CForm>
                  </div>
                )}
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" size="sm" onClick={onClose}>
              {t('villas.details.close', 'Close')}
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

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { CFormLabel, CFormInput, CButton, CFormSelect } from '@coreui/react';

export const GuardInviteVisitorForm = ({ 
  dbVillas = [], 
  dbUsers = [], 
  loadingDirectory = false, 
  onInitiateWalkIn, 
  onCheckInSuccess 
}) => {
  // Visitor Details
  const [visitorName, setVisitorName] = useState('');
  const [idProofNumber, setIdProofNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');

  // Host Selection States
  const [inviteMethod, setInviteMethod] = useState('villa'); // 'villa' | 'admin'

  // Selected Host Targets
  const [selectedVillaId, setSelectedVillaId] = useState('');
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [adminSearch, setAdminSearch] = useState('');

  // Derived filtered lists
  const residentsOfSelectedVilla = dbUsers.filter(u => u.villaId === selectedVillaId);
  
  const communityAdmins = dbUsers.filter(u => 
    u.role === 'Community Admin' || 
    u.role?.toLowerCase().includes('admin')
  );

  const filteredAdmins = communityAdmins.filter(admin => 
    admin.name?.toLowerCase().includes(adminSearch.toLowerCase()) ||
    admin.email?.toLowerCase().includes(adminSearch.toLowerCase())
  );

  // Auto select default resident or admin
  useEffect(() => {
    if (residentsOfSelectedVilla.length > 0) {
      setSelectedResidentId(residentsOfSelectedVilla[0].id);
    } else {
      setSelectedResidentId('');
    }
  }, [selectedVillaId, dbUsers]);

  useEffect(() => {
    if (communityAdmins.length > 0) {
      setSelectedAdminId(communityAdmins[0].id);
    } else {
      setSelectedAdminId('');
    }
  }, [inviteMethod, dbUsers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!visitorName.trim()) {
      toast.error('Visitor Name is required.');
      return;
    }

    const targetHostId = inviteMethod === 'villa' ? selectedResidentId : selectedAdminId;
    if (!targetHostId) {
      toast.error('Please select a resident or administrator to approve the entry.');
      return;
    }

    const payload = {
      residentId: targetHostId,
      snapshot: {
        visitorName: visitorName.trim(),
        idProofNumber: idProofNumber.trim() || undefined,
        vehicleNumber: vehicleNumber.trim() ? vehicleNumber.trim().toUpperCase() : undefined
      }
    };

    try {
      const res = await onInitiateWalkIn(payload);
      if (res && res.success) {
        // Reset form
        setVisitorName('');
        setIdProofNumber('');
        setVehicleNumber('');
        setSelectedVillaId('');
        setAdminSearch('');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to initiate walk-in request.');
    }
  };

  return (
    <div className="card invite-form-card">
      <h3 className="invite-form-title">
        <i className="fa-solid fa-user-plus" style={{ color: 'var(--primary)', marginRight: '8px' }}></i>
        Invite Walk-in Visitor
      </h3>

      <form onSubmit={handleSubmit} className="row g-4">
        {/* Left Column: Visitor Info */}
        <div className="col-md-6" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <CFormLabel htmlFor="visitor-name-input" style={{ fontWeight: '600', fontSize: '13px' }}>
              Visitor Full Name *
            </CFormLabel>
            <CFormInput
              id="visitor-name-input"
              type="text"
              placeholder="e.g. David Smith"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              required
            />
          </div>

          <div>
            <CFormLabel htmlFor="visitor-id-input" style={{ fontWeight: '600', fontSize: '13px' }}>
              ID Proof Number (Optional)
            </CFormLabel>
            <CFormInput
              id="visitor-id-input"
              type="text"
              placeholder="e.g. Aadhaar, Passport or License"
              value={idProofNumber}
              onChange={(e) => setIdProofNumber(e.target.value)}
            />
          </div>

          <div>
            <CFormLabel htmlFor="visitor-plate-input" style={{ fontWeight: '600', fontSize: '13px' }}>
              Vehicle Plate Number (Optional)
            </CFormLabel>
            <CFormInput
              id="visitor-plate-input"
              type="text"
              placeholder="e.g. DXB-E5492"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              style={{ textTransform: 'uppercase' }}
            />
          </div>
        </div>

        {/* Right Column: Host Selection */}
        <div className="col-md-6 invite-host-sidebar">
          <CFormLabel style={{ fontWeight: '600', fontSize: '13px', marginBottom: '12px' }}>
            Choose Approval Target
          </CFormLabel>

          {/* Toggle buttons */}
          <div className="invite-toggle-btns">
            <CButton
              type="button"
              color={inviteMethod === 'villa' ? 'primary' : 'light'}
              onClick={() => setInviteMethod('villa')}
              style={{ flex: 1, fontWeight: '600', fontSize: '13px' }}
            >
              <i className="fa-solid fa-home" style={{ marginRight: '6px' }}></i>
              Invite by Villa
            </CButton>
            <CButton
              type="button"
              color={inviteMethod === 'admin' ? 'primary' : 'light'}
              onClick={() => setInviteMethod('admin')}
              style={{ flex: 1, fontWeight: '600', fontSize: '13px' }}
            >
              <i className="fa-solid fa-user-shield" style={{ marginRight: '6px' }}></i>
              Invite for Admin
            </CButton>
          </div>

          {inviteMethod === 'villa' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Select Villa */}
              <div>
                <CFormLabel htmlFor="villa-select-box" style={{ fontWeight: '600', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Select Destination Villa / Unit
                </CFormLabel>
                <CFormSelect
                  id="villa-select-box"
                  value={selectedVillaId}
                  onChange={(e) => setSelectedVillaId(e.target.value)}
                  disabled={loadingDirectory}
                >
                  <option value="">-- Choose a Villa --</option>
                  {dbVillas.map(v => (
                    <option key={v._id} value={v._id}>
                      {v.villaNumber} {v.block ? `(${v.block})` : ''}
                    </option>
                  ))}
                </CFormSelect>
              </div>

              {/* Select Resident */}
              {selectedVillaId && (
                <div>
                  <CFormLabel style={{ fontWeight: '600', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Select Resident to Notify
                  </CFormLabel>
                  {residentsOfSelectedVilla.length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--danger)', padding: '6px', backgroundColor: '#FEF2F2', borderRadius: '6px' }}>
                      No registered occupants found in this Villa.
                    </div>
                  ) : (
                    <div className="selection-scroll-container">
                      {residentsOfSelectedVilla.map(r => (
                        <label 
                          key={r.id}
                          className={`selection-radio-label ${selectedResidentId === r.id ? 'selected' : ''}`}
                        >
                          <input
                            type="radio"
                            name="residentSelect"
                            value={r.id}
                            checked={selectedResidentId === r.id}
                            onChange={() => setSelectedResidentId(r.id)}
                          />
                          <div>
                            <div style={{ fontWeight: '700' }}>{r.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>{r.residentType}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Admin Search */}
              <div>
                <CFormLabel htmlFor="admin-search-input" style={{ fontWeight: '600', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Search Community Admin Role
                </CFormLabel>
                <CFormInput
                  id="admin-search-input"
                  type="text"
                  placeholder="Type name/email to search..."
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                />
              </div>

              {/* Admins List selection */}
              <div>
                <CFormLabel style={{ fontWeight: '600', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Select Admin to Approve Request
                </CFormLabel>
                {filteredAdmins.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '12px', border: '1px dashed var(--border-light)', textAlign: 'center' }}>
                    No administrators found.
                  </div>
                ) : (
                  <div className="selection-scroll-container">
                    {filteredAdmins.map(admin => (
                      <label 
                        key={admin.id}
                        className={`selection-radio-label ${selectedAdminId === admin.id ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="adminSelect"
                          value={admin.id}
                          checked={selectedAdminId === admin.id}
                          onChange={() => setSelectedAdminId(admin.id)}
                        />
                        <div>
                          <div style={{ fontWeight: '700' }}>{admin.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>{admin.email}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Submit */}
        <div className="col-12 invite-form-footer">
          <CButton
            type="submit"
            color="primary"
            disabled={!visitorName.trim() || (inviteMethod === 'villa' ? !selectedResidentId : !selectedAdminId)}
            style={{ fontWeight: '700', padding: '10px 24px' }}
          >
            <i className="fa-solid fa-paper-plane" style={{ marginRight: '8px' }}></i>
            Send Approval Request
          </CButton>
        </div>
      </form>
    </div>
  );
};

export default GuardInviteVisitorForm;

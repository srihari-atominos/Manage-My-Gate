import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import {
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CForm,
  CFormLabel,
  CFormInput,
  CBadge,
  CSpinner,
  CAlert
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilHome, cilPeople, cilPhone, cilCheckCircle, cilNotes, cilBullhorn } from '@coreui/icons';
import apiClient from '../../../services/apiClient';
import toast from 'react-hot-toast';

export const ResidentDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [villaDetails, setVillaDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Guest pass generator state
  const [guestName, setGuestName] = useState('');
  const [generatedPass, setGeneratedPass] = useState(null);

  useEffect(() => {
    if (user?.villaId) {
      setLoading(true);
      apiClient.get(`/villas/${user.villaId}`)
        .then(res => {
          setVillaDetails(res.data || null);
        })
        .catch(err => {
          console.error('Failed to load resident villa details:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [user]);

  const handleCreatePass = (e) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    // Generate a mock pass code and timestamp
    const passCode = `G-${Math.floor(100000 + Math.random() * 900000)}`;
    setGeneratedPass({
      guestName: guestName.trim(),
      code: passCode,
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString()
    });
    setGuestName('');
    toast.success(`Guest pass generated for ${guestName.trim()}`);
  };

  const handleCopyPass = () => {
    if (!generatedPass) return;
    const text = `Manage-My-Gate Guest Pass\nGuest: ${generatedPass.guestName}\nCode: ${generatedPass.code}\nValid Until: ${generatedPass.validUntil}`;
    navigator.clipboard.writeText(text);
    toast.success('Copied pass details to clipboard!');
  };

  if (!user?.villaId) {
    return (
      <CAlert color="warning" className="text-center py-5 shadow-sm border-0 rounded-4">
        <CIcon icon={cilHome} size="xl" className="mb-3 text-warning" />
        <h4>Pending Unit Allocation</h4>
        <p className="text-muted">Your account is active, but you are not linked to a villa. Please contact your Community Administrator to allocate your unit.</p>
      </CAlert>
    );
  }

  return (
    <div className="resident-portal-dashboard">
      <h1 className="portal-main-title text-start mb-4">
        My Villa Portal — {villaDetails?.villa?.villaNumber || user.villaNumber}
      </h1>

      <CRow className="g-4">
        {/* Left column: Villa Stats and Co-residents */}
        <CCol lg={7}>
          {loading || !villaDetails ? (
            <div className="text-center py-5 bg-white rounded-4 shadow-sm border">
              <CSpinner color="primary" className="mb-2" />
              <div>Loading villa occupancy data...</div>
            </div>
          ) : (
            <>
              {/* Unit Card */}
              <CCard className="border-0 shadow-sm rounded-4 mb-4" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', color: 'white' }}>
                <CCardBody className="p-4">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h4 className="fw-bold mb-0">{villaDetails.villa.villaNumber}</h4>
                      <span className="badge bg-white text-primary mt-1 fw-bold">{villaDetails.villa.block || 'Main Block'}</span>
                    </div>
                    <CBadge color="success" className="px-2 py-1 text-uppercase fw-bold" style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid white' }}>
                      {user.residentType} Status
                    </CBadge>
                  </div>
                  
                  <CRow className="mt-4 pt-2 border-top border-white-50">
                    <CCol xs={6}>
                      <div className="text-white-50 small">INTERCOM EXTENSION</div>
                      <div className="fw-bold fs-5 d-flex align-items-center gap-2 mt-1">
                        <CIcon icon={cilPhone} style={{ width: '16px' }} />
                        {villaDetails.villa.intercom || 'None'}
                      </div>
                    </CCol>
                    <CCol xs={6}>
                      <div className="text-white-50 small">UNIT CONFIG</div>
                      <div className="fw-bold fs-5 d-flex align-items-center gap-2 mt-1">
                        <CIcon icon={cilHome} style={{ width: '16px' }} />
                        {villaDetails.villa.configuration || 'Not set'}
                      </div>
                    </CCol>
                  </CRow>
                </CCardBody>
              </CCard>

              {/* Co-residents Directory */}
              <CCard className="border-0 shadow-sm rounded-4">
                <CCardHeader className="bg-transparent border-0 pt-4 px-4 pb-2 d-flex align-items-center gap-2">
                  <CIcon icon={cilPeople} className="text-primary" style={{ width: '18px' }} />
                  <h5 className="mb-0 fw-bold">Co-residents Directory</h5>
                </CCardHeader>
                <CCardBody className="px-4 pb-4">
                  {villaDetails.residents.length <= 1 ? (
                    <div className="text-center py-4 bg-light rounded-3 text-muted small">
                      No other family members or co-residents registered yet.
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {villaDetails.residents.filter(r => r.id !== user.id).map((res) => (
                        <div key={res.id} className="d-flex align-items-center justify-content-between p-3 border rounded-3 bg-light-subtle">
                          <div className="d-flex align-items-center gap-3">
                            <div className="rounded-circle bg-primary text-white fw-bold d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', fontSize: '0.9rem' }}>
                              {res.name ? res.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="fw-semibold text-body-emphasis">{res.name || res.email.split('@')[0]}</div>
                              <div className="text-muted small">{res.email}</div>
                            </div>
                          </div>
                          <div>
                            <CBadge color="info" className="text-uppercase fw-semibold" style={{ fontSize: '0.65rem' }}>
                              {res.residentType}
                            </CBadge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CCardBody>
              </CCard>
            </>
          )}
        </CCol>

        {/* Right column: Visitor Passes and Notice Board */}
        <CCol lg={5}>
          {/* Visitor Pass Generator */}
          <CCard className="border-0 shadow-sm rounded-4 mb-4">
            <CCardHeader className="bg-transparent border-0 pt-4 px-4 pb-2 d-flex align-items-center gap-2">
              <CIcon icon={cilCheckCircle} className="text-success" style={{ width: '18px' }} />
              <h5 className="mb-0 fw-bold">Visitor Gate Pass</h5>
            </CCardHeader>
            <CCardBody className="px-4 pb-4">
              {generatedPass ? (
                <div className="text-center p-3 border border-success rounded-4 bg-success-subtle position-relative">
                  <div className="text-success small fw-bold mb-1">Gate Entry Approved</div>
                  <h5 className="fw-bold mb-3">{generatedPass.guestName}</h5>
                  <div className="display-6 fw-bold text-success mb-2" style={{ letterSpacing: '0.05em' }}>{generatedPass.code}</div>
                  <div className="text-muted small mb-4">Valid Until: {generatedPass.validUntil}</div>
                  <div className="d-flex gap-2">
                    <CButton color="outline-success" size="sm" className="w-50 fw-semibold" onClick={() => setGeneratedPass(null)}>
                      New Pass
                    </CButton>
                    <CButton color="success" size="sm" className="w-50 fw-semibold text-white" onClick={handleCopyPass}>
                      Share Details
                    </CButton>
                  </div>
                </div>
              ) : (
                <CForm onSubmit={handleCreatePass}>
                  <div className="mb-3">
                    <CFormLabel htmlFor="guest-name-input" className="small fw-semibold text-muted">GUEST NAME</CFormLabel>
                    <CFormInput
                      id="guest-name-input"
                      type="text"
                      placeholder="Enter guest name..."
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      required
                    />
                  </div>
                  <CButton type="submit" color="primary" className="w-100 fw-semibold text-white">
                    Generate Entry Code
                  </CButton>
                </CForm>
              )}
            </CCardBody>
          </CCard>

          {/* Notice Board */}
          <CCard className="border-0 shadow-sm rounded-4">
            <CCardHeader className="bg-transparent border-0 pt-4 px-4 pb-2 d-flex align-items-center gap-2">
              <CIcon icon={cilBullhorn} className="text-warning" style={{ width: '18px' }} />
              <h5 className="mb-0 fw-bold">Community Notices</h5>
            </CCardHeader>
            <CCardBody className="px-4 pb-4">
              <div className="d-flex flex-column gap-3">
                <div className="p-3 border-start border-warning border-3 bg-light rounded-2">
                  <div className="fw-semibold small">Maintenance Schedule</div>
                  <p className="text-muted small mb-0 mt-1">Water supply maintenance planned for Block A on Saturday 10 AM to 1 PM.</p>
                </div>
                <div className="p-3 border-start border-info border-3 bg-light rounded-2">
                  <div className="fw-semibold small">Annual General Meeting</div>
                  <p className="text-muted small mb-0 mt-1">Gated community general assembly on Sunday, July 12th at 4:30 PM in the Clubhouse.</p>
                </div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  );
};

export default ResidentDashboard;

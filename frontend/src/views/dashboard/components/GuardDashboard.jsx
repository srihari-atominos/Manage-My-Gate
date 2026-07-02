import React, { useState, useEffect } from 'react';
import {
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CFormInput,
  CButton,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CBadge,
  CSpinner,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormLabel,
  CFormSelect
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilShieldAlt, cilSearch, cilPhone, cilPlus, cilCheckCircle } from '@coreui/icons';
import apiClient from '../../../services/apiClient';
import toast from 'react-hot-toast';

export const GuardDashboard = () => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visitorLogs, setVisitorLogs] = useState([
    { id: 1, name: 'David Miller', phone: '+966 50 123 4567', villa: 'Villa 04', type: 'Delivery', checkIn: '3:45 PM', status: 'Checked In' },
    { id: 2, name: 'Sarah Connor', phone: '+966 55 987 6543', villa: 'Villa 12', type: 'Guest', checkIn: '2:15 PM', status: 'Checked Out' },
    { id: 3, name: 'FedEx Courier', phone: '—', villa: 'Villa 21', type: 'Delivery', checkIn: '1:05 PM', status: 'Checked Out' },
  ]);

  // Check-In modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorType, setVisitorType] = useState('Delivery');
  const [targetVillaNumber, setTargetVillaNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load directory on search query change
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setLoading(true);
      apiClient.get(`/villas?search=${search}&limit=5`)
        .then(res => {
          setResults(res.data?.data || []);
        })
        .catch(err => {
          console.error('Failed to load guard directory:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search]);

  const handleDialIntercom = (villa) => {
    if (villa.intercom) {
      toast.success(`📞 Dialing Intercom ${villa.intercom} for ${villa.villaNumber}...`);
    } else {
      toast.error(`No intercom configured for ${villa.villaNumber}`);
    }
  };

  const handleCheckInSubmit = (e) => {
    e.preventDefault();
    if (!visitorName.trim() || !targetVillaNumber.trim()) return;

    setSubmitting(true);
    setTimeout(() => {
      const newLog = {
        id: Date.now(),
        name: visitorName.trim(),
        phone: visitorPhone.trim() || '—',
        villa: targetVillaNumber.trim(),
        type: visitorType,
        checkIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'Checked In'
      };

      setVisitorLogs(prev => [newLog, ...prev]);
      setVisitorName('');
      setVisitorPhone('');
      setTargetVillaNumber('');
      setModalVisible(false);
      setSubmitting(false);
      toast.success(`Checked in ${newLog.name} successfully!`);
    }, 500);
  };

  const handleCheckOut = (logId) => {
    setVisitorLogs(prev => prev.map(log => 
      log.id === logId ? { ...log, status: 'Checked Out' } : log
    ));
    toast.success('Visitor checked out successfully.');
  };

  return (
    <div className="guard-portal-dashboard">
      <h1 className="portal-main-title text-start mb-4">
        Gatehouse Portal — Guard Console
      </h1>

      <CRow className="g-4">
        {/* Left Column: Quick Lookup */}
        <CCol lg={6}>
          <CCard className="border-0 shadow-sm rounded-4 mb-4">
            <CCardHeader className="bg-transparent border-0 pt-4 px-4 pb-2 d-flex align-items-center gap-2">
              <CIcon icon={cilSearch} className="text-primary" style={{ width: '18px' }} />
              <h5 className="mb-0 fw-bold">Intercom & Villa Directory</h5>
            </CCardHeader>
            <CCardBody className="px-4 pb-4">
              <CFormInput
                type="text"
                placeholder="Search by villa number (e.g. 05)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mb-4"
              />

              {loading ? (
                <div className="text-center py-4">
                  <CSpinner color="primary" size="sm" className="mb-2" />
                  <div className="small text-muted">Searching community directory...</div>
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-4 bg-light rounded text-muted small">
                  Enter search terms to find villa details.
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {results.map((villa) => (
                    <div key={villa._id} className="d-flex align-items-center justify-content-between p-3 border rounded-3 bg-light-subtle">
                      <div>
                        <div className="fw-bold text-primary">{villa.villaNumber}</div>
                        <div className="text-muted small">
                          Block: <span className="fw-semibold">{villa.block || '—'}</span> | Occupancy: <span className="fw-semibold">{villa.occupancyStatus}</span>
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        {villa.intercom && (
                          <CBadge color="info" className="px-2 py-1 fs-6">
                            📟 {villa.intercom}
                          </CBadge>
                        )}
                        <CButton
                          color="primary"
                          size="sm"
                          variant="outline"
                          onClick={() => handleDialIntercom(villa)}
                          className="d-flex align-items-center gap-1"
                        >
                          <CIcon icon={cilPhone} style={{ width: '12px' }} />
                          <span>Call</span>
                        </CButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        {/* Right Column: Visitor Logging */}
        <CCol lg={6}>
          <CCard className="border-0 shadow-sm rounded-4">
            <CCardHeader className="bg-transparent border-0 pt-4 px-4 pb-2 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <CIcon icon={cilShieldAlt} className="text-success" style={{ width: '18px' }} />
                <h5 className="mb-0 fw-bold">Recent Entry/Exit Logs</h5>
              </div>
              <CButton
                color="success"
                size="sm"
                className="fw-semibold text-white d-flex align-items-center gap-1"
                onClick={() => setModalVisible(true)}
              >
                <CIcon icon={cilPlus} style={{ width: '12px' }} />
                <span>New Visitor</span>
              </CButton>
            </CCardHeader>
            <CCardBody className="px-4 pb-4">
              <div className="table-responsive">
                <CTable align="middle" hover className="mb-0 small">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Visitor</CTableHeaderCell>
                      <CTableHeaderCell>Villa</CTableHeaderCell>
                      <CTableHeaderCell>Time</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {visitorLogs.map((log) => (
                      <CTableRow key={log.id}>
                        <CTableDataCell>
                          <div className="fw-semibold">{log.name}</div>
                          <div className="text-muted" style={{ fontSize: '0.72rem' }}>{log.type} | {log.phone}</div>
                        </CTableDataCell>
                        <CTableDataCell className="fw-semibold text-primary">{log.villa}</CTableDataCell>
                        <CTableDataCell>{log.checkIn}</CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={log.status === 'Checked In' ? 'success' : 'secondary'}>
                            {log.status}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          {log.status === 'Checked In' ? (
                            <CButton
                              color="outline-danger"
                              size="sm"
                              style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                              onClick={() => handleCheckOut(log.id)}
                            >
                              Check Out
                            </CButton>
                          ) : (
                            <span className="text-muted small">Completed</span>
                          )}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Visitor Check-In Modal */}
      <CModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        alignment="center"
      >
        <CModalHeader>
          <CModalTitle style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            Visitor Check-In Log
          </CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleCheckInSubmit}>
          <CModalBody>
            <div className="mb-3">
              <CFormLabel htmlFor="visitor-name" className="small fw-semibold text-muted">VISITOR NAME</CFormLabel>
              <CFormInput
                id="visitor-name"
                type="text"
                placeholder="Enter visitor/courier name..."
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <CFormLabel htmlFor="visitor-phone" className="small fw-semibold text-muted">VISITOR PHONE (OPTIONAL)</CFormLabel>
              <CFormInput
                id="visitor-phone"
                type="tel"
                placeholder="e.g. +966 50 000 0000"
                value={visitorPhone}
                onChange={(e) => setVisitorPhone(e.target.value)}
              />
            </div>

            <CRow className="mb-3">
              <CCol>
                <CFormLabel htmlFor="visitor-type" className="small fw-semibold text-muted">VISIT PURPOSE</CFormLabel>
                <CFormSelect
                  id="visitor-type"
                  value={visitorType}
                  onChange={(e) => setVisitorType(e.target.value)}
                >
                  <option value="Delivery">Delivery / Courier</option>
                  <option value="Guest">Personal Guest</option>
                  <option value="Services">Maintenance Staff</option>
                  <option value="Other">Other</option>
                </CFormSelect>
              </CCol>
              <CCol>
                <CFormLabel htmlFor="visitor-villa" className="small fw-semibold text-muted">DESTINATION VILLA</CFormLabel>
                <CFormInput
                  id="visitor-villa"
                  type="text"
                  placeholder="e.g. Villa 10"
                  value={targetVillaNumber}
                  onChange={(e) => setTargetVillaNumber(e.target.value)}
                  required
                />
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="light" size="sm" onClick={() => setModalVisible(false)} disabled={submitting}>
              Cancel
            </CButton>
            <CButton type="submit" color="primary" size="sm" disabled={submitting} className="fw-semibold">
              {submitting ? 'Checking In...' : 'Verify & Log Entry'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </div>
  );
};

export default GuardDashboard;

import React from 'react';
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardBody,
  CFormInput,
  CFormSelect,
  CButton,
  CSpinner,
  CAlert,
  CPagination,
  CPaginationItem
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilGrid } from '@coreui/icons';
import useVillaManager from '../hooks/useVillaManager';
import VillaCard from '../components/VillaCard';
import VillaDetailsModal from '../components/VillaDetailsModal';
import BatchGenerateModal from '../components/BatchGenerateModal';
import '../styles/_villa.scss';

export const VillaManager = () => {
  const {
    villas,
    stats,
    searchQuery,
    blockFilter,
    statusFilter,
    currentPage,
    totalPages,
    loading,
    error,

    // Modal state
    detailsVisible,
    selectedVillaId,
    batchVisible,

    // Actions
    openDetails,
    closeDetails,
    openBatch,
    closeBatch,
    handleSearch,
    handleBlockChange,
    handleStatusChange,
    handlePageChange,
  } = useVillaManager();

  return (
    <div className="villa-manager-view py-3">
      <CContainer fluid>
        {/* Statistics Cards */}
        <CRow className="villa-dashboard-stats g-3 mb-4">
          <CCol xs={12} sm={4}>
            <CCard className="stat-card shadow-sm border-0">
              <CCardBody className="p-3 text-center">
                <div className="stat-title text-muted mb-1">TOTAL VILLAS</div>
                <div className="stat-value text-primary">{stats.total || 0}</div>
              </CCardBody>
            </CCard>
          </CCol>
          <CCol xs={12} sm={4}>
            <CCard className="stat-card shadow-sm border-0">
              <CCardBody className="p-3 text-center">
                <div className="stat-title text-muted mb-1">OCCUPIED UNITS</div>
                <div className="stat-value text-success">
                  {(stats.ownerOccupied || 0) + (stats.tenantOccupied || 0)}
                </div>
                <div className="small-text mt-1 text-muted" style={{ fontSize: '0.72rem' }}>
                  Owner: {stats.ownerOccupied || 0} | Tenant: {stats.tenantOccupied || 0}
                </div>
              </CCardBody>
            </CCard>
          </CCol>
          <CCol xs={12} sm={4}>
            <CCard className="stat-card shadow-sm border-0">
              <CCardBody className="p-3 text-center">
                <div className="stat-title text-muted mb-1">VACANT UNITS</div>
                <div className="stat-value text-secondary">{stats.vacant || 0}</div>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>

        {/* Toolbar Controls */}
        <CCard className="border-0 shadow-sm mb-4">
          <CCardBody className="p-3">
            <CRow className="g-3 align-items-center">
              <CCol md={4} sm={6} xs={12}>
                <CFormInput
                  type="text"
                  placeholder="Search villa number..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  size="sm"
                />
              </CCol>
              <CCol md={3} sm={3} xs={6}>
                <CFormSelect
                  value={blockFilter}
                  onChange={(e) => handleBlockChange(e.target.value)}
                  size="sm"
                >
                  <option value="">All Blocks</option>
                  <option value="Block A">Block A</option>
                  <option value="Block B">Block B</option>
                  <option value="Block C">Block C</option>
                </CFormSelect>
              </CCol>
              <CCol md={3} sm={3} xs={6}>
                <CFormSelect
                  value={statusFilter}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  size="sm"
                >
                  <option value="">All Statuses</option>
                  <option value="Vacant">Vacant</option>
                  <option value="Owner Occupied">Owner Occupied</option>
                  <option value="Tenant Occupied">Tenant Occupied</option>
                </CFormSelect>
              </CCol>
              <CCol md={2} sm={12} xs={12} className="text-md-end text-center">
                <CButton
                  color="primary"
                  size="sm"
                  onClick={openBatch}
                  className="w-100 fw-semibold d-flex align-items-center justify-content-center gap-1"
                >
                  <CIcon icon={cilPlus} size="sm" />
                  <span>Batch Generate</span>
                </CButton>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>

        {/* General Errors */}
        {error && <CAlert color="danger" dismissible>{error}</CAlert>}

        {/* Grid Loading or Empty State */}
        {loading && villas.length === 0 ? (
          <div className="text-center py-5">
            <CSpinner color="primary" className="mb-2" />
            <div>Loading villas directory...</div>
          </div>
        ) : villas.length === 0 ? (
          <CCard className="text-center py-5 shadow-sm border-0">
            <CCardBody>
              <CIcon icon={cilGrid} size="xl" className="text-muted mb-3" style={{ opacity: 0.3 }} />
              <h4>No Villas Configured</h4>
              <p className="text-muted mb-4">You can manually create or batch generate the community units grid.</p>
              <CButton color="primary" size="sm" onClick={openBatch} className="fw-semibold">
                Generate 54 Villas
              </CButton>
            </CCardBody>
          </CCard>
        ) : (
          <>
            {/* Visual Grid */}
            <div className="villa-grid">
              {villas.map((villa) => (
                <VillaCard 
                  key={villa._id} 
                  villa={villa} 
                  onClick={openDetails} 
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="d-flex justify-content-center mt-4">
                <CPagination aria-label="Villa pages navigation">
                  <CPaginationItem
                    aria-label="Previous"
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                    style={{ cursor: currentPage === 1 ? 'default' : 'pointer' }}
                  >
                    <span aria-hidden="true">&laquo;</span>
                  </CPaginationItem>
                  {[...Array(totalPages)].map((_, i) => (
                    <CPaginationItem
                      key={i + 1}
                      active={currentPage === i + 1}
                      onClick={() => handlePageChange(i + 1)}
                      style={{ cursor: 'pointer' }}
                    >
                      {i + 1}
                    </CPaginationItem>
                  ))}
                  <CPaginationItem
                    aria-label="Next"
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                    style={{ cursor: currentPage === totalPages ? 'default' : 'pointer' }}
                  >
                    <span aria-hidden="true">&raquo;</span>
                  </CPaginationItem>
                </CPagination>
              </div>
            )}
          </>
        )}
      </CContainer>

      {/* Details Modal */}
      <VillaDetailsModal
        visible={detailsVisible}
        onClose={closeDetails}
        villaId={selectedVillaId}
      />

      {/* Batch Generate Modal */}
      <BatchGenerateModal
        visible={batchVisible}
        onClose={closeBatch}
      />
    </div>
  );
};

export default VillaManager;

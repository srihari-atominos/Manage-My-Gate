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
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/hooks/useAuth';
import useVilla from '../hooks/useVilla';
import useVillaSocket from '../hooks/useVillaSocket';
import VillaGrid from '../components/VillaGrid';
import VillaDetailsModal from '../components/VillaDetailsModal';
import BatchGenerateModal from '../components/BatchGenerateModal';
import BulkUploadVillasModal from '../components/BulkUploadVillasModal';
import VillaFormModal from '../components/VillaFormModal';
import '../styles/_villa.scss';

/**
 * VillaManagementView container
 * Orchestrates layout, state hooks, search queries, pagination, and modals.
 */
export const VillaManagementView = () => {
  const { t } = useTranslation();
  const { checkPermission } = useAuth();
  const canCreate = checkPermission('villas:create');

  const {
    villas,
    blocks,
    blocksLoading,
    stats,
    searchQuery,
    blockFilter,
    statusFilter,
    currentPage,
    totalPages,
    loading,
    error,
    orgId,

    // Modal Control Flags
    detailsVisible,
    selectedVillaId,
    formVisible,
    editingVilla,
    batchVisible,
    bulkUploadVisible,

    // Actions
    openDetails,
    closeDetails,
    openForm,
    closeForm,
    openBatch,
    closeBatch,
    openBulkUpload,
    closeBulkUpload,
    handleSearch,
    handleBlockChange,
    handleStatusChange,
    handlePageChange,
    createVilla,
    updateVilla,
    bulkUploadVillas
  } = useVilla();

  // Mount silent socket listener for real-time state sync
  useVillaSocket(orgId);

  const handleFormSubmit = async (formData) => {
    if (editingVilla) {
      await updateVilla(editingVilla._id, formData);
    } else {
      await createVilla(formData);
    }
  };

  return (
    <div className="villa-manager-view py-3">
      <CContainer fluid>
        {/* Statistics Banner */}
        <CRow className="villa-dashboard-stats g-3 mb-4">
          <CCol xs={12} sm={3}>
            <CCard className="stat-card shadow-sm border-0">
              <CCardBody className="p-3 text-center">
                <div className="stat-title text-muted mb-1">
                  {t('villas.totalUnits', 'TOTAL UNITS')}
                </div>
                <div className="stat-value text-primary">{stats.total || 0}</div>
              </CCardBody>
            </CCard>
          </CCol>
          <CCol xs={12} sm={3}>
            <CCard className="stat-card shadow-sm border-0">
              <CCardBody className="p-3 text-center">
                <div className="stat-title text-muted mb-1">
                  {t('villas.occupiedUnits', 'OCCUPIED UNITS')}
                </div>
                <div className="stat-value text-success">{stats.occupied || 0}</div>
              </CCardBody>
            </CCard>
          </CCol>
          <CCol xs={12} sm={3}>
            <CCard className="stat-card shadow-sm border-0">
              <CCardBody className="p-3 text-center">
                <div className="stat-title text-muted mb-1">
                  {t('villas.vacantUnits', 'VACANT UNITS')}
                </div>
                <div className="stat-value text-secondary">{stats.vacant || 0}</div>
              </CCardBody>
            </CCard>
          </CCol>
          <CCol xs={12} sm={3}>
            <CCard className="stat-card shadow-sm border-0">
              <CCardBody className="p-3 text-center">
                <div className="stat-title text-muted mb-1">
                  {t('villas.maintenanceUnits', 'UNDER MAINTENANCE')}
                </div>
                <div className="stat-value text-warning">{stats.maintenance || 0}</div>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>

        {/* Toolbar Controls */}
        <CCard className="border-0 shadow-sm mb-4">
          <CCardBody className="p-3">
            <CRow className="g-3 align-items-center">
              <CCol md={3} sm={6} xs={12}>
                <CFormInput
                  type="text"
                  placeholder={t('villas.searchPlaceholder', 'Search unit number...')}
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  size="sm"
                />
              </CCol>
              <CCol md={2} sm={3} xs={6}>
                <CFormSelect
                  value={blockFilter}
                  onChange={(e) => handleBlockChange(e.target.value)}
                  size="sm"
                  disabled={blocksLoading}
                >
                  <option value="">{t('villas.allBlocks', 'All Blocks')}</option>
                  {blocks.map((block) => (
                    <option key={block} value={block}>
                      {block}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={2} sm={3} xs={6}>
                <CFormSelect
                  value={statusFilter}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  size="sm"
                >
                  <option value="">{t('villas.allStatuses', 'All Statuses')}</option>
                  <option value="Vacant">{t('villas.statusTypes.Vacant', 'Vacant')}</option>
                  <option value="Occupied">{t('villas.statusTypes.Occupied', 'Occupied')}</option>
                  <option value="Under Maintenance">{t('villas.statusTypes.UnderMaintenance', 'Under Maintenance')}</option>
                </CFormSelect>
              </CCol>
              <CCol md={5} sm={12} xs={12} className="text-md-end text-center d-flex gap-2">
                {canCreate && (
                  <>
                    <CButton
                      color="secondary"
                      variant="outline"
                      size="sm"
                      onClick={openBulkUpload}
                      className="w-100 fw-semibold d-flex align-items-center justify-content-center gap-1"
                    >
                      <CIcon icon={cilPlus} size="sm" />
                      <span>{t('villas.bulkUpload', 'Bulk Upload')}</span>
                    </CButton>
                    <CButton
                      color="secondary"
                      size="sm"
                      onClick={() => openForm()}
                      className="w-100 fw-semibold d-flex align-items-center justify-content-center gap-1"
                    >
                      <CIcon icon={cilPlus} size="sm" />
                      <span>{t('villas.createUnit', 'Create Unit')}</span>
                    </CButton>
                    <CButton
                      color="primary"
                      size="sm"
                      onClick={openBatch}
                      className="w-100 fw-semibold d-flex align-items-center justify-content-center gap-1"
                    >
                      <CIcon icon={cilPlus} size="sm" />
                      <span>{t('villas.batchGenerate', 'Batch Generate')}</span>
                    </CButton>
                  </>
                )}
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>

        {/* Global Error Banner */}
        {error && <CAlert color="danger" dismissible>{error}</CAlert>}

        {/* Grid Area */}
        {loading && villas.length === 0 ? (
          <div className="text-center py-5">
            <CSpinner color="primary" className="mb-2" />
            <div>{t('villas.loading', 'Loading units directory...')}</div>
          </div>
        ) : villas.length === 0 ? (
          <CCard className="text-center py-5 shadow-sm border-0">
            <CCardBody>
              <CIcon icon={cilGrid} size="xl" className="text-muted mb-3 icon-opacity-30" />
              <h4>{t('villas.noVillas', 'No Units Configured')}</h4>
              <p className="text-muted mb-4">{t('villas.noVillasDesc', 'You can manually create or batch generate the community units grid.')}</p>
              {canCreate && (
                <CButton color="primary" size="sm" onClick={openBatch} className="fw-semibold">
                  {t('villas.generateVillas', 'Generate 54 Units')}
                </CButton>
              )}
            </CCardBody>
          </CCard>
        ) : (
          <>
            <VillaGrid villas={villas} onCardClick={openDetails} />

            {/* Pagination Banner */}
            {totalPages > 1 && (
              <div className="d-flex justify-content-center mt-4">
                <CPagination aria-label="Villa pages navigation">
                  <CPaginationItem
                    aria-label="Previous"
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                    className={`pagination-item-link ${currentPage === 1 ? 'disabled' : ''}`}
                  >
                    <span aria-hidden="true">&laquo;</span>
                  </CPaginationItem>
                  {[...Array(totalPages)].map((_, i) => (
                    <CPaginationItem
                      key={i + 1}
                      active={currentPage === i + 1}
                      onClick={() => handlePageChange(i + 1)}
                      className="pagination-item-link"
                    >
                      {i + 1}
                    </CPaginationItem>
                  ))}
                  <CPaginationItem
                    aria-label="Next"
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                    className={`pagination-item-link ${currentPage === totalPages ? 'disabled' : ''}`}
                  >
                    <span aria-hidden="true">&raquo;</span>
                  </CPaginationItem>
                </CPagination>
              </div>
            )}
          </>
        )}
      </CContainer>

      {/* Details Dialog */}
      <VillaDetailsModal
        visible={detailsVisible}
        onClose={closeDetails}
        villaId={selectedVillaId}
        onEdit={(villa) => {
          closeDetails();
          openForm(villa);
        }}
      />

      {/* Form Dialog (Create / Edit) */}
      <VillaFormModal
        visible={formVisible}
        onClose={closeForm}
        onSubmit={handleFormSubmit}
        editingVilla={editingVilla}
      />

      {/* Batch Dialog */}
      <BatchGenerateModal
        visible={batchVisible}
        onClose={closeBatch}
      />

      {/* Bulk Upload Dialog */}
      <BulkUploadVillasModal
        visible={bulkUploadVisible}
        onClose={closeBulkUpload}
        onBulkUpload={bulkUploadVillas}
      />
    </div>
  );
};

export default VillaManagementView;

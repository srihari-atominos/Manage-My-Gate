import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardHeader,
  CCardBody,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CBadge,
  CButton,
  CSpinner,
  CAlert,
  CPagination,
  CPaginationItem,
} from '@coreui/react';
import useOrganizationManager from '../hooks/useOrganizationManager.js';
import '../styles/_organization.scss';

/**
 * Super Admin View container listing system organizations with Block/Unblock toggle triggers.
 */
export const OrganizationManager = () => {
  const { t } = useTranslation();
  const {
    organizations,
    totalPages,
    page,
    loading,
    error,
    fetchOrgs,
    toggleStatus,
  } = useOrganizationManager();

  useEffect(() => {
    fetchOrgs(1, 10);
  }, []);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchOrgs(newPage, 10);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Pending':
        return 'warning';
      case 'Rejected':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="org-manager-container">
      <CContainer fluid>
        <CRow>
          <CCol xs={12}>
            <CCard className="org-manager-card">
              <CCardHeader className="card-header">
                <h3>{t('superAdmin.orgManager.title', { defaultValue: 'Organization Manager' })}</h3>
                <p>{t('superAdmin.orgManager.subtitle', { defaultValue: 'Manage all system organizations, view status, and block/unblock access.' })}</p>
              </CCardHeader>
              <CCardBody>
                {error && (
                  <CAlert color="danger" dismissible>
                    {error}
                  </CAlert>
                )}

                {loading && organizations.length === 0 ? (
                  <div className="text-center py-5">
                    <CSpinner color="primary" className="me-2" />
                    <span>{t('superAdmin.orgManager.loading', { defaultValue: 'Loading organizations...' })}</span>
                  </div>
                ) : (
                  <>
                    <div className="table-responsive">
                      <CTable hover align="middle" responsive className="mb-0">
                        <CTableHead>
                          <CTableRow>
                            <CTableHeaderCell scope="col">
                              {t('superAdmin.orgManager.tableName', { defaultValue: 'Name' })}
                            </CTableHeaderCell>
                            <CTableHeaderCell scope="col">
                              {t('superAdmin.orgManager.tableStatus', { defaultValue: 'Status' })}
                            </CTableHeaderCell>
                            <CTableHeaderCell scope="col" className="text-end">
                              {t('superAdmin.orgManager.tableActions', { defaultValue: 'Actions' })}
                            </CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {organizations.length === 0 ? (
                            <CTableRow>
                              <CTableDataCell colSpan={3} className="text-center py-4">
                                {t('superAdmin.orgManager.noData', { defaultValue: 'No organizations found.' })}
                              </CTableDataCell>
                            </CTableRow>
                          ) : (
                            organizations.map((org) => (
                              <CTableRow key={org._id}>
                                <CTableDataCell className="fw-semibold">
                                  {org.name}
                                </CTableDataCell>
                                <CTableDataCell>
                                  <CBadge color={getStatusBadgeColor(org.status)} className="org-badge">
                                    {t(`superAdmin.orgManager.status.${org.status.toLowerCase()}`, { defaultValue: org.status })}
                                  </CBadge>
                                </CTableDataCell>
                                <CTableDataCell className="text-end">
                                  <CButton
                                    color={org.status === 'Active' ? 'danger' : 'success'}
                                    variant="outline"
                                    size="sm"
                                    className="action-btn"
                                    onClick={() => toggleStatus(org._id, org.status)}
                                    disabled={loading || org.status === 'Pending'}
                                  >
                                    {org.status === 'Active'
                                      ? t('superAdmin.orgManager.block', { defaultValue: 'Block' })
                                      : t('superAdmin.orgManager.unblock', { defaultValue: 'Unblock' })}
                                  </CButton>
                                </CTableDataCell>
                              </CTableRow>
                            ))
                          )}
                        </CTableBody>
                      </CTable>
                    </div>

                    {totalPages > 1 && (
                      <div className="d-flex justify-content-end mt-4">
                        <CPagination aria-label="Page navigation example">
                          <CPaginationItem
                            aria-label="Previous"
                            disabled={page === 1}
                            onClick={() => handlePageChange(page - 1)}
                            style={{ cursor: page === 1 ? 'default' : 'pointer' }}
                          >
                            <span aria-hidden="true">&laquo;</span>
                          </CPaginationItem>
                          {[...Array(totalPages)].map((_, i) => (
                            <CPaginationItem
                              key={i + 1}
                              active={page === i + 1}
                              onClick={() => handlePageChange(i + 1)}
                              style={{ cursor: 'pointer' }}
                            >
                              {i + 1}
                            </CPaginationItem>
                          ))}
                          <CPaginationItem
                            aria-label="Next"
                            disabled={page === totalPages}
                            onClick={() => handlePageChange(page + 1)}
                            style={{ cursor: page === totalPages ? 'default' : 'pointer' }}
                          >
                            <span aria-hidden="true">&raquo;</span>
                          </CPaginationItem>
                        </CPagination>
                      </div>
                    )}
                  </>
                )}
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  );
};

export default OrganizationManager;

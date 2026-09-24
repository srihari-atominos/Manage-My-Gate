import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardHeader,
  CCardBody,
  CAlert,
  CButton,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilReload } from '@coreui/icons'

import useIssueReports from '../hooks/useIssueReports.js'
import IssueReportFilters from '../components/IssueReportFilters.jsx'
import IssueReportTable from '../components/IssueReportTable.jsx'
import IssueReportPagination from '../components/IssueReportPagination.jsx'
import IssueReportDetailModal from '../components/IssueReportDetailModal.jsx'
import '../styles/_issueReport.scss'

/**
 * Platform Super-Admin View Container for inspecting immutable issue reports.
 */
export const IssueReportsView = () => {
  const { t } = useTranslation()
  const {
    reports,
    pagination,
    filters,
    selectedReport,
    loading,
    detailsLoading,
    error,
    detailsError,
    fetchReports,
    updateFilters,
    changePage,
    changeLimit,
    resetAllFilters,
    openReportDetails,
    closeReportDetails,
    clearErrors,
  } = useIssueReports()

  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    fetchReports({ page: 1 })
  }, [fetchReports])

  const handleViewDetails = (id, reportItem = null) => {
    setModalOpen(true)
    const initialData =
      reportItem || (reports && reports.find((r) => (r._id || r.id) === id)) || null
    openReportDetails(id, initialData)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    closeReportDetails()
  }

  const handleRefresh = () => {
    fetchReports()
  }

  return (
    <div className="issue-report-container">
      <CContainer fluid>
        <CRow>
          <CCol xs={12}>
            <CCard className="shadow-sm border-0 mb-4">
              <CCardHeader className="card-header d-flex flex-wrap align-items-center justify-content-between py-3">
                <div>
                  <h3 className="mb-1">
                    {t('issueReport.pageTitle', { defaultValue: 'Issue Reports' })}
                  </h3>
                  <p className="mb-0 text-muted small">
                    {t('issueReport.pageSubtitle', {
                      defaultValue:
                        'Inspect submitted bug reports, feature requests, and inquiries from across communities.',
                    })}
                  </p>
                </div>

                <div className="mt-2 mt-sm-0">
                  <CButton
                    color="primary"
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={loading}
                    title={t('common.refresh', { defaultValue: 'Refresh' })}
                  >
                    <CIcon icon={cilReload} className="me-1" />
                    {t('common.refresh', { defaultValue: 'Refresh' })}
                  </CButton>
                </div>
              </CCardHeader>

              <CCardBody className="p-4">
                {/* Global Error Banner */}
                {error && (
                  <CAlert color="danger" dismissible onClose={clearErrors} className="mb-4">
                    <div className="fw-semibold">
                      {t('issueReport.errorTitle', { defaultValue: 'Error Loading Reports' })}
                    </div>
                    <div>{error}</div>
                  </CAlert>
                )}

                {/* Filters Row */}
                <IssueReportFilters
                  filters={filters}
                  onFilterChange={updateFilters}
                  onReset={resetAllFilters}
                  loading={loading}
                />

                {/* Reports Table */}
                <IssueReportTable
                  reports={reports}
                  loading={loading}
                  onViewDetails={handleViewDetails}
                />

                {/* Pagination */}
                <IssueReportPagination
                  pagination={pagination}
                  onPageChange={changePage}
                  onLimitChange={changeLimit}
                  loading={loading}
                />
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>

      {/* Report Detail Modal */}
      <IssueReportDetailModal
        visible={modalOpen}
        onClose={handleCloseModal}
        report={selectedReport}
        loading={detailsLoading}
        error={detailsError}
      />
    </div>
  )
}

export default IssueReportsView

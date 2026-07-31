import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import {
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CButton,
  CBadge,
  CPagination,
  CPaginationItem,
  CFormInput,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilTrash, cilCheck, cilX } from '@coreui/icons'
import '../styles/_integrationHub.scss'

/**
 * Table showing active connections for the selected provider with renaming and deletion capabilities.
 */
export const ConnectionTable = ({
  connections = [],
  pagination,
  onPageChange,
  onUpdateLabel,
  onDelete,
  isActionLoading,
}) => {
  const { t } = useTranslation()
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')

  const startEditing = (id, currentLabel) => {
    setEditingId(id)
    setEditValue(currentLabel)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditValue('')
  }

  const saveEdit = async (id) => {
    if (!editValue.trim()) return
    const success = await onUpdateLabel(id, editValue.trim())
    if (success) {
      setEditingId(null)
      setEditValue('')
    }
  }

  const getStatusBadgeColor = (status) => {
    return status === 'connected' ? 'success' : 'secondary'
  }

  const currentPage = pagination?.currentPage || 1
  const totalPages = pagination?.totalPages || 1

  return (
    <div className="connection-table-wrapper flex-1 flex flex-col h-full overflow-hidden">
      <h6 className="mb-3 fw-bold flex-shrink-0 text-slate-900 dark:text-white">
        {t('integrationHub.table.title', 'Existing Connections')}
      </h6>

      {!connections || connections.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-8 bg-slate-50/50 dark:bg-slate-900/50">
          <span className="text-slate-500 dark:text-slate-400 text-sm">
            {t('integrationHub.table.empty', 'No connections established yet.')}
          </span>
        </div>
      ) : (
        <>
          {/* Table Scroll Wrapper */}
          <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-t-lg">
            <CTable
              align="middle"
              hover
              responsive
              className="m-0 w-full text-slate-700 dark:text-slate-300"
            >
              <CTableHead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 shadow-sm">
                <CTableRow>
                  <CTableHeaderCell className="ps-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border-b dark:border-slate-700">
                    {t('integrationHub.table.accountLabel', 'Label')}
                  </CTableHeaderCell>
                  <CTableHeaderCell className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border-b dark:border-slate-700">
                    {t('integrationHub.table.status', 'Status')}
                  </CTableHeaderCell>
                  <CTableHeaderCell className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border-b dark:border-slate-700">
                    {t('integrationHub.table.createdAt', 'Connected At')}
                  </CTableHeaderCell>
                  <CTableHeaderCell className="text-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border-b dark:border-slate-700">
                    {t('integrationHub.table.actions', 'Actions')}
                  </CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {connections.map((conn) => {
                  const isEditing = editingId === conn.id
                  return (
                    <CTableRow key={conn.id} className="border-b dark:border-slate-800">
                      <CTableDataCell className="ps-4 py-3">
                        {isEditing ? (
                          <div className="d-flex align-items-center gap-2">
                            <CFormInput
                              size="sm"
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              disabled={isActionLoading}
                              style={{ maxWidth: '200px' }}
                            />
                            <CButton
                              color="success"
                              size="sm"
                              onClick={() => saveEdit(conn.id)}
                              disabled={isActionLoading || !editValue.trim()}
                            >
                              <CIcon icon={cilCheck} />
                            </CButton>
                            <CButton
                              color="secondary"
                              size="sm"
                              onClick={cancelEditing}
                              disabled={isActionLoading}
                            >
                              <CIcon icon={cilX} />
                            </CButton>
                          </div>
                        ) : (
                          <span className="fw-semibold text-slate-900 dark:text-slate-100">
                            {conn.accountLabel}
                          </span>
                        )}
                      </CTableDataCell>
                      <CTableDataCell className="py-3">
                        <CBadge color={getStatusBadgeColor(conn.status)}>
                          {t(`integrationHub.status.${conn.status}`, { defaultValue: conn.status })}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell className="py-3 text-slate-500 dark:text-slate-400">
                        {conn.createdAt ? new Date(conn.createdAt).toLocaleString() : 'N/A'}
                      </CTableDataCell>
                      <CTableDataCell className="text-center py-3">
                        {!isEditing && (
                          <>
                            <CButton
                              color="info"
                              variant="outline"
                              size="sm"
                              className="me-2"
                              onClick={() => startEditing(conn.id, conn.accountLabel)}
                              disabled={isActionLoading}
                            >
                              <CIcon icon={cilPencil} />
                            </CButton>
                            <CButton
                              color="danger"
                              variant="outline"
                              size="sm"
                              onClick={() => onDelete(conn.id)}
                              disabled={isActionLoading}
                            >
                              <CIcon icon={cilTrash} />
                            </CButton>
                          </>
                        )}
                      </CTableDataCell>
                    </CTableRow>
                  )
                })}
              </CTableBody>
            </CTable>
          </div>

          {/* Pagination Footer */}
          <div className="flex-none px-4 py-3 border-x border-b border-slate-200 dark:border-slate-700 rounded-b-lg flex items-center justify-between bg-slate-50 dark:bg-slate-900">
            <span className="text-slate-500 dark:text-slate-400 small">
              {t('integrationHub.table.paginationInfo', {
                defaultValue: `Page ${currentPage} of ${totalPages}`,
                current: currentPage,
                total: totalPages,
              })}
            </span>
            <CPagination className="mb-0">
              <CPaginationItem
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
                style={{ cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              >
                {t('integrationHub.pagination.prev', 'Previous')}
              </CPaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <CPaginationItem
                  key={p}
                  active={p === currentPage}
                  onClick={() => onPageChange(p)}
                  style={{ cursor: 'pointer' }}
                >
                  {p}
                </CPaginationItem>
              ))}
              <CPaginationItem
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => onPageChange(currentPage + 1)}
                style={{
                  cursor:
                    currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {t('integrationHub.pagination.next', 'Next')}
              </CPaginationItem>
            </CPagination>
          </div>
        </>
      )}
    </div>
  )
}

ConnectionTable.propTypes = {
  connections: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      provider: PropTypes.string.isRequired,
      accountLabel: PropTypes.string.isRequired,
      status: PropTypes.string.isRequired,
      createdAt: PropTypes.string,
    }),
  ).isRequired,
  pagination: PropTypes.shape({
    totalRecords: PropTypes.number.isRequired,
    currentPage: PropTypes.number.isRequired,
    totalPages: PropTypes.number.isRequired,
    limit: PropTypes.number.isRequired,
  }).isRequired,
  onPageChange: PropTypes.func.isRequired,
  onUpdateLabel: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  isActionLoading: PropTypes.bool,
}

export default ConnectionTable

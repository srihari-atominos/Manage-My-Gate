import React, { useState } from 'react'
import PropTypes from 'prop-types'
import {
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
  CPagination,
  CPaginationItem,
  CSpinner,
  CAlert,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilCloudUpload, cilReload } from '@coreui/icons'

const DataPreviewTable = ({ validRows, handleConfirmImport, isImporting, resetWizard }) => {
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 8

  const totalRecords = validRows ? validRows.length : 0
  const totalPages = Math.ceil(totalRecords / pageSize) || 1

  const startIndex = (currentPage - 1) * pageSize
  const currentRows = validRows.slice(startIndex, startIndex + pageSize)

  return (
    <div className="data-preview-card">
      <CAlert color="success" className="d-flex align-items-center mb-4">
        <CIcon icon={cilCheckCircle} size="xl" className="me-3" />
        <div>
          <strong className="d-block">Validation Successful!</strong>
          <span>
            All {totalRecords} record(s) passed validation and are ready to be written to the
            database.
          </span>
        </div>
      </CAlert>

      <div className="preview-actions-bar">
        <div>
          <h5 className="mb-1 font-weight-bold">Pre-Import Data Preview</h5>
          <small className="text-secondary">
            Showing records {totalRecords > 0 ? startIndex + 1 : 0} -{' '}
            {Math.min(startIndex + pageSize, totalRecords)} of {totalRecords}
          </small>
        </div>
        <div className="d-flex gap-2">
          <CButton color="secondary" size="md" onClick={resetWizard} disabled={isImporting}>
            <CIcon icon={cilReload} className="me-1" /> Re-upload File
          </CButton>
          <CButton
            color="primary"
            size="md"
            onClick={handleConfirmImport}
            disabled={isImporting || totalRecords === 0}
          >
            {isImporting ? (
              <>
                <CSpinner size="sm" className="me-2" /> Importing Data (Transactional)...
              </>
            ) : (
              <>
                <CIcon icon={cilCloudUpload} className="me-2" /> Confirm & Import {totalRecords}{' '}
                Records
              </>
            )}
          </CButton>
        </div>
      </div>

      <div className="preview-table-container">
        <CTable align="middle" responsive hover borderless className="mb-0">
          <CTableHead color="light">
            <CTableRow>
              <CTableHeaderCell style={{ width: '60px' }}>#</CTableHeaderCell>
              <CTableHeaderCell>Villa / Unit #</CTableHeaderCell>
              <CTableHeaderCell>Owner Name</CTableHeaderCell>
              <CTableHeaderCell>Phone</CTableHeaderCell>
              <CTableHeaderCell>Block / Building</CTableHeaderCell>
              <CTableHeaderCell>Status</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {currentRows.map((row, idx) => {
              const rowNum = startIndex + idx + 1
              const villaNumber = row.villaNumber || row['Villa Number'] || row.unitNumber || '-'
              const ownerName = row.ownerName || row['Owner Name'] || '-'
              const phone = row.phone || row['Phone'] || '-'
              const block = row.blockOrBuilding || row['Block'] || row['Building'] || '-'

              return (
                <CTableRow key={idx}>
                  <CTableDataCell className="fw-bold text-center">{rowNum}</CTableDataCell>
                  <CTableDataCell>
                    <span className="fw-semibold text-primary">{villaNumber}</span>
                  </CTableDataCell>
                  <CTableDataCell>{ownerName}</CTableDataCell>
                  <CTableDataCell>{phone}</CTableDataCell>
                  <CTableDataCell>{block}</CTableDataCell>
                  <CTableDataCell>
                    <CBadge color="success">Valid</CBadge>
                  </CTableDataCell>
                </CTableRow>
              )
            })}
          </CTableBody>
        </CTable>
      </div>

      {totalPages > 1 && (
        <div className="pagination-bar">
          <small className="text-secondary">
            Page {currentPage} of {totalPages}
          </small>
          <CPagination align="end" aria-label="Data preview pagination">
            <CPaginationItem
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            >
              Previous
            </CPaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <CPaginationItem
                key={pageNum}
                active={pageNum === currentPage}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </CPaginationItem>
            ))}
            <CPaginationItem
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            >
              Next
            </CPaginationItem>
          </CPagination>
        </div>
      )}
    </div>
  )
}

DataPreviewTable.propTypes = {
  validRows: PropTypes.array.isRequired,
  handleConfirmImport: PropTypes.func.isRequired,
  isImporting: PropTypes.bool,
  resetWizard: PropTypes.func.isRequired,
}

export default DataPreviewTable

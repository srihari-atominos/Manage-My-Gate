import React from 'react'
import PropTypes from 'prop-types'
import {
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
  CBadge,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCloudDownload, cilReload, cilWarning } from '@coreui/icons'

const ValidationSummary = ({ validationResults, resetWizard }) => {
  const invalidRows = validationResults?.invalid || []
  const validCount = validationResults?.valid?.length || 0
  const invalidCount = invalidRows.length
  const totalRows = validationResults?.totalRows || validCount + invalidCount

  const handleDownloadErrorLog = () => {
    if (invalidRows.length === 0) return

    // Create CSV content for error report
    const headers = ['Row', 'Owner Name', 'Villa Number', 'Phone', 'Validation Errors']
    const rows = invalidRows.map((item) => {
      const ownerName = item.data?.ownerName || item.data?.['Owner Name'] || ''
      const villaNumber = item.data?.villaNumber || item.data?.['Villa Number'] || ''
      const phone = item.data?.phone || item.data?.['Phone'] || ''
      const errorsStr = (item.errors || []).join(' | ')

      return [
        item.row,
        `"${String(ownerName).replace(/"/g, '""')}"`,
        `"${String(villaNumber).replace(/"/g, '""')}"`,
        `"${String(phone).replace(/"/g, '""')}"`,
        `"${String(errorsStr).replace(/"/g, '""')}"`,
      ].join(',')
    })

    const csvString = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `onboarding_import_errors_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="validation-summary-card">
      <CAlert color="danger" className="d-flex align-items-center mb-4">
        <CIcon icon={cilWarning} size="xl" className="me-3" />
        <div>
          <strong className="d-block">Validation Failed: Fix Errors Before Importing</strong>
          <span>
            {invalidCount} row(s) contain format errors or conflict with existing database records.
          </span>
        </div>
      </CAlert>

      <div className="summary-stats-banner">
        <div className="stat-box stat-total">
          <div className="stat-value">{totalRows}</div>
          <div className="stat-label">Total Rows Analyzed</div>
        </div>
        <div className="stat-box stat-valid">
          <div className="stat-value">{validCount}</div>
          <div className="stat-label">Valid Records Ready</div>
        </div>
        <div className="stat-box stat-invalid">
          <div className="stat-value">{invalidCount}</div>
          <div className="stat-label">Invalid Rows Requiring Attention</div>
        </div>
      </div>

      <div className="d-flex align-items-center justify-content-between mb-3">
        <h5 className="mb-0 font-weight-bold">Error Breakdown</h5>
        <div className="d-flex gap-2">
          <CButton color="outline-danger" size="sm" onClick={handleDownloadErrorLog}>
            <CIcon icon={cilCloudDownload} className="me-1" /> Download Error Log (.csv)
          </CButton>
          <CButton color="secondary" size="sm" onClick={resetWizard}>
            <CIcon icon={cilReload} className="me-1" /> Re-upload File
          </CButton>
        </div>
      </div>

      <div className="error-table-container">
        <CTable align="middle" responsive hover borderless className="mb-0">
          <CTableHead color="light">
            <CTableRow>
              <CTableHeaderCell style={{ width: '80px' }}>Row #</CTableHeaderCell>
              <CTableHeaderCell>Owner Name</CTableHeaderCell>
              <CTableHeaderCell>Villa / Unit #</CTableHeaderCell>
              <CTableHeaderCell>Phone</CTableHeaderCell>
              <CTableHeaderCell>Validation Errors</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {invalidRows.map((rowItem, idx) => {
              const data = rowItem.data || {}
              const ownerName = data.ownerName || data['Owner Name'] || '-'
              const villaNumber = data.villaNumber || data['Villa Number'] || '-'
              const phone = data.phone || data['Phone'] || '-'

              return (
                <CTableRow key={idx}>
                  <CTableDataCell className="fw-bold text-center">{rowItem.row}</CTableDataCell>
                  <CTableDataCell>{ownerName}</CTableDataCell>
                  <CTableDataCell>
                    <span className="badge bg-light text-dark border">{villaNumber}</span>
                  </CTableDataCell>
                  <CTableDataCell>{phone}</CTableDataCell>
                  <CTableDataCell>
                    <div className="error-badge-list">
                      {(rowItem.errors || []).map((err, errIdx) => (
                        <CBadge key={errIdx} color="danger" className="text-wrap text-start">
                          {err}
                        </CBadge>
                      ))}
                    </div>
                  </CTableDataCell>
                </CTableRow>
              )
            })}
          </CTableBody>
        </CTable>
      </div>
    </div>
  )
}

ValidationSummary.propTypes = {
  validationResults: PropTypes.shape({
    invalid: PropTypes.array,
    valid: PropTypes.array,
    totalRows: PropTypes.number,
    isValid: PropTypes.bool,
  }).isRequired,
  resetWizard: PropTypes.func.isRequired,
}

export default ValidationSummary

import React, { useState, useRef } from 'react'
import PropTypes from 'prop-types'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CAlert,
  CSpinner,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCloudDownload, cilCloudUpload, cilCheckCircle, cilWarning } from '@coreui/icons'

const TEMPLATE_CONTENT = `VillaNumber,Block,Intercom,Configuration,Email,ResidentType,Role
Villa 101,Block A,101,3 BHK,,,
Villa 102,Block A,102,3 BHK,resident.owner@example.com,Owner,Resident Owner
Villa 103,Block B,103,4 BHK,resident.tenant@example.com,Tenant,Resident Tenant
Villa 104,Block B,104,4 BHK,resident.family@example.com,Family,Family Member`

const splitCSVLine = (line) => {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

const parseCSV = (text) => {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const headers = splitCSVLine(lines[0]).map(h => h.trim().toLowerCase())
  
  const parsed = []
  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVLine(lines[i])
    if (values.length === 0 || (values.length === 1 && !values[0])) continue

    const row = {}
    headers.forEach((header, index) => {
      let key = header
      if (header === 'villanumber' || header === 'villa number') key = 'villaNumber'
      else if (header === 'block') key = 'block'
      else if (header === 'intercom') key = 'intercom'
      else if (header === 'configuration' || header === 'config') key = 'configuration'
      else if (header === 'email') key = 'email'
      else if (header === 'residenttype' || header === 'resident type') key = 'residentType'
      else if (header === 'role') key = 'roleName'

      row[key] = values[index] || ''
    })

    // Basic Row Validations
    row.isValidVilla = !!row.villaNumber

    if (row.email) {
      row.isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)
      row.isValidResidentType = ['Owner', 'Tenant', 'Family'].includes(row.residentType)
      row.isValidRole = !!row.roleName
    } else {
      row.isValidEmail = true
      row.isValidResidentType = true
      row.isValidRole = true
    }

    row.isValid = row.isValidVilla && row.isValidEmail && row.isValidResidentType && row.isValidRole

    parsed.push(row)
  }
  return parsed
}

export const BulkUploadVillasModal = ({ visible, onClose, onBulkUpload }) => {
  const [parsedRows, setParsedRows] = useState([])
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const fileInputRef = useRef(null)

  const handleDownloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CONTENT], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'bulk_upload_villas_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setFileName(file.name)
    setErrorMsg('')
    setResults(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target.result
        const rows = parseCSV(text)
        if (rows.length === 0) {
          setErrorMsg('The uploaded file is empty or missing headers.')
        } else {
          setParsedRows(rows)
        }
      } catch (err) {
        setErrorMsg('Failed to parse CSV file.')
      }
    }
    reader.readAsText(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'text/csv') {
      setFileName(file.name)
      setErrorMsg('')
      setResults(null)

      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const text = event.target.result
          const rows = parseCSV(text)
          setParsedRows(rows)
        } catch (err) {
          setErrorMsg('Failed to parse CSV file.')
        }
      }
      reader.readAsText(file)
    } else {
      setErrorMsg('Please upload a valid CSV file.')
    }
  }

  const handleSubmit = async () => {
    const validRows = parsedRows.filter(r => r.isValid)
    if (validRows.length === 0) {
      setErrorMsg('No valid rows found to upload.')
      return
    }

    setLoading(true)
    setErrorMsg('')
    try {
      const payload = validRows.map(r => ({
        villaNumber: r.villaNumber,
        block: r.block || undefined,
        intercom: r.intercom || undefined,
        configuration: r.configuration || undefined,
        email: r.email || undefined,
        residentType: r.email ? r.residentType : undefined,
        roleName: r.email ? r.roleName : undefined,
      }))
      const res = await onBulkUpload(payload)
      setResults(res)
      setParsedRows([])
      setFileName('')
    } catch (err) {
      setErrorMsg(err.message || 'Bulk villa upload request failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setParsedRows([])
    setFileName('')
    setResults(null)
    setErrorMsg('')
    onClose()
  }

  const validCount = parsedRows.filter(r => r.isValid).length
  const invalidCount = parsedRows.length - validCount

  return (
    <CModal
      visible={visible}
      onClose={handleClose}
      id="bulk-upload-villas-modal"
      alignment="center"
      size="lg"
    >
      <CModalHeader className="border-bottom">
        <CModalTitle style={{ fontSize: '1.1rem', fontWeight: 700 }}>
          Bulk Upload Villas & Residents
        </CModalTitle>
      </CModalHeader>

      <CModalBody className="p-4">
        {/* Step 1: Template Download */}
        {!fileName && !parsedRows.length && !results && (
          <div className="mb-4 text-center p-4 border rounded-3 bg-light">
            <h5 className="fw-semibold mb-2" style={{ fontSize: '0.95rem' }}>1. Download CSV Template</h5>
            <p className="text-muted small mb-3">
              Use our template to upload your community units grid. If you also supply email/resident details, the system will automatically dispatch invitations to those units.
            </p>
            <CButton
              color="primary"
              size="sm"
              onClick={handleDownloadTemplate}
              className="d-inline-flex align-items-center gap-2 fw-semibold"
            >
              <CIcon icon={cilCloudDownload} size="sm" />
              Download Template
            </CButton>
          </div>
        )}

        {/* Error Messages */}
        {errorMsg && (
          <CAlert color="danger" className="mb-4 d-flex align-items-center gap-2 py-2 small">
            <CIcon icon={cilWarning} size="sm" />
            <span>{errorMsg}</span>
          </CAlert>
        )}

        {/* Step 2: Upload Area */}
        {!results && (
          <div className="mb-4">
            <h5 className="fw-semibold mb-3" style={{ fontSize: '0.95rem' }}>
              {fileName ? 'Uploaded File' : '2. Upload CSV File'}
            </h5>
            <div
              className="p-4 border border-dashed rounded-3 text-center cursor-pointer bg-light"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              style={{ borderStyle: 'dashed', borderWidth: '2px', cursor: 'pointer' }}
            >
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <CIcon icon={cilCloudUpload} size="xl" className="text-muted mb-2" style={{ opacity: 0.6 }} />
              {fileName ? (
                <div>
                  <div className="fw-semibold text-primary mb-1">{fileName}</div>
                  <div className="text-muted small">Click or drag another file to replace</div>
                </div>
              ) : (
                <div>
                  <div className="fw-semibold mb-1">Click to Upload or Drag & Drop File</div>
                  <div className="text-muted small">CSV files only. Maximum file size 2MB.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Parsed Rows Preview */}
        {!results && parsedRows.length > 0 && (
          <div className="parsed-preview mb-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-semibold mb-0" style={{ fontSize: '0.95rem' }}>3. Preview Uploaded List</h5>
              <div className="d-flex gap-2">
                <CBadge color="success">{validCount} Valid</CBadge>
                {invalidCount > 0 && <CBadge color="danger">{invalidCount} Invalid</CBadge>}
              </div>
            </div>

            <div className="table-responsive border rounded-3" style={{ maxHeight: '240px', overflowY: 'auto' }}>
              <table className="table table-hover align-middle mb-0 small">
                <thead className="table-light sticky-top">
                  <tr>
                    <th scope="col" className="ps-3">Villa Number</th>
                    <th scope="col">Block</th>
                    <th scope="col">Intercom</th>
                    <th scope="col">Resident Email</th>
                    <th scope="col">Resident Type</th>
                    <th scope="col">Role</th>
                    <th scope="col" className="pe-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, idx) => (
                    <tr key={idx} className={row.isValid ? '' : 'table-warning-row'} style={{ opacity: row.isValid ? 1 : 0.8 }}>
                      <td className="ps-3 fw-bold text-primary">{row.villaNumber || <span className="text-danger">Missing</span>}</td>
                      <td>{row.block || <span className="text-muted">—</span>}</td>
                      <td>{row.intercom || <span className="text-muted">—</span>}</td>
                      <td>{row.email || <span className="text-muted">—</span>}</td>
                      <td>{row.residentType || <span className="text-muted">—</span>}</td>
                      <td>{row.roleName || <span className="text-muted">—</span>}</td>
                      <td className="pe-3 text-center">
                        {row.isValid ? (
                          <CBadge color="success">Valid</CBadge>
                        ) : (
                          <CBadge color="danger" title="Validation failed: Check Villa Number, Email layout, Type or Role link.">
                            Fix Row
                          </CBadge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Results Screen */}
        {results && (
          <div className="upload-results">
            <CAlert color={results.failureCount === 0 ? 'success' : 'warning'} className="mb-4 py-3">
              <div className="d-flex align-items-center gap-2 mb-2">
                <CIcon icon={results.failureCount === 0 ? cilCheckCircle : cilWarning} size="xl" />
                <h6 className="fw-semibold mb-0">Bulk Villa Upload Completed</h6>
              </div>
              <p className="mb-0 small">
                Successfully processed {results.successCount} of {results.total} villas.
              </p>
            </CAlert>

            {/* Success List */}
            {results.successes.length > 0 && (
              <div className="mb-4">
                <h6 className="fw-semibold text-success mb-2" style={{ fontSize: '0.88rem' }}>Successfully Processed:</h6>
                <div className="list-group rounded-3 max-vh-25 overflow-auto" style={{ maxHeight: '180px' }}>
                  {results.successes.map((s, idx) => (
                    <div key={idx} className="list-group-item d-flex justify-content-between align-items-center py-2 small">
                      <div>
                        <span className="fw-bold text-primary">{s.villaNumber}</span>
                        <span className="text-muted ms-2">({s.action})</span>
                        {s.email && (
                          <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                            Resident: <span className="fw-semibold">{s.email}</span> 
                            {s.userInvited ? (
                              <span className="text-success ms-1">✓ Invited</span>
                            ) : (
                              <span className="text-danger ms-1">✗ Failed: {s.inviteError}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <CBadge color="success">Success</CBadge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Failure List */}
            {results.failures.length > 0 && (
              <div>
                <h6 className="fw-semibold text-danger mb-2" style={{ fontSize: '0.88rem' }}>Failed to Process:</h6>
                <div className="list-group rounded-3 max-vh-25 overflow-auto" style={{ maxHeight: '150px' }}>
                  {results.failures.map((f, idx) => (
                    <div key={idx} className="list-group-item d-flex justify-content-between align-items-start py-2 small bg-light-danger">
                      <div className="ms-2 me-auto">
                        <div className="fw-semibold text-dark">{f.villaNumber}</div>
                        <span className="text-muted" style={{ fontSize: '0.72rem' }}>Reason: {f.error}</span>
                      </div>
                      <CBadge color="danger">Failed</CBadge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CModalBody>

      <CModalFooter className="border-0 pt-0">
        <CButton
          color="light"
          size="sm"
          onClick={handleClose}
          disabled={loading}
        >
          {results ? 'Close' : 'Cancel'}
        </CButton>
        {!results && parsedRows.length > 0 && (
          <CButton
            id="confirm-bulk-upload-villas-btn"
            color="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={loading || validCount === 0}
            className="fw-semibold d-flex align-items-center gap-2"
          >
            {loading ? (
              <>
                <CSpinner size="sm" />
                Processing...
              </>
            ) : (
              <>
                Upload {validCount} Villas
              </>
            )}
          </CButton>
        )}
      </CModalFooter>
    </CModal>
  )
}

BulkUploadVillasModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onBulkUpload: PropTypes.func.isRequired,
}

export default BulkUploadVillasModal

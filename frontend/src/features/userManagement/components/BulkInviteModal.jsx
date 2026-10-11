import React, { useState, useRef } from 'react'
import PropTypes from 'prop-types'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CRow,
  CCol,
  CAlert,
  CSpinner,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilCloudDownload,
  cilCloudUpload,
  cilCheckCircle,
  cilWarning,
  cilXCircle,
} from '@coreui/icons'
import { bulkValidateUsers, downloadBulkInviteTemplate } from '../services/userApi'
import * as XLSX from 'xlsx'
export const isGlobalRoleName = (roleName) => {
  if (!roleName) return false
  const lower = roleName.trim().toLowerCase()
  return (
    lower.includes('admin') ||
    lower.includes('security') ||
    lower.includes('guard') ||
    lower.includes('manager') ||
    lower.includes('worker') ||
    lower.includes('staff')
  )
}

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
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length < 2) return []

  const headers = splitCSVLine(lines[0]).map((h) => h.trim().toLowerCase())

  const parsed = []
  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVLine(lines[i])
    if (values.length === 0 || (values.length === 1 && !values[0])) continue

    const row = {}
    headers.forEach((header, index) => {
      let key = header
      if (header === 'email') key = 'email'
      else if (header === 'phone' || header === 'phone number' || header === 'phone no' || header === 'mobile' || header === 'contact') key = 'phone'
      else if (header === 'name' || header === 'fullname' || header === 'full name') key = 'name'
      else if (header === 'role') key = 'roleName'
      else if (
        header === 'unit number' ||
        header === 'unit no' ||
        header === 'unit' ||
        header === 'villa' ||
        header === 'villa no' ||
        header === 'villa number' ||
        header.startsWith('unit number') ||
        header.startsWith('unit')
      )
        key = 'villaNumber'
        // Ignore unrecognized columns

      if (key) {
        row[key] = values[index] || ''
      }
    })

    // Skip reference rows that are completely empty in data fields
    if (!row.email?.trim() && !row.phone?.trim() && !row.roleName?.trim()) {
      continue
    }

    row.hasEmailAndPhone = !!(row.email?.trim() && row.phone?.trim())
    row.isValidEmail = !row.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())
    row.isValidPhone = !row.phone || row.phone.trim().length >= 8
    row.isValidRole = !!row.roleName
    // Phone is mandatory for every invitation; the server normalises the format
    row.isValidPhone = /^\+?[0-9\s-]{8,16}$/.test((row.phone || '').trim())

    row.isValid = row.hasEmailAndPhone && row.isValidEmail && row.isValidPhone && row.isValidRole

    parsed.push(row)
  }
  return parsed
}

export const BulkInviteModal = ({
  visible,
  onClose,
  onBulkInvite,
  availableRoles = [],
  orgId = null,
}) => {
  const [parsedRows, setParsedRows] = useState([])
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  const fileInputRef = useRef(null)

  const handleDownloadTemplate = async () => {
    try {
      setLoading(true)
      setErrorMsg('')
      const response = await downloadBulkInviteTemplate(orgId)
      const blob = new Blob([response.data || response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', 'bulk_invite_users_template.xlsx')
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      setErrorMsg('Failed to download template.')
    } finally {
      setLoading(false)
    }
  }

  const validateParsedRows = async (rows) => {
    if (rows.length === 0) {
      setErrorMsg('The uploaded file is empty or missing headers/data.')
      return
    }

    setLoading(true)
    try {
      const { existingEmails, existingPhones } = await bulkValidateUsers(rows)
      rows = rows.map((r) => {
        const isDuplicate =
          (r.email && existingEmails.includes(r.email.toLowerCase())) ||
          (r.phone && existingPhones.includes(r.phone))
        if (isDuplicate) {
          r.isDuplicate = true
        }
        return r
      })
    } catch (apiErr) {
      console.error('Validation API failed', apiErr)
    }
    setParsedRows(rows)
    setLoading(false)
  }

  const processFileText = async (text) => {
    try {
      let rows = parseCSV(text)
      await validateParsedRows(rows)
    } catch (err) {
      setErrorMsg('Failed to parse CSV file. Please ensure it is correctly formatted.')
    }
  }

  const processExcelBuffer = async (buffer) => {
    try {
      const data = new Uint8Array(buffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      
      if (jsonData.length < 2) {
        setErrorMsg('The uploaded file is empty or missing headers.')
        return
      }

      const headers = jsonData[0].map((h) => (h || '').toString().trim().toLowerCase())
      const parsed = []

      for (let i = 1; i < jsonData.length; i++) {
        const values = jsonData[i]
        if (!values || values.length === 0 || (values.length === 1 && !values[0])) continue

        const row = {}
        headers.forEach((header, index) => {
          let key = header
          if (header === 'email') key = 'email'
          else if (header === 'phone' || header === 'phone number' || header === 'phone no' || header === 'mobile' || header === 'contact') key = 'phone'
          else if (header === 'name' || header === 'fullname' || header === 'full name') key = 'name'
          else if (header === 'role') key = 'roleName'
          else if (
            header === 'unit number' ||
            header === 'unit no' ||
            header === 'unit' ||
            header === 'villa' ||
            header === 'villa no' ||
            header === 'villa number' ||
            header.startsWith('unit number') ||
            header.startsWith('unit')
          )
            key = 'villaNumber'
          
          if (key) {
            row[key] = values[index] ? values[index].toString() : ''
          }
        })

        if (!row.email?.trim() && !row.phone?.trim() && !row.roleName?.trim()) continue

        row.hasEmailAndPhone = !!(row.email?.trim() && row.phone?.trim())
        row.isValidEmail = !row.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())
        row.isValidPhone = !row.phone || row.phone.trim().length >= 8
        row.isValidRole = !!row.roleName
        row.isValidPhone = /^\+?[0-9\s-]{8,16}$/.test((row.phone || '').trim())
        row.isValid = row.hasEmailAndPhone && row.isValidEmail && row.isValidPhone && row.isValidRole

        parsed.push(row)
      }

      await validateParsedRows(parsed)
    } catch (err) {
      setErrorMsg('Failed to parse Excel file. Please ensure it is correctly formatted.')
    }
  }

  const handleFile = (file) => {
    if (!file) return
    setFileName(file.name)
    setErrorMsg('')
    setResults(null)
    setParsedRows([])

    if (file.name.endsWith('.csv')) {
      const reader = new FileReader()
      reader.onload = (event) => processFileText(event.target.result)
      reader.readAsText(file)
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const reader = new FileReader()
      reader.onload = (event) => processExcelBuffer(event.target.result)
      reader.readAsArrayBuffer(file)
    } else {
      setErrorMsg('Please upload a valid CSV or Excel file.')
    }
  }

  const handleFileChange = (e) => {
    handleFile(e.target.files[0])
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleFile(e.dataTransfer.files[0])
  }

  const handleSubmit = async () => {
    const validRows = parsedRows.filter((r) => r.isValid)
    if (validRows.length === 0) {
      setErrorMsg('No valid rows found to invite.')
      return
    }

    setLoading(true)
    setErrorMsg('')
    try {
      const invitations = validRows.map((r) => {
          let residentType = 'None'
          if (r.roleName) {
            const lowerName = r.roleName.toLowerCase()
            if (lowerName.includes('owner')) residentType = 'Owner'
            else if (lowerName.includes('tenant')) residentType = 'Tenant'
            else if (lowerName.includes('family')) residentType = 'Family'
            else residentType = 'Guest'
          }
          return {
            email: r.email || undefined,
            phone: r.phone || undefined,
            name: r.name || undefined,
            roleName: r.roleName,
            villaNumber: (r.villaNumber && r.villaNumber.trim().toLowerCase() !== 'none') ? r.villaNumber.trim() : undefined,
            residentType,
          }
        })
      const res = await onBulkInvite(invitations)
      setResults(res)
      setParsedRows([])
      setFileName('')
    } catch (err) {
      setErrorMsg(err.message || 'Bulk invitation request failed.')
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

  const validCount = parsedRows.filter((r) => r.isValid).length
  const invalidCount = parsedRows.length - validCount

  return (
    <CModal
      visible={visible}
      onClose={handleClose}
      id="bulk-invite-modal"
      alignment="center"
      size="lg"
    >
      <CModalHeader className="border-bottom">
        <CModalTitle className="bulk-modal-title">Bulk Onboard Members & Staff</CModalTitle>
      </CModalHeader>

      <CModalBody className="p-4">

        {/* Step 1: Template Download */}
        {!fileName && !parsedRows.length && !results && (
          <div className="mb-4 text-center p-4 border rounded-3 bg-body-secondary">
            <h5 className="fw-semibold mb-2" style={{ fontSize: '0.95rem' }}>
              1. Download Template
            </h5>
            <p className="text-muted small mb-3">
              Use Name, Email, Phone Number, Role, and Unit Number for each invitation row.
              <br />
              <span className="text-info fw-semibold">Note:</span> Select <strong>"None"</strong> or leave blank for Global Roles (e.g. Community Admin, Security Guard).
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
              {fileName ? 'Uploaded File' : '2. Upload Filled Template'}
            </h5>
            <div
              className="dropzone-area p-4 border rounded-3 text-center bg-body-secondary bulk-dropzone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <CIcon
                icon={cilCloudUpload}
                size="xl"
                className="text-muted mb-2"
                style={{ opacity: 0.6 }}
              />
              {fileName ? (
                <div>
                  <div className="fw-semibold text-primary mb-1">{fileName}</div>
                  <div className="text-muted small">Click or drag another file to replace</div>
                </div>
              ) : (
                <div>
                  <div className="fw-semibold mb-1">Click to Upload or Drag & Drop File</div>
                  <div className="text-muted small">CSV or Excel files only. Maximum file size 2MB.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Parsed Rows Preview */}
        {!results && parsedRows.length > 0 && (
          <div className="parsed-preview mb-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-semibold mb-0" style={{ fontSize: '0.95rem' }}>
                3. Preview Uploaded List
              </h5>
              <div className="d-flex gap-2">
                <CBadge color="success">{validCount} Valid</CBadge>
                {invalidCount > 0 && <CBadge color="danger">{invalidCount} Invalid</CBadge>}
              </div>
            </div>

            <div className="table-responsive border rounded-3 bulk-table-container">
              <table className="table table-hover align-middle mb-0 small">
                <thead className="table-light sticky-top">
                  <tr>
                    <th scope="col" className="ps-3">
                      Name
                    </th>
                    <th scope="col">
                      Contact (Email / Phone)
                    </th>
                    <th scope="col">Role</th>
                    <th scope="col">Unit Number (Optional for Global Roles)</th>
                    <th scope="col" className="pe-3 text-center">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={row.isValid ? '' : 'table-warning-row'}
                      style={{ opacity: row.isValid ? 1 : 0.8 }}
                    >
                      <td className="ps-3 fw-semibold text-truncate">
                        {row.name || <span className="text-muted small">-</span>}
                      </td>
                      <td className="fw-semibold text-truncate bulk-text-truncate-email">
                        {row.email || row.phone || (
                          <span className="text-danger">Missing Contact</span>
                        )}
                      </td>
                      <td className="text-truncate bulk-text-truncate-role">
                        {row.roleName || <span className="text-danger">Missing</span>}
                      </td>
                      <td className="text-truncate bulk-text-truncate-role">
                        {row.villaNumber && row.villaNumber.trim().toLowerCase() !== 'none' ? (
                          row.villaNumber
                        ) : isGlobalRoleName(row.roleName) ? (
                          <span className="badge bg-secondary-subtle text-secondary border small px-2 py-1">
                            None (Global Role)
                          </span>
                        ) : (
                          <span className="badge bg-light text-muted border small px-2 py-1">None</span>
                        )}
                      </td>
                      <td className="pe-3 text-center">
                        {row.isValid && !row.isDuplicate ? (
                          <CBadge color="success">Valid</CBadge>
                        ) : row.isValid && row.isDuplicate ? (
                          <CBadge
                            color="info"
                            title="User is already registered in this community. Role or status will be updated."
                          >
                            Existing Member
                          </CBadge>
                        ) : row.isDuplicate ? (
                          <CBadge
                            color="danger"
                            title="User is already registered in this community"
                          >
                            Already Registered
                          </CBadge>
                        ) : (
                          <CBadge
                            color="danger"
                            title="Validation failed: Provide Email, Phone Number, and Role."
                          >
                            Fix Row
                          </CBadge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {invalidCount > 0 && (
              <div className="text-danger small mt-2">
                * Rows with validation issues will be excluded from the invitation request.
              </div>
            )}
          </div>
        )}

        {/* Results Screen */}
        {results && (
          <div className="invitation-results">
            <CAlert
              color={results.failureCount === 0 ? 'success' : 'warning'}
              className="mb-4 py-3"
            >
              <div className="d-flex align-items-center gap-2 mb-2">
                <CIcon icon={results.failureCount === 0 ? cilCheckCircle : cilWarning} size="xl" />
                <h6 className="fw-semibold mb-0">Bulk Processing Completed</h6>
              </div>
              <p className="mb-0 small">
                Successfully processed {results.successCount} of {results.total} users .
              </p>
            </CAlert>

            {/* Success List */}
            {results.successes && results.successes.length > 0 && (
              <div className="mb-4">
                <h6 className="fw-semibold text-success mb-2" style={{ fontSize: '0.88rem' }}>
                  Successfully Processed:
                </h6>
                <div className="list-group rounded-3 max-vh-25 bulk-list-container">
                  {results.successes.map((s, idx) => (
                    <div
                      key={idx}
                      className="list-group-item d-flex justify-content-between align-items-center py-2 small"
                    >
                      <span className="fw-semibold">{s.email || s.phone}</span>
                      <CBadge color="success">{s.status || 'Success'}</CBadge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Failure List */}
            {results.failures && results.failures.length > 0 && (
              <div>
                <h6 className="fw-semibold text-danger mb-2" style={{ fontSize: '0.88rem' }}>
                  Failed:
                </h6>
                <div className="list-group rounded-3 max-vh-25 bulk-list-container">
                  {results.failures.map((f, idx) => (
                    <div
                      key={idx}
                      className="list-group-item d-flex justify-content-between align-items-start py-2 small bg-body-secondary-danger"
                    >
                      <div className="ms-2 me-auto">
                        <div className="fw-semibold text-body">
                          {f.email || f.phone || 'Unknown'}
                        </div>
                        <span className="text-muted bulk-text-xxs">Reason: {f.error}</span>
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
        <CButton color="light" size="sm" onClick={handleClose} disabled={loading}>
          {results ? 'Close' : 'Cancel'}
        </CButton>
        {!results && parsedRows.length > 0 && (
          <CButton
            id="send-bulk-invites-btn"
            color="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={loading || validCount === 0}
            className="fw-semibold d-flex align-items-center gap-2"
          >
            {loading ? (
              <>
                <CSpinner size="sm" />
                Inviting...
              </>
            ) : (
              <>Send {validCount} Invites</>
            )}
          </CButton>
        )}
      </CModalFooter>
    </CModal>
  )
}

BulkInviteModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onBulkInvite: PropTypes.func.isRequired,
  orgId: PropTypes.string,
}

export default BulkInviteModal

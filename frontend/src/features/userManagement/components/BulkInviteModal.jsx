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
import { bulkValidateUsers } from '../services/userApi'

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
      else if (header === 'phone' || header === 'mobile' || header === 'contact') key = 'phone'
      else if (header === 'name' || header === 'fullname' || header === 'full name') key = 'name'
      else if (header === 'role') key = 'roleName'
      // Ignore other potential columns like Type, VillaNumber

      if (key) {
        row[key] = values[index] || ''
      }
    })

    // Skip reference rows that are completely empty in data fields
    if (!row.email?.trim() && !row.phone?.trim() && !row.name?.trim() && !row.roleName?.trim()) {
      continue
    }

    row.hasEmailOrPhone = !!(row.email?.trim() || row.phone?.trim())
    row.isValidEmail = !row.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())
    row.isValidPhone = !row.phone || row.phone.trim().length >= 8
    row.isValidRole = !!row.roleName

    row.isValid = row.hasEmailOrPhone && row.isValidEmail && row.isValidPhone && row.isValidRole

    parsed.push(row)
  }
  return parsed
}

export const BulkInviteModal = ({ visible, onClose, onBulkInvite, availableRoles = [] }) => {
  const [parsedRows, setParsedRows] = useState([])
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [onboardingMode, setOnboardingMode] = useState('INVITATION')
  const fileInputRef = useRef(null)

  const handleDownloadTemplate = () => {
    const roleHints =
      availableRoles && availableRoles.length > 0
        ? availableRoles.join('\n,,,,')
        : 'Community Admin\n,,,,Security Guard\n,,,,Resident Owner'

    const dynamicTemplate = `Email,Phone,Name,Role,Available Roles (Reference Only)\njohn.doe@example.com,,John Doe,Community Admin,${roleHints}\njane.smith@example.com,+919876543211,Jane Smith,Security Guard,`

    const blob = new Blob([dynamicTemplate], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'bulk_invite_users_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const processFileText = async (text) => {
    try {
      let rows = parseCSV(text)
      if (rows.length === 0) {
        setErrorMsg('The uploaded file is empty or missing headers.')
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
            r.isValid = false
            r.isDuplicate = true
          }
          return r
        })
      } catch (apiErr) {
        // Continue normally if validation API fails
        console.error('Validation API failed', apiErr)
      }
      setParsedRows(rows)
    } catch (err) {
      setErrorMsg('Failed to parse CSV file. Please ensure it is correctly formatted.')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setFileName(file.name)
    setErrorMsg('')
    setResults(null)

    const reader = new FileReader()
    reader.onload = (event) => processFileText(event.target.result)
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
      reader.onload = (event) => processFileText(event.target.result)
      reader.readAsText(file)
    } else {
      setErrorMsg('Please upload a valid CSV file.')
    }
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
      const invitations = validRows.map((r) => ({
        email: r.email || undefined,
        phone: r.phone || undefined,
        name: r.name || undefined,
        roleName: r.roleName,
        onboardingMode,
      }))
      const res = await onBulkInvite({ invitations, onboardingMode })
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
    setOnboardingMode('INVITATION')
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
        {/* Onboarding Method Selection */}
        {!results && (
          <div className="mb-4 p-3 border rounded-3 bg-body-tertiary">
            <label className="fw-semibold mb-2 d-block" style={{ fontSize: '0.9rem' }}>
              Onboarding Method
            </label>
            <div className="d-flex flex-column gap-2">
              <label className="d-flex align-items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="onboardingMode"
                  value="INVITATION"
                  checked={onboardingMode === 'INVITATION'}
                  onChange={(e) => setOnboardingMode(e.target.value)}
                  className="mt-1"
                />
                <div>
                  <strong className="d-block small">Normal Invitation</strong>
                  <span className="text-muted small">
                    Membership is <em>Pending</em> until the user accepts the invitation link via
                    email or SMS.
                  </span>
                </div>
              </label>
              <label className="d-flex align-items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="onboardingMode"
                  value="ADMIN_ANNOUNCEMENT"
                  checked={onboardingMode === 'ADMIN_ANNOUNCEMENT'}
                  onChange={(e) => setOnboardingMode(e.target.value)}
                  className="mt-1"
                />
                <div>
                  <strong className="d-block small">
                    Admin Announcement (Immediate Activation)
                  </strong>
                  <span className="text-muted small">
                    Membership is activated immediately. Existing user passwords are preserved. New
                    users receive a secure first-time password setup link.
                  </span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Step 1: Template Download */}
        {!fileName && !parsedRows.length && !results && (
          <div className="mb-4 text-center p-4 border rounded-3 bg-body-secondary">
            <h5 className="fw-semibold mb-2" style={{ fontSize: '0.95rem' }}>
              1. Download CSV Template
            </h5>
            <p className="text-muted small mb-3">
              Use our standard format to prepare your invitation list. Provide Email OR Phone for
              each row.
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
              {fileName ? 'Uploaded File' : '2. Upload Filled CSV'}
            </h5>
            <div
              className="dropzone-area p-4 border rounded-3 text-center bg-body-secondary bulk-dropzone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".csv"
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
                      Contact (Email / Phone)
                    </th>
                    <th scope="col">Name</th>
                    <th scope="col">Role</th>
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
                      <td className="ps-3 fw-semibold text-truncate bulk-text-truncate-email">
                        {row.email || row.phone || (
                          <span className="text-danger">Missing Contact</span>
                        )}
                      </td>
                      <td className="text-truncate bulk-text-truncate-role">
                        {row.name || <span className="text-muted">—</span>}
                      </td>
                      <td className="text-truncate bulk-text-truncate-role">
                        {row.roleName || <span className="text-danger">Missing</span>}
                      </td>
                      <td className="pe-3 text-center">
                        {row.isValid ? (
                          <CBadge color="success">Valid</CBadge>
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
                            title="Validation failed: Provide Email or Phone and Role."
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
                Successfully processed {results.successCount} of {results.total} users using{' '}
                {onboardingMode === 'ADMIN_ANNOUNCEMENT'
                  ? 'Admin Announcement'
                  : 'Normal Invitation'}
                .
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
}

export default BulkInviteModal

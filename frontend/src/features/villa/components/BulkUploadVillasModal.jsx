import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
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
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCloudDownload, cilCloudUpload, cilCheckCircle, cilWarning } from '@coreui/icons';
import { useTranslation } from 'react-i18next';

const TEMPLATE_CONTENT = `UnitNumber,BlockOrBuilding,Type,Email,ResidentType,Role
Unit 101,Block A,Apartment,,,
Unit 102,Block A,Apartment,resident.owner@example.com,Owner,Resident Owner
Unit 103,Block B,Villa,resident.tenant@example.com,Tenant,Resident Tenant
Unit 104,Block B,Penthouse,resident.family@example.com,Family,Family Member`;

const splitCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

const parseCSV = (text) => {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  
  const parsed = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && !values[0])) continue;

    const row = {};
    headers.forEach((header, index) => {
      let key = header;
      if (header === 'unitnumber' || header === 'unit number' || header === 'villanumber' || header === 'villa number') key = 'unitNumber';
      else if (header === 'blockorbuilding' || header === 'block' || header === 'building') key = 'blockOrBuilding';
      else if (header === 'type' || header === 'configuration') key = 'type';
      else if (header === 'email') key = 'email';
      else if (header === 'residenttype' || header === 'resident type') key = 'residentType';
      else if (header === 'role') key = 'roleName';

      row[key] = values[index] || '';
    });

    row.isValidVilla = !!row.unitNumber;

    if (row.email) {
      row.isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email);
      row.isValidResidentType = ['Owner', 'Tenant', 'Family'].includes(row.residentType);
      row.isValidRole = !!row.roleName;
    } else {
      row.isValidEmail = true;
      row.isValidResidentType = true;
      row.isValidRole = true;
    }

    row.isValid = row.isValidVilla && row.isValidEmail && row.isValidResidentType && row.isValidRole;
    parsed.push(row);
  }
  return parsed;
};

export const BulkUploadVillasModal = ({ visible, onClose, onBulkUpload }) => {
  const { t } = useTranslation();
  const [parsedRows, setParsedRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  const handleDownloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'bulk_upload_units_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMsg('');
    setResults(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const rows = parseCSV(text);
        if (rows.length === 0) {
          setErrorMsg(t('villas.bulk.emptyError', 'The uploaded file is empty or missing headers.'));
        } else {
          setParsedRows(rows);
        }
      } catch (err) {
        setErrorMsg(t('villas.bulk.parseError', 'Failed to parse CSV file.'));
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/csv') {
      setFileName(file.name);
      setErrorMsg('');
      setResults(null);

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target.result;
          const rows = parseCSV(text);
          setParsedRows(rows);
        } catch (err) {
          setErrorMsg(t('villas.bulk.parseError', 'Failed to parse CSV file.'));
        }
      };
      reader.readAsText(file);
    } else {
      setErrorMsg(t('villas.bulk.invalidType', 'Please upload a valid CSV file.'));
    }
  };

  const handleSubmit = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      setErrorMsg(t('villas.bulk.noValidRows', 'No valid rows found to upload.'));
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const payload = validRows.map(r => ({
        unitNumber: r.unitNumber,
        blockOrBuilding: r.blockOrBuilding || undefined,
        type: r.type || 'Apartment',
        email: r.email || undefined,
        residentType: r.email ? r.residentType : undefined,
        roleName: r.email ? r.roleName : undefined,
      }));
      const res = await onBulkUpload(payload);
      setResults(res);
      setParsedRows([]);
      setFileName('');
    } catch (err) {
      setErrorMsg(err.message || t('villas.bulk.failed', 'Bulk unit upload request failed.'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setParsedRows([]);
    setFileName('');
    setResults(null);
    setErrorMsg('');
    onClose();
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <CModal
      visible={visible}
      onClose={handleClose}
      alignment="center"
      size="lg"
      className="bulk-upload-villas-modal"
    >
      <CModalHeader className="border-bottom">
        <CModalTitle className="modal-title-bold">
          {t('villas.bulk.title', 'Bulk Upload Units & Residents')}
        </CModalTitle>
      </CModalHeader>

      <CModalBody className="p-4">
        {!fileName && !parsedRows.length && !results && (
          <div className="mb-4 text-center p-4 border rounded-3 bg-light">
            <h5 className="fw-semibold mb-2 section-title">
              {t('villas.bulk.step1Title', '1. Download CSV Template')}
            </h5>
            <p className="text-muted small mb-3">
              {t('villas.bulk.step1Desc', 'Use our template to upload your community units grid. If you supply resident emails, invitations will be sent automatically.')}
            </p>
            <CButton
              color="primary"
              size="sm"
              onClick={handleDownloadTemplate}
              className="d-inline-flex align-items-center gap-2 fw-semibold"
            >
              <CIcon icon={cilCloudDownload} size="sm" />
              {t('villas.bulk.download', 'Download Template')}
            </CButton>
          </div>
        )}

        {errorMsg && (
          <CAlert color="danger" className="mb-4 d-flex align-items-center gap-2 py-2 small">
            <CIcon icon={cilWarning} size="sm" />
            <span>{errorMsg}</span>
          </CAlert>
        )}

        {!results && (
          <div className="mb-4">
            <h5 className="fw-semibold mb-3 section-title">
              {fileName ? t('villas.bulk.uploadedFile', 'Uploaded File') : t('villas.bulk.step2Title', '2. Upload CSV File')}
            </h5>
            <div
              className="p-4 border rounded-3 text-center bg-light bulk-dropzone pointer-clickable"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="d-none"
              />
              <CIcon icon={cilCloudUpload} size="xl" className="text-muted mb-2 icon-opacity-60" />
              {fileName ? (
                <div>
                  <div className="fw-semibold text-primary mb-1">{fileName}</div>
                  <div className="text-muted small">{t('villas.bulk.replaceDesc', 'Click or drag another file to replace')}</div>
                </div>
              ) : (
                <div>
                  <div className="fw-semibold mb-1">{t('villas.bulk.dropzoneTitle', 'Click to Upload or Drag & Drop File')}</div>
                  <div className="text-muted small">{t('villas.bulk.dropzoneDesc', 'CSV files only. Maximum file size 2MB.')}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {!results && parsedRows.length > 0 && (
          <div className="parsed-preview mb-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-semibold mb-0 section-title">
                {t('villas.bulk.step3Title', '3. Preview Uploaded List')}
              </h5>
              <div className="d-flex gap-2">
                <CBadge color="success">{validCount} {t('villas.bulk.valid', 'Valid')}</CBadge>
                {invalidCount > 0 && <CBadge color="danger">{invalidCount} {t('villas.bulk.invalid', 'Invalid')}</CBadge>}
              </div>
            </div>

            <div className="table-responsive border rounded-3 bulk-table-container">
              <table className="table table-hover align-middle mb-0 small">
                <thead className="table-light sticky-top">
                  <tr>
                    <th scope="col" className="ps-3">{t('villas.bulk.tableUnit', 'Unit Number')}</th>
                    <th scope="col">{t('villas.bulk.tableBlock', 'Block')}</th>
                    <th scope="col">{t('villas.bulk.tableType', 'Type')}</th>
                    <th scope="col">{t('villas.bulk.tableEmail', 'Resident Email')}</th>
                    <th scope="col">{t('villas.bulk.tableTypeLabel', 'Resident Type')}</th>
                    <th scope="col">{t('villas.bulk.tableRole', 'Role')}</th>
                    <th scope="col" className="pe-3 text-center">{t('villas.bulk.tableStatus', 'Status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, idx) => (
                    <tr key={idx} className={row.isValid ? '' : 'table-warning-row'}>
                      <td className="ps-3 fw-bold text-primary">{row.unitNumber || <span className="text-danger">Missing</span>}</td>
                      <td>{row.blockOrBuilding || <span className="text-muted">—</span>}</td>
                      <td>{row.type || <span className="text-muted">—</span>}</td>
                      <td>{row.email || <span className="text-muted">—</span>}</td>
                      <td>{row.residentType || <span className="text-muted">—</span>}</td>
                      <td>{row.roleName || <span className="text-muted">—</span>}</td>
                      <td className="pe-3 text-center">
                        {row.isValid ? (
                          <CBadge color="success">{t('villas.bulk.valid', 'Valid')}</CBadge>
                        ) : (
                          <CBadge color="danger">
                            {t('villas.bulk.fixRow', 'Fix Row')}
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

        {results && (
          <div className="upload-results">
            <CAlert color={results.failureCount === 0 ? 'success' : 'warning'} className="mb-4 py-3">
              <div className="d-flex align-items-center gap-2 mb-2">
                <CIcon icon={results.failureCount === 0 ? cilCheckCircle : cilWarning} size="xl" />
                <h6 className="fw-semibold mb-0">{t('villas.bulk.completed', 'Bulk Unit Upload Completed')}</h6>
              </div>
              <p className="mb-0 small">
                {t('villas.bulk.resultSummary', {
                  count: results.successCount,
                  total: results.total,
                  defaultValue: `Successfully processed ${results.successCount} of ${results.total} units.`
                })}
              </p>
            </CAlert>

            {results.successes.length > 0 && (
              <div className="mb-4">
                <h6 className="fw-semibold text-success mb-2 fs-smaller">{t('villas.bulk.processed', 'Successfully Processed:')}</h6>
                <div className="list-group rounded-3 bulk-list-container-lg">
                  {results.successes.map((s, idx) => (
                    <div key={idx} className="list-group-item d-flex justify-content-between align-items-center py-2 small">
                      <div>
                        <span className="fw-bold text-primary">{s.unitNumber}</span>
                        <span className="text-muted ms-2">({s.action})</span>
                        {s.email && (
                          <div className="text-muted bulk-text-xxs">
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

            {results.failures.length > 0 && (
              <div>
                <h6 className="fw-semibold text-danger mb-2 alert-title-sm">
                  {t('villas.bulk.failedHeader', 'Failed to Process:')}
                </h6>
                <div className="list-group rounded-3 bulk-list-container">
                  {results.failures.map((f, idx) => (
                    <div key={idx} className="list-group-item d-flex justify-content-between align-items-start py-2 small bg-light-danger">
                      <div className="ms-2 me-auto">
                        <div className="fw-semibold text-dark">{f.unitNumber}</div>
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
        <CButton
          color="light"
          size="sm"
          onClick={handleClose}
          disabled={loading}
        >
          {results ? t('villas.bulk.close', 'Close') : t('villas.bulk.cancel', 'Cancel')}
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
                {t('villas.bulk.processing', 'Processing...')}
              </>
            ) : (
              <>
                {t('villas.bulk.uploadCount', { count: validCount, defaultValue: `Upload ${validCount} Units` })}
              </>
            )}
          </CButton>
        )}
      </CModalFooter>
    </CModal>
  );
};

BulkUploadVillasModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onBulkUpload: PropTypes.func.isRequired,
};

export default BulkUploadVillasModal;

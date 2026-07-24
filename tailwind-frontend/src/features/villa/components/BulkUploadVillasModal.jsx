import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from 'src/components/ui/dialog';
import { Button } from 'src/components/ui/button';
import { Alert, AlertDescription } from 'src/components/ui/alert';
import { Badge } from 'src/components/ui/badge';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CSVImportZone, DownloadTemplateButton } from 'src/components/common';

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
    <Dialog open={visible} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white p-6 rounded-lg shadow-default max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {t('villas.bulk.title', 'Bulk Upload Units & Residents')}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {!fileName && !parsedRows.length && !results && (
            <div className="text-center p-6 border border-dashed border-stroke dark:border-strokedark rounded bg-gray-50 dark:bg-meta-4/20">
              <h5 className="font-semibold text-sm mb-2">
                {t('villas.bulk.step1Title', '1. Download CSV Template')}
              </h5>
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-4">
                {t('villas.bulk.step1Desc', 'Use our template to upload your community units grid. If you supply resident emails, invitations will be sent automatically.')}
              </p>
              <DownloadTemplateButton onClick={handleDownloadTemplate} label={t('villas.bulk.download', 'Download Template')} />
            </div>
          )}

          {errorMsg && (
            <Alert variant="destructive" className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          {!results && (
            <div>
              <h5 className="font-semibold text-sm mb-3">
                {fileName ? t('villas.bulk.uploadedFile', 'Uploaded File') : t('villas.bulk.step2Title', '2. Upload CSV File')}
              </h5>
              <CSVImportZone
                fileName={fileName}
                onFileSelected={(file) => {
                  setFileName(file.name);
                  setErrorMsg('');
                  setResults(null);

                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const text = event.target?.result;
                      if (typeof text === 'string') {
                        const rows = parseCSV(text);
                        if (rows.length === 0) {
                          setErrorMsg(t('villas.bulk.emptyError', 'The uploaded file is empty or missing headers.'));
                        } else {
                          setParsedRows(rows);
                        }
                      }
                    } catch (err) {
                      setErrorMsg(t('villas.bulk.parseError', 'Failed to parse CSV file.'));
                    }
                  };
                  reader.readAsText(file);
                }}
                onError={setErrorMsg}
              />
            </div>
          )}

          {!results && parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h5 className="font-semibold text-sm">
                  {t('villas.bulk.step3Title', '3. Preview Uploaded List')}
                </h5>
                <div className="flex gap-2">
                  <Badge variant="lightSuccess">{validCount} {t('villas.bulk.valid', 'Valid')}</Badge>
                  {invalidCount > 0 && <Badge variant="lightError">{invalidCount} {t('villas.bulk.invalid', 'Invalid')}</Badge>}
                </div>
              </div>

              <div className="relative rounded-md border border-stroke dark:border-strokedark max-h-48 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-gray-50 dark:bg-meta-4/40 sticky top-0 border-b border-stroke dark:border-strokedark">
                    <tr>
                      <th className="py-2 px-3 font-semibold text-black dark:text-white">{t('villas.bulk.tableUnit', 'Unit Number')}</th>
                      <th className="py-2 px-3 font-semibold text-black dark:text-white">{t('villas.bulk.tableBlock', 'Block')}</th>
                      <th className="py-2 px-3 font-semibold text-black dark:text-white">{t('villas.bulk.tableType', 'Type')}</th>
                      <th className="py-2 px-3 font-semibold text-black dark:text-white">{t('villas.bulk.tableEmail', 'Resident Email')}</th>
                      <th className="py-2 px-3 font-semibold text-black dark:text-white">{t('villas.bulk.tableTypeLabel', 'Resident Type')}</th>
                      <th className="py-2 px-3 font-semibold text-black dark:text-white">{t('villas.bulk.tableRole', 'Role')}</th>
                      <th className="py-2 px-3 font-semibold text-black dark:text-white text-center">{t('villas.bulk.tableStatus', 'Status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4/20 ${
                          row.isValid ? '' : 'bg-red-50/20 dark:bg-red-950/10'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-medium text-black dark:text-white">{row.unitNumber || <span className="text-red-500">Missing</span>}</td>
                        <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400">{row.blockOrBuilding || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                        <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400">{row.type || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                        <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400">{row.email || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                        <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400">{row.residentType || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                        <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400">{row.roleName || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                        <td className="py-2.5 px-3 text-center">
                          {row.isValid ? (
                            <Badge variant="lightSuccess">{t('villas.bulk.valid', 'Valid')}</Badge>
                          ) : (
                            <Badge variant="lightError">
                              {t('villas.bulk.fixRow', 'Fix Row')}
                            </Badge>
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
            <div className="space-y-4">
              <Alert variant={results.failureCount === 0 ? 'default' : 'destructive'} className="py-3 flex gap-2">
                {results.failureCount === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                )}
                <AlertDescription className="text-sm">
                  <h6 className="font-semibold mb-1 text-black dark:text-white">{t('villas.bulk.completed', 'Bulk Unit Upload Completed')}</h6>
                  {t('villas.bulk.resultSummary', {
                    count: results.successCount,
                    total: results.total,
                    defaultValue: `Successfully processed ${results.successCount} of ${results.total} units.`
                  })}
                </AlertDescription>
              </Alert>

              {results.successes.length > 0 && (
                <div>
                  <h6 className="font-semibold text-green-600 mb-2 text-xs">{t('villas.bulk.processed', 'Successfully Processed:')}</h6>
                  <div className="border border-stroke dark:border-strokedark rounded max-h-40 overflow-y-auto divide-y divide-stroke dark:divide-strokedark bg-white dark:bg-boxdark">
                    {results.successes.map((s, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 px-3 text-xs bg-white dark:bg-boxdark">
                        <div>
                          <span className="font-bold text-primary">{s.unitNumber}</span>
                          <span className="text-gray-400 ms-2">({s.action})</span>
                          {s.email && (
                            <div className="text-gray-400 text-3xs mt-1 block">
                              Resident: <span className="font-semibold text-black dark:text-white">{s.email}</span> 
                              {s.userInvited ? (
                                <span className="text-green-500 ms-1.5 font-bold">✓ Invited</span>
                              ) : (
                                <span className="text-red-500 ms-1.5 font-bold">✗ Failed: {s.inviteError}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <Badge variant="lightSuccess">Success</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.failures.length > 0 && (
                <div>
                  <h6 className="font-semibold text-red-600 mb-2 text-xs">
                    {t('villas.bulk.failedHeader', 'Failed to Process:')}
                  </h6>
                  <div className="border border-stroke dark:border-strokedark rounded max-h-40 overflow-y-auto divide-y divide-stroke dark:divide-strokedark bg-white dark:bg-boxdark">
                    {results.failures.map((f, idx) => (
                      <div key={idx} className="flex justify-between items-start py-2 px-3 text-xs bg-red-50/10">
                        <div>
                          <div className="font-semibold text-black dark:text-white">{f.unitNumber}</div>
                          <span className="text-gray-400 text-3xs mt-0.5 block">Reason: {f.error}</span>
                        </div>
                        <Badge variant="lightError">Failed</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-end gap-2 pt-4 border-t border-stroke dark:border-strokedark">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={loading}
            className="text-xs font-semibold px-4 py-2 border-stroke dark:border-strokedark text-black dark:text-white"
          >
            {results ? t('villas.bulk.close', 'Close') : t('villas.bulk.cancel', 'Cancel')}
          </Button>
          {!results && parsedRows.length > 0 && (
            <Button
              id="confirm-bulk-upload-villas-btn"
              type="button"
              variant="default"
              size="sm"
              onClick={handleSubmit}
              disabled={loading || validCount === 0}
              className="text-xs font-semibold px-4 py-2 inline-flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent" />
                  {t('villas.bulk.processing', 'Processing...')}
                </>
              ) : (
                <>{t('villas.bulk.uploadCount', { count: validCount, defaultValue: `Upload ${validCount} Units` })}</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUploadVillasModal;

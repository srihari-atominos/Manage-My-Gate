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
import { CSVImportZone, DownloadTemplateButton } from 'src/components/common';

const TEMPLATE_CONTENT = `Email,Type,VillaNumber,ResidentType,Role
resident.owner@example.com,Resident,Villa 01,Owner,Resident Owner
resident.tenant@example.com,Resident,Villa 02,Tenant,Resident Tenant
resident.family@example.com,Resident,Villa 01,Family,Family Member
security.guard@example.com,Worker,,,Security Guard
community.admin@example.com,Worker,,,Community Admin`;

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
      if (header === 'email') key = 'email';
      else if (header === 'type') key = 'type';
      else if (header === 'villanumber' || header === 'villa number') key = 'villaNumber';
      else if (header === 'residenttype' || header === 'resident type') key = 'residentType';
      else if (header === 'role') key = 'roleName';

      row[key] = values[index] || '';
    });

    if (!row.residentType && ['Owner', 'Tenant', 'Family'].includes(row.residentType)) {
      row.residentType = 'None';
    }

    row.isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email);
    row.isValidType = ['Resident', 'Worker'].includes(row.type);
    row.isValidRole = !!row.roleName;

    if (row.type === 'Resident') {
      row.isValidVilla = !!row.villaNumber;
      row.isValidResidentType = ['Owner', 'Tenant', 'Family'].includes(row.residentType);
    } else {
      row.isValidVilla = true;
      row.isValidResidentType = true;
    }

    row.isValid = row.isValidEmail && row.isValidType && row.isValidRole && row.isValidVilla && row.isValidResidentType;

    parsed.push(row);
  }
  return parsed;
};

export const BulkInviteModal = ({ visible, onClose, onBulkInvite }) => {
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
    link.setAttribute('download', 'bulk_invite_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      setErrorMsg('No valid rows found to invite.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const payload = validRows.map(r => ({
        email: r.email,
        residentType: r.type === 'Resident' ? r.residentType : 'None',
        roleName: r.roleName,
        villaNumber: r.type === 'Resident' ? r.villaNumber : undefined,
      }));
      const res = await onBulkInvite(payload);
      setResults(res);
      setParsedRows([]);
      setFileName('');
    } catch (err) {
      setErrorMsg(err.message || 'Bulk invitation request failed.');
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
            Bulk Invite Members & Staff
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Step 1: Template Download */}
          {!fileName && !parsedRows.length && !results && (
            <div className="text-center p-6 border border-dashed border-stroke dark:border-strokedark rounded bg-gray-50 dark:bg-meta-4/20">
              <h5 className="font-semibold text-sm mb-2">1. Download CSV Template</h5>
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-4">
                Use our standard format to prepare your invitation list. You can specify whether each invitee is a resident or staff/worker.
              </p>
              <DownloadTemplateButton onClick={handleDownloadTemplate} />
            </div>
          )}

          {/* Error Messages */}
          {errorMsg && (
            <Alert variant="destructive" className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          {/* Step 2: Upload Area */}
          {!results && (
            <div>
              <h5 className="font-semibold text-sm mb-3">
                {fileName ? 'Uploaded File' : '2. Upload Filled CSV'}
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
                          setErrorMsg('The uploaded file is empty or missing headers.');
                        } else {
                          setParsedRows(rows);
                        }
                      }
                    } catch (err) {
                      setErrorMsg('Failed to parse CSV file. Please ensure it is correctly formatted.');
                    }
                  };
                  reader.readAsText(file);
                }}
                onError={setErrorMsg}
              />
            </div>
          )}

          {/* Step 3: Parsed Rows Preview */}
          {!results && parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h5 className="font-semibold text-sm">3. Preview Uploaded List</h5>
                <div className="flex gap-2">
                  <Badge variant="lightSuccess">{validCount} Valid</Badge>
                  {invalidCount > 0 && <Badge variant="lightError">{invalidCount} Invalid</Badge>}
                </div>
              </div>

              <div className="relative rounded-md border border-stroke dark:border-strokedark max-h-48 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-gray-50 dark:bg-meta-4/40 sticky top-0 border-b border-stroke dark:border-strokedark">
                    <tr>
                      <th className="py-2 px-3 font-semibold text-black dark:text-white">Email</th>
                      <th className="py-2 px-3 font-semibold text-black dark:text-white">Type</th>
                      <th className="py-2 px-3 font-semibold text-black dark:text-white">Villa Number</th>
                      <th className="py-2 px-3 font-semibold text-black dark:text-white">Resident Type</th>
                      <th className="py-2 px-3 font-semibold text-black dark:text-white">Role</th>
                      <th className="py-2 px-3 font-semibold text-black dark:text-white text-center">Status</th>
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
                        <td className="py-2.5 px-3 font-medium text-black dark:text-white max-w-[150px] truncate">{row.email || <span className="text-red-500">Missing</span>}</td>
                        <td className="py-2.5 px-3">
                          <Badge variant={row.type === 'Resident' ? 'lightInfo' : 'lightSecondary'}>
                            {row.type || 'None'}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400">{row.villaNumber || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                        <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400">{row.residentType || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                        <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400 max-w-[120px] truncate">{row.roleName || <span className="text-red-500">Missing</span>}</td>
                        <td className="py-2.5 px-3 text-center">
                          {row.isValid ? (
                            <Badge variant="lightSuccess">Valid</Badge>
                          ) : (
                            <Badge variant="lightError" title="Validation failed: Verify email, type, role or villa link.">
                              Fix Row
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {invalidCount > 0 && (
                <div className="text-red-500 text-xs font-medium">
                  * Rows with validation issues will be excluded from the invitation request.
                </div>
              )}
            </div>
          )}

          {/* Results Screen */}
          {results && (
            <div className="space-y-4">
              <Alert variant={results.failureCount === 0 ? 'default' : 'destructive'} className="py-3 flex gap-2">
                {results.failureCount === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                )}
                <AlertDescription className="text-sm">
                  <h6 className="font-semibold mb-1 text-black dark:text-white">Bulk Invitation Completed</h6>
                  Successfully processed {results.successCount} of {results.total} user invitations.
                </AlertDescription>
              </Alert>

              {/* Success List */}
              {results.successes.length > 0 && (
                <div>
                  <h6 className="font-semibold text-green-600 mb-2 text-xs">Successfully Invited:</h6>
                  <div className="border border-stroke dark:border-strokedark rounded max-h-40 overflow-y-auto divide-y divide-stroke dark:divide-strokedark bg-white dark:bg-boxdark">
                    {results.successes.map((s, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 px-3 text-xs bg-white dark:bg-boxdark">
                        <span className="font-semibold text-black dark:text-white">{s.email}</span>
                        <Badge variant="lightSuccess">Invited</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failure List */}
              {results.failures.length > 0 && (
                <div>
                  <h6 className="font-semibold text-red-600 mb-2 text-xs">Failed to Invite:</h6>
                  <div className="border border-stroke dark:border-strokedark rounded max-h-40 overflow-y-auto divide-y divide-stroke dark:divide-strokedark bg-white dark:bg-boxdark">
                    {results.failures.map((f, idx) => (
                      <div key={idx} className="flex justify-between items-start py-2 px-3 text-xs bg-red-50/10">
                        <div>
                          <div className="font-semibold text-black dark:text-white">{f.email}</div>
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
            {results ? 'Close' : 'Cancel'}
          </Button>
          {!results && parsedRows.length > 0 && (
            <Button
              id="send-bulk-invites-btn"
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
                  Inviting...
                </>
              ) : (
                <>Send {validCount} Invites</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkInviteModal;

import * as XLSX from 'xlsx';
import { downloadCSVFile, downloadExcelFile, downloadPDFFile } from '../../../utils/downloadHelper';
import { type NormalizedTransaction } from '../types';

export const TRANSACTION_EXPORT_HEADERS = [
  'Date',
  'Voucher / Transaction ID',
  'Direction',
  'Source / Domain',
  'Description',
  'Amount (INR)',
  'Currency',
  'Status',
  'Payment Method',
  'Reference ID',
  'Receipt Number',
];

/**
 * Normalizes transaction objects into 2D array of strings/numbers suitable for CSV / XLSX sheets
 */
export const buildTransactionExportRows = (
  transactions: NormalizedTransaction[]
): (string | number)[][] => {
  return transactions.map((t) => [
    t.date ? new Date(t.date).toISOString().split('T')[0] : 'N/A',
    t.id || 'N/A',
    t.type === 'income' ? 'Income / Inflow' : 'Expense / Outflow',
    t.domain || 'N/A',
    t.description || 'N/A',
    Number(t.amount) || 0,
    t.currency || 'INR',
    t.status || 'N/A',
    t.paymentMethod || 'N/A',
    t.referenceId || 'N/A',
    t.receiptNumber || 'N/A',
  ]);
};

/**
 * Creates an XLSX Worksheet with auto-proportioned column widths
 */
export const createTransactionsWorksheet = (
  transactions: NormalizedTransaction[]
): XLSX.WorkSheet => {
  const rows = buildTransactionExportRows(transactions);
  const worksheet = XLSX.utils.aoa_to_sheet([TRANSACTION_EXPORT_HEADERS, ...rows]);

  worksheet['!cols'] = [
    { wch: 14 }, // Date
    { wch: 24 }, // Voucher / Transaction ID
    { wch: 18 }, // Direction
    { wch: 16 }, // Source / Domain
    { wch: 32 }, // Description
    { wch: 14 }, // Amount
    { wch: 10 }, // Currency
    { wch: 16 }, // Status
    { wch: 18 }, // Payment Method
    { wch: 22 }, // Reference ID
    { wch: 20 }, // Receipt Number
  ];

  return worksheet;
};

/**
 * Generates and downloads a CSV file containing the filtered transactions
 */
export const exportTransactionsToCSV = async (
  transactions: NormalizedTransaction[],
  fileName: string
): Promise<void> => {
  const worksheet = createTransactionsWorksheet(transactions);
  const csvContent = XLSX.utils.sheet_to_csv(worksheet);
  await downloadCSVFile(csvContent, fileName);
};

/**
 * Generates and downloads an Excel (.xlsx) file containing the filtered transactions
 */
export const exportTransactionsToExcel = async (
  transactions: NormalizedTransaction[],
  fileName: string
): Promise<void> => {
  const worksheet = createTransactionsWorksheet(transactions);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered Transactions');
  const base64Data = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
  await downloadExcelFile(base64Data, fileName);
};

/**
 * Saves and opens server-generated export data (CSV, XLSX, or PDF)
 */
export const downloadExportFile = async (
  format: 'csv' | 'xlsx' | 'pdf',
  data: any,
  fileName: string
): Promise<void> => {
  if (format === 'csv') {
    await downloadCSVFile(data, fileName);
  } else if (format === 'xlsx') {
    await downloadExcelFile(data, fileName);
  } else if (format === 'pdf') {
    await downloadPDFFile(data, fileName);
  }
};

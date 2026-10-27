import assert from 'node:assert/strict';
import { test } from 'node:test';
import { expenseOcrConfiguration, extractReceiptData, previewReceiptOcr } from '../../src/features/expense/expenseOcr.service.js';

const localEnv = { EXPENSE_OCR_PROVIDER: 'tesseract-local', TESSERACT_COMMAND: 'tesseract', EXPENSE_OCR_LANGUAGES: 'eng', EXPENSE_OCR_TIMEOUT_MS: '1000' };

test('extractReceiptData recognises common invoice dates, totals, taxes, and item layouts', () => {
  const data = extractReceiptData('Corner Store\nInvoice Date: 21-Oct-2026\nRice Bag 2 x 50.00 100.00\nMilk 30.00\nSubtotal 130.00\nCGST 5.00\nSGST 5.00\nTotal Amount: Rs. 140.00');
  assert.equal(data.receiptDate, '2026-10-21');
  assert.equal(data.totalMinor, 14000);
  assert.deepEqual(data.items.map((item) => item.itemName), ['Rice Bag', 'Milk']);
  assert.equal(data.items[0].quantity, 2);
});

test('community OCR uses local Tesseract configuration and no cloud key', () => {
  const config = expenseOcrConfiguration(localEnv);
  assert.equal(config.configured, true);
  assert.equal(config.command, 'tesseract');
  assert.deepEqual(config.languages, ['eng']);
});

test('previewReceiptOcr reports missing local configuration without running OCR', async () => {
  const result = await previewReceiptOcr({ mimetype: 'image/jpeg', path: 'not-needed.jpg' }, { env: {}, run: async () => { throw new Error('must not run'); } });
  assert.equal(result.status, 'NOT_CONFIGURED');
});

test('previewReceiptOcr leaves PDF receipts available for manual entry', async () => {
  const result = await previewReceiptOcr({ mimetype: 'application/pdf', path: 'receipt.pdf' }, { env: localEnv });
  assert.equal(result.status, 'UNSUPPORTED_FILE');
});

test('previewReceiptOcr chooses a more useful alternate Tesseract layout result', async () => {
  const modes = [];
  const run = async (_file, config) => {
    modes.push(config.pageSegmentationMode);
    return config.pageSegmentationMode === 6
      ? { status: 'COMPLETED', text: 'Store Invoice' }
      : { status: 'COMPLETED', text: 'Store\n21 October 2026\nInvoice No: INV-12\nRice 120.00\nGrand Total 120.00' };
  };
  const result = await previewReceiptOcr({ mimetype: 'image/jpeg', path: 'receipt.jpg' }, { env: localEnv, run });
  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.result.receiptDate, '2026-10-21');
  assert.equal(result.result.totalMinor, 12000);
  assert.equal(result.result.items[0].itemName, 'Rice');
  // Community Finance must map parser field scores to the form-facing field names.
  assert.ok(result.result.fieldProvenance.totalMinor.confidence >= 80);
  assert.ok(result.result.fieldProvenance.receiptDate.confidence >= 80);
  assert.ok(result.result.fieldProvenance.receiptNumber.confidence >= 80);
  assert.deepEqual(modes, [6, 3]);
});

test('previewReceiptOcr prioritizes the focused payment amount over a stray screen digit', async () => {
  const calls = [];
  const run = async (file, config) => {
    calls.push({ path: file.path, mode: config.pageSegmentationMode, whitelist: config.characterWhitelist });
    if (file.path === 'amount.png') {
      return { status: 'COMPLETED', text: '₹57,658.00', confidence: 94 };
    }
    return {
      status: 'COMPLETED',
      text: 'Paid to\nNAVEENKUMAR A\n13 September 2026\n₹3.00',
      confidence: 88,
    };
  };
  const result = await previewReceiptOcr(
    { mimetype: 'image/jpeg', path: 'shared-proof.jpg' },
    {
      env: localEnv,
      run,
      preprocess: async () => ({
        variants: [
          { label: 'payment-amount', path: 'amount.png' },
          { label: 'enhanced', path: 'full.png' },
        ],
        cleanup: async () => {},
      }),
    }
  );

  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.result.totalMinor, 5765800);
  assert.equal(result.result.totalAmount, 57658);
  assert.equal(calls[0].mode, 7);
  assert.equal(calls[0].whitelist, '₹0123456789,.');
});

test('previewReceiptOcr returns a manual fallback when Tesseract is unavailable', async () => {
  const result = await previewReceiptOcr({ mimetype: 'image/jpeg', path: 'receipt.jpg' }, { env: localEnv, run: async () => ({ status: 'ENGINE_UNAVAILABLE', error: 'Local OCR engine is not installed or cannot be started.' }) });
  assert.equal(result.status, 'ENGINE_UNAVAILABLE');
});

test('previewReceiptOcr returns a manual fallback when no text is readable', async () => {
  const result = await previewReceiptOcr({ mimetype: 'image/jpeg', path: 'receipt.jpg' }, { env: localEnv, run: async () => ({ status: 'NO_TEXT', error: 'No readable text was found on this receipt. Enter the details manually.' }) });
  assert.equal(result.status, 'NO_TEXT');
});
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { analyzeExtraction } from '../../src/features/expense/expenseOcr.service.js';
import { extractPdfText } from '../../src/features/expense/expensePdfText.js';
import { buildOcrVariants } from '../../src/features/expense/expenseOcrPreprocess.js';
import { parseTsv } from '../../src/features/personalExpense/ocr/tesseractLocal.provider.js';

test('GST components are summed and GSTIN / invoice-date lines are not mistaken for data', () => {
  const data = extractReceiptData('Sri Balaji Traders\nGSTIN: 33ABCDE1234F1Z5\nTAX INVOICE\nInvoice Date: 21-Oct-2026\nInvoice No: SB-2210\nCement Bag 2 x 400.00 800.00\nSubtotal 800.00\nCGST @9% 72.00\nSGST @9% 72.00\nTotal Amount: Rs. 944.00');
  assert.equal(data.merchant, 'Sri Balaji Traders');
  assert.equal(data.receiptNumber, 'SB-2210');
  assert.equal(data.taxMinor, 14400);
  assert.equal(data.totalMinor, 94400);
  assert.deepEqual(analyzeExtraction(data).warnings.map((w) => w.code), []);
});

test('payment screenshots expose the UPI app, payee UPI id, reference and failed outcomes', () => {
  const paid = extractReceiptData('Google Pay\nPaid to Ramesh Electricals\nramesh@okaxis\n₹2,500\nPayment successful\n21 Oct 2026\nUPI transaction ID\n412345678901');
  assert.equal(paid.paymentApplication, 'GOOGLE_PAY');
  assert.equal(paid.payeeUpiId, 'ramesh@okaxis');
  assert.equal(paid.settlement, 'PAID');
  assert.equal(paid.transactionReference, '412345678901');
  assert.equal(paid.receiptNumber, null);
  const failed = analyzeExtraction(extractReceiptData('PhonePe\nPaid to Ramesh\n₹500\nPayment failed\n21 Oct 2026'));
  assert.equal(failed.settlement, 'FAILED');
  assert.ok(failed.warnings.some((w) => w.code === 'PAYMENT_NOT_COMPLETED'));
});

test('bank transfer screenshot extracts beneficiary vendor name, transfer amount, date, and IMPS/NEFT reference', () => {
  const text = [
    'HDFC Bank NetBanking',
    'Funds Transfer Confirmation (IMPS)',
    'Status: Transaction Successful',
    'Beneficiary Name: Apex Plumbing & Sanitation Services',
    'Beneficiary A/c No: 50100456789012',
    'Transfer Amount: Rs. 45,000.00',
    'Date & Time: 21-Oct-2026 11:30 AM',
    'IMPS Ref No: 431912345678',
    'Debited from A/c: XX4321',
  ].join('\n');

  const data = extractReceiptData(text);
  assert.equal(data.merchant, 'Apex Plumbing & Sanitation Services');
  assert.equal(data.totalMinor, 4500000);
  assert.equal(data.totalAmount, 45000);
  assert.equal(data.receiptDate, '2026-10-21');
  assert.equal(data.paymentMethod, 'BANK_TRANSFER');
  assert.equal(data.paymentApplication, 'NETBANKING');
  assert.equal(data.transactionReference, '431912345678');
  assert.equal(data.settlement, 'PAID');
  assert.equal(data.items.length, 0);
});

test('Google Pay (GPay) screenshot extracts vendor name, amount, date, and UPI reference', () => {
  const text = [
    'Google Pay',
    'Payment to Chennai Hardware Stores',
    'chennaihardware@okaxis',
    '₹ 8,750.00',
    'Completed',
    '22 Oct 2026, 3:45 PM',
    'UPI transaction ID: 429512345678',
  ].join('\n');

  const data = extractReceiptData(text);
  assert.equal(data.merchant, 'Chennai Hardware Stores');
  assert.equal(data.totalMinor, 875000);
  assert.equal(data.totalAmount, 8750);
  assert.equal(data.receiptDate, '2026-10-22');
  assert.equal(data.paymentMethod, 'UPI');
  assert.equal(data.paymentApplication, 'GOOGLE_PAY');
  assert.equal(data.transactionReference, '429512345678');
  assert.equal(data.settlement, 'PAID');
  assert.equal(data.receiptNumber, null);
});

test('analyzeExtraction flags arithmetic that does not add up and derives a missing total', () => {
  const mismatch = analyzeExtraction({ receiptDate: '2026-10-21', merchant: 'Shop', subtotalMinor: 10000, taxMinor: 1800, totalMinor: 18000, items: [], isPaymentScreenshot: false }, { ocrConfidence: 90, now: new Date('2026-10-22') });
  assert.ok(mismatch.warnings.some((w) => w.code === 'TOTAL_MISMATCH'));
  assert.ok(mismatch.confidence < 90);
  const derived = analyzeExtraction({ receiptDate: '2026-10-21', merchant: 'Shop', subtotalMinor: 10000, taxMinor: 1800, totalMinor: null, items: [], isPaymentScreenshot: false }, { now: new Date('2026-10-22') });
  assert.equal(derived.totalMinor, 11800);
  assert.ok(derived.warnings.some((w) => w.code === 'TOTAL_DERIVED'));
  const future = analyzeExtraction({ receiptDate: '2028-10-27', merchant: 'Shop', totalMinor: 10000, items: [], isPaymentScreenshot: false }, { now: new Date('2026-10-27T00:00:00Z') });
  assert.match(future.warnings.find((w) => w.code === 'DATE_IN_FUTURE').message, /2028-10-27/);
});

test('parseTsv rebuilds lines and averages word confidence', () => {
  const header = 'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext';
  const parsed = parseTsv([header, '5\t1\t1\t1\t1\t1\t0\t0\t1\t1\t90\tTotal', '5\t1\t1\t1\t1\t2\t0\t0\t1\t1\t80\t120.00', '5\t1\t1\t1\t2\t1\t0\t0\t1\t1\t-1\t', '5\t1\t1\t1\t2\t2\t0\t0\t1\t1\t70\tThanks'].join('\n'));
  assert.equal(parsed.text, 'Total 120.00\nThanks');
  assert.equal(parsed.confidence, 80);
});

test('digital PDF invoices are read from their text layer without Tesseract', async () => {
  const file = path.join(os.tmpdir(), `expense-test-${Date.now()}.pdf`);
  await new Promise((resolve) => { const doc = new PDFDocument(); const out = fs.createWriteStream(file); doc.pipe(out); doc.text('Sri Balaji Traders'); doc.text('Invoice Date: 21-Oct-2026'); doc.text('Cement Bag 800.00'); doc.text('Subtotal 800.00'); doc.text('Total Amount: Rs. 800.00'); doc.end(); out.on('finish', resolve); });
  try {
    const result = await previewReceiptOcr({ mimetype: 'application/pdf', path: file }, { env: localEnv });
    assert.equal(result.status, 'COMPLETED');
    assert.equal(result.result.source, 'PDF_TEXT');
    assert.equal(result.result.totalMinor, 80000);
    assert.equal(result.result.receiptDate, '2026-10-21');
    assert.match(await extractPdfText(file), /Sri Balaji Traders/);
  } finally { fs.rmSync(file, { force: true }); }
});

test('dark-mode screenshots are inverted and small images upscaled before OCR', async () => {
  const file = path.join(os.tmpdir(), `expense-dark-${Date.now()}.png`);
  await sharp({ create: { width: 400, height: 600, channels: 3, background: '#101010' } }).png().toFile(file);
  const { variants, cleanup } = await buildOcrVariants(file);
  try {
    assert.equal(variants[0].label, 'enhanced-inverted');
    const meta = await sharp(variants[0].path).metadata();
    assert.ok(meta.width >= 1800);
    assert.ok(fs.existsSync(variants[1].path));
  } finally { await cleanup(); fs.rmSync(file, { force: true }); }
  assert.ok(!fs.existsSync(variants[0].path));
});

test('table invoices: number, issue date, currency and only the table rows are extracted', () => {
  const simple = extractReceiptData('INVOICE\nFROM INV-001\nCompany\nBILL TO\nClient\nItem Qty Rate Total\nService 10 $100 $1,000\nTOTAL $1,000');
  assert.equal(simple.receiptNumber, 'INV-001');
  assert.equal(simple.merchant, 'Company');
  assert.equal(simple.totalMinor, 100000);
  assert.deepEqual(simple.items.map((i) => [i.itemName, i.quantity, i.unitPriceMinor, i.amountMinor]), [['Service', 10, 10000, 100000]]);

  const nz = extractReceiptData([
    'INVOICE', 'Garden repairs', 'Your business name, 126 Industry Road, Auckland 1061 New Zealand', 'BILL TO:', "Your client's name",
    '75 Hamlin Road Issue Date: 30/06/2022', 'Aucland 1060 Due Date: 14/07/2022', 'New Zealand Reference: 2022006',
    'Invoice No: Issue Date Due Date Total Due (NZD)', '2022006 30/06/2022 14/07/2022 $100.00',
    'Description Quantity Unit Price ($) Amount ($)', 'Sample Service 1 $100.00 $100.00', 'Total (NZD): $100.00',
    'Issued by, signature:', 'email@yourbusinessname.co.nz', 'Your business name', '126 Industry Road', 'Auckland 1061', 'New Zealand',
  ].join('\n'));
  assert.equal(nz.receiptNumber, '2022006');
  assert.equal(nz.receiptDate, '2022-06-30');
  assert.equal(nz.currency, 'NZD');
  assert.equal(nz.totalMinor, 10000);
  assert.deepEqual(nz.items.map((i) => [i.itemName, i.quantity, i.amountMinor]), [['Sample Service', 1, 10000]]);
});

test('single-amount receipt with watermark: contact lines, list numbers and the subtotal row are not data', () => {
  const lines = (extra) => [
    'Company Name RECEIPT', 'INVOICE # 00-000000 DATE 6/24/2013', 'Street Address Name', 'City, ST ZIP Customer ID:',
    'Phone: (000) 000-0000 Street Address', ...extra, 'DESCRIPTION AMOUNT', 'Service Fee 145.12', 'Labor: 5 hours at $75/hr 375.00',
    'OTHER COMMENTS SUBTOTAL $ 520.12', '1. Total payment due in 30 days TAXRATE 0.000%', '2. Please include the invoice number on your check TAX $ -',
    'S&H $ -', 'DISCOUNT $ (50.00)', 'TOTAL $ 470.12', 'Your Company Name',
  ].join('\n');
  for (const extra of [['Fax: (000) 000-0000'], ['Fax: 200) 000', 'Pnone: (090) 000']]) {
    const data = extractReceiptData(lines(extra));
    assert.equal(data.merchant, 'Company Name');
    assert.equal(data.receiptDate, '2013-06-24');
    assert.equal(data.subtotalMinor, 52012);
    assert.equal(data.taxMinor, null);
    assert.equal(data.discountMinor, 5000);
    assert.equal(data.additionalChargesMinor, null);
    assert.equal(data.totalMinor, 47012);
    assert.deepEqual(data.items.map((i) => [i.itemName, i.amountMinor]), [['Service Fee', 14512], ['Labor: 5 hours at 75/hr', 37500]]);
  }
});

test('without a table header, stray lines are dropped when the items must add up to the subtotal', () => {
  const data = extractReceiptData('Company Name RECEIPT\nFax: 200) 000\nPnone: (090) 000\nService Fee 145.12\nLabor 375.00\nSUBTOTAL 520.12\nTOTAL 520.12');
  assert.deepEqual(data.items.map((i) => i.itemName), ['Service Fee', 'Labor']);
});

test('Pattern A (Columns): parses tabular items with Description Qty UnitPrice LineTotal and ignores cash tendered and change', () => {
  const text = [
    'Saravana Bhavan',
    'TAX INVOICE',
    'Date: 22/10/2026',
    'Ghee Roast   2   120.00   240.00',
    'Filter Coffee   1   40.00   40.00',
    'Subtotal 280.00',
    'CGST @2.5% 7.00',
    'SGST @2.5% 7.00',
    'Grand Total: 294.00',
    'Cash Tendered: 500.00',
    'Change: 206.00',
    'Thank You Visit Again',
  ].join('\n');

  const data = extractReceiptData(text);
  assert.equal(data.expenseDate, '2026-10-22');
  assert.equal(data.totalAmount, 294.00);
  assert.equal(data.totalMinor, 29400);
  assert.equal(data.cgstAmount, 7.00);
  assert.equal(data.sgstAmount, 7.00);
  assert.equal(data.items.length, 2);

  assert.equal(data.items[0].description, 'Ghee Roast');
  assert.equal(data.items[0].quantity, 2);
  assert.equal(data.items[0].unitPrice, 120.00);
  assert.equal(data.items[0].amount, 240.00);

  assert.equal(data.items[1].description, 'Filter Coffee');
  assert.equal(data.items[1].quantity, 1);
  assert.equal(data.items[1].unitPrice, 40.00);
  assert.equal(data.items[1].amount, 40.00);
});

test('Pattern B (Multiplier): parses Description Qty x UnitPrice LineTotal with Indian comma formatting and Net Payable', () => {
  const text = [
    'IT Solutions & Hardware',
    'Invoice Date: 21-Oct-2026',
    'Invoice No: INV-8821',
    'HP Toner 88A   3 x 4,500.00   13,500.00',
    'A4 Paper Rim   2 x 350.00   700.00',
    'Sub Total: 14,200.00',
    'Net Payable: ₹14,200.00',
  ].join('\n');

  const data = extractReceiptData(text);
  assert.equal(data.expenseDate, '2026-10-21');
  assert.equal(data.totalAmount, 14200.00);
  assert.equal(data.totalMinor, 1420000);
  assert.equal(data.items.length, 2);

  assert.equal(data.items[0].description, 'HP Toner 88A');
  assert.equal(data.items[0].quantity, 3);
  assert.equal(data.items[0].unitPrice, 4500.00);
  assert.equal(data.items[0].amount, 13500.00);

  assert.equal(data.items[1].description, 'A4 Paper Rim');
  assert.equal(data.items[1].quantity, 2);
  assert.equal(data.items[1].unitPrice, 350.00);
  assert.equal(data.items[1].amount, 700.00);
});

test('Pattern C (Implicit Qty=1): parses Description Amount when quantity is implied as 1', () => {
  const text = [
    'Plumbing & Electrical Services',
    'Bill Date: 15/09/2026',
    'Pipe Replacement 750.00',
    'Labour Charge 500.00',
    'Total Amount: 1,250.00',
  ].join('\n');

  const data = extractReceiptData(text);
  assert.equal(data.expenseDate, '2026-09-15');
  assert.equal(data.totalAmount, 1250.00);
  assert.equal(data.items.length, 2);

  assert.equal(data.items[0].description, 'Pipe Replacement');
  assert.equal(data.items[0].quantity, 1);
  assert.equal(data.items[0].unitPrice, 750.00);
  assert.equal(data.items[0].amount, 750.00);

  assert.equal(data.items[1].description, 'Labour Charge');
  assert.equal(data.items[1].quantity, 1);
  assert.equal(data.items[1].unitPrice, 500.00);
  assert.equal(data.items[1].amount, 500.00);
});

test('OCR digit sanitization fixes character swaps (O->0, S->5, l->1) and handles Indian comma formatting', () => {
  const text = [
    'Shree Hardware Store',
    'Date: 12-08-2026',
    'Cement Bag 10 x 38O.OO 3,800.00',
    'Steel Rods l,25,450.00',
    'Grand Total: 1,29,25O.OO',
  ].join('\n');

  const data = extractReceiptData(text);
  assert.equal(data.expenseDate, '2026-08-12');
  assert.equal(data.totalAmount, 129250.00);
  assert.equal(data.totalMinor, 12925000);
  assert.equal(data.items.length, 2);

  assert.equal(data.items[0].description, 'Cement Bag');
  assert.equal(data.items[0].quantity, 10);
  assert.equal(data.items[0].unitPrice, 380.00);
  assert.equal(data.items[0].amount, 3800.00);

  assert.equal(data.items[1].description, 'Steel Rods');
  assert.equal(data.items[1].quantity, 1);
  assert.equal(data.items[1].unitPrice, 125450.00);
  assert.equal(data.items[1].amount, 125450.00);
});

test('Description / Notes and Expense Name are accurately extracted from receipt text and items', () => {
  const text = [
    'Sri Krishna Electricals',
    'Invoice No: INV-2026-441',
    'Date: 22/10/2026',
    'Description: Repair of water motor and pump capacitor',
    'Motor Capacitor 1 x 450.00 450.00',
    'Service Charge 1 x 300.00 300.00',
    'TOTAL AMOUNT',
    '₹ 750.00',
  ].join('\n');

  const data = extractReceiptData(text);
  assert.equal(data.expenseDate, '2026-10-22');
  assert.equal(data.totalAmount, 750.00);
  assert.equal(data.totalMinor, 75000);
  assert.equal(data.merchant, 'Sri Krishna Electricals');
  assert.equal(data.suggestedExpenseName, 'Sri Krishna Electricals - Repair of water motor and pump capacitor');
  assert.equal(data.explicitNotes, 'Repair of water motor and pump capacitor');
  assert.ok(data.notes.includes('Repair of water motor and pump capacitor'));
  assert.ok(data.notes.includes('Motor Capacitor'));
  assert.ok(data.notes.includes('INV-2026-441'));
});

test('Vertical total amount layout extracts accurate grand total across line break', () => {
  const text = [
    'Aroma Supermarket',
    'Date: 15-Oct-2026',
    'TOTAL ITEMS: 3',
    'TOTAL QTY: 4',
    'Coffee Beans 2 120.00 240.00',
    'Almond Milk 2 150.00 300.00',
    'GRAND TOTAL',
    '540.00',
  ].join('\n');

  const data = extractReceiptData(text);
  assert.equal(data.expenseDate, '2026-10-15');
  assert.equal(data.totalAmount, 540.00);
  assert.equal(data.totalMinor, 54000);
  assert.equal(data.items.length, 2);
  assert.equal(data.items[0].description, 'Coffee Beans');
  assert.equal(data.items[1].description, 'Almond Milk');
});

test('extractReceiptData recognises a bilingual TANGEDCO utility payment table without confusing the consumer number for the receipt number', () => {
  const text = [
    'TANGEDCO PAYMENT PORTAL',
    'Consumer No: 031200095434',
    'Receipt No: PGCICI708814179',
    'Date: 20/01/2025 09:53:34',
    'CC Charges 3719.00',
    'CC Deposit 824.00',
    'BPSC 32.75',
    'R Charges 130.00',
    'Rounding Off 0.25',
    'மொத்தம் 4706.00',
  ].join('\n');

  const data = extractReceiptData(text);
  assert.equal(data.documentType, 'UTILITY_PAYMENT_RECEIPT');
  assert.equal(data.merchant, 'TANGEDCO PAYMENT PORTAL');
  assert.equal(data.receiptNumber, 'PGCICI708814179');
  assert.equal(data.transactionReference, null);
  assert.equal(data.utilityAccountNumber, '031200095434');
  assert.equal(data.receiptDate, '2025-01-20');
  assert.equal(data.totalMinor, 470600);
  assert.deepEqual(data.items.map((item) => item.description), ['CC Charges', 'CC Deposit', 'BPSC', 'R Charges', 'Rounding Off']);
  assert.equal(data.items.reduce((sum, item) => sum + item.amountMinor, 0), data.totalMinor);
});

test('community OCR uses self-hosted structured OCR when local OCR misses a table-heavy utility receipt', async () => {
  const localText = 'TANGEDCO PAYMENT PORTAL\nReceipt No: PGCICI708814179\nDate: 20/01/2025';
  const oxrText = [
    'TANGEDCO PAYMENT PORTAL', 'Consumer No: 031200095434', 'Receipt No: PGCICI708814179', 'Date: 20/01/2025',
    'CC Charges 3719.00', 'CC Deposit 824.00', 'BPSC 32.75', 'R Charges 130.00', 'Rounding Off 0.25', 'Total 4706.00',
  ].join('\n');
  const result = await previewReceiptOcr(
    { mimetype: 'image/png', path: 'receipt.png', originalname: 'receipt.png' },
    {
      env: { ...localEnv, EXPENSE_OCR_OXR_ENABLED: 'true' },
      preprocess: async () => ({ variants: [], cleanup: async () => {} }),
      run: async () => ({ status: 'COMPLETED', text: localText, confidence: 91 }),
      oxr: { process: async () => ({ status: 'COMPLETED', rawText: oxrText, confidence: 94, extractedFields: extractReceiptData(oxrText) }) },
    }
  );
  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.result.ocrEngine, 'oxr');
  assert.equal(result.result.totalMinor, 470600);
  assert.equal(result.result.fieldProvenance.totalMinor.source, 'table-reconciled');
  assert.ok(result.result.warnings.some((warning) => warning.code === 'FALLBACK_TO_OXR'));
});

test('scanned PDFs use self-hosted structured OCR when no text layer exists', async () => {
  const oxrText = 'TANGEDCO PAYMENT PORTAL\nReceipt No: PGCICI708814179\nDate: 20/01/2025\nTotal 4706.00';
  const result = await previewReceiptOcr(
    { mimetype: 'application/pdf', path: 'scanned.pdf', originalname: 'scanned.pdf' },
    {
      env: { ...localEnv, EXPENSE_OCR_OXR_ENABLED: 'true' },
      readPdfText: async () => '',
      oxr: { process: async () => ({ status: 'COMPLETED', rawText: oxrText, confidence: 94, extractedFields: extractReceiptData(oxrText) }) },
    }
  );
  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.result.source, 'PDF_OXR');
  assert.equal(result.result.totalMinor, 470600);
});

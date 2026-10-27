import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';
import { parseReceiptText } from '../../src/features/personalExpense/ocr/receiptParser.js';
import { checkTesseractRuntime, runTesseract, tesseractConfiguration, validateOcrFile } from '../../src/features/personalExpense/ocr/tesseractLocal.provider.js';

const config = { command: 'tesseract', languages: ['eng'], timeoutMs: 1000 };
const fakeProcess = (text, code = 0, error = '') => {
  const process = new EventEmitter();
  process.stdout = new EventEmitter(); process.stdout.setEncoding = () => {};
  process.stderr = new EventEmitter(); process.stderr.setEncoding = () => {};
  process.kill = () => {};
  queueMicrotask(() => { if (text) process.stdout.emit('data', text); if (error) process.stderr.emit('data', error); process.emit('close', code); });
  return process;
};

test('local receipt parser prefers an explicitly labelled final total', () => {
  const result = parseReceiptText('Local Mart\n2026-10-21\nRice 2 x 50.00\nMilk 30.00\nSubtotal 130.00\nGST 6.50\nGrand Total \u20b9136.50');
  assert.equal(result.merchant, 'Local Mart');
  assert.equal(result.receiptDate, '2026-10-21');
  assert.equal(result.subtotalMinor, 13000);
  assert.equal(result.taxMinor, 650);
  assert.equal(result.totalMinor, 13650);
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].quantity, 2);
  assert.equal(result.items[0].unitPriceMinor, 5000);
  assert.equal(result.items[0].amountMinor, 10000);
});

test('ambiguous day/month dates are left for manual review', () => {
  assert.equal(parseReceiptText('Shop\n10/11/2026\nTotal 45.00').receiptDate, null);
});

test('parses named month date formats and multi-currency receipts correctly', () => {
  const sample = `Apex Plumbing & Hardware
Invoice No: INV-9843
Date: Jul 14, 2022
Pipes & Fittings $120.00 $120.00
PVC Glue 15.00
Subtotal $135.00
Tax $12.00
Total $147.00`;

  const parsed = parseReceiptText(sample);
  assert.equal(parsed.merchant, 'Apex Plumbing & Hardware');
  assert.equal(parsed.receiptNumber, 'INV-9843');
  assert.equal(parsed.receiptDate, '2022-07-14');
  assert.equal(parsed.currency, 'USD');
  assert.equal(parsed.subtotalMinor, 13500);
  assert.equal(parsed.taxMinor, 1200);
  assert.equal(parsed.totalMinor, 14700);
  assert.equal(parsed.items.length, 2);
  assert.equal(parsed.items[0].description, 'Pipes & Fittings');
  assert.equal(parsed.suggestedCategory, 'Repairs & Maintenance');
  assert.equal(parsed.suggestedExpenseType, 'REPAIRS_MAINTENANCE');
  assert.match(parsed.suggestedExpenseName, /Apex Plumbing & Hardware/);
});

test('extracts Google Pay (GPay) screenshot correctly without generating line items', () => {
  const gpayText = `Google Pay
Paid to
Apex Plumbing Supplies
apexplumbing@okaxis
₹1,500
Completed
Oct 21, 2026, 11:42 AM
UPI transaction ID: 429512345678
To: Apex Plumbing Supplies
From: State Bank of India XX1234
Google transaction ID: CICAgODV76T6eQ`;

  const parsed = parseReceiptText(gpayText);
  assert.equal(parsed.isPaymentScreenshot, true);
  assert.equal(parsed.merchant, 'Apex Plumbing Supplies');
  assert.equal(parsed.totalMinor, 150000);
  assert.equal(parsed.receiptDate, '2026-10-21');
  assert.equal(parsed.transactionReference, '429512345678');
  assert.equal(parsed.paymentMethod, 'UPI');
  assert.equal(parsed.settlement, 'PAID');
  assert.equal(parsed.items.length, 0);
  assert.equal(parsed.suggestedCategory, 'Repairs & Maintenance');
  assert.equal(parsed.suggestedExpenseType, 'REPAIRS_MAINTENANCE');
});

test('extracts PhonePe transaction screenshot without spurious item rows', () => {
  const phonepeText = `Transaction Successful
21 Oct 2026, 02:15 pm
Paid to
Vertex Hardware Store
₹2,400
Debited from
XXXXXX1234
UTR: 429587654321`;

  const parsed = parseReceiptText(phonepeText);
  assert.equal(parsed.isPaymentScreenshot, true);
  assert.equal(parsed.merchant, 'Vertex Hardware Store');
  assert.equal(parsed.totalMinor, 240000);
  assert.equal(parsed.receiptDate, '2026-10-21');
  assert.equal(parsed.transactionReference, '429587654321');
  assert.equal(parsed.paymentMethod, 'UPI');
  assert.equal(parsed.settlement, 'PAID');
  assert.equal(parsed.items.length, 0);
  assert.equal(parsed.suggestedCategory, 'Repairs & Maintenance');
});

test('extracts grocery store receipt with itemized line items', () => {
  const groceryText = `Green Supermarket
Date: 2026-10-21
Basmati Rice 5kg 1 x 450.00
Sunflower Oil 2L 1 x 280.00
Toor Dal 1kg 1 x 160.00
Subtotal 890.00
Tax 44.50
Total 934.50`;

  const parsed = parseReceiptText(groceryText);
  assert.equal(parsed.isPaymentScreenshot, false);
  assert.equal(parsed.merchant, 'Green Supermarket');
  assert.equal(parsed.totalMinor, 93450);
  assert.equal(parsed.items.length, 3);
  assert.equal(parsed.items[0].description, 'Basmati Rice 5kg');
  assert.equal(parsed.items[0].amountMinor, 45000);
  assert.equal(parsed.items[1].description, 'Sunflower Oil 2L');
  assert.equal(parsed.items[2].description, 'Toor Dal 1kg');
});

test('PDFs are stored but never sent to the local image OCR engine', () => {
  const result = validateOcrFile({ mimetype: 'application/pdf' });
  assert.equal(result.valid, false);
  assert.equal(result.status, 'UNSUPPORTED_FILE');
});

test('local OCR configuration has no Google or cloud dependency', () => {
  const result = tesseractConfiguration({ PERSONAL_EXPENSE_OCR_PROVIDER: 'tesseract-local', PERSONAL_EXPENSE_OCR_LANGUAGES: 'eng+tam', TESSERACT_COMMAND: 'tesseract' });
  assert.equal(result.configured, true);
  assert.deepEqual(result.languages, ['eng', 'tam']);
  assert.equal(result.command, 'tesseract');
});

test('local OCR reports a missing engine safely before processing a receipt', async () => {
  const result = await runTesseract({ path: 'receipt.jpg' }, config, () => { throw new Error('missing'); });
  assert.equal(result.status, 'ENGINE_UNAVAILABLE');
});

test('local OCR reports requested language data that is not installed', async () => {
  const result = await checkTesseractRuntime({ ...config, languages: ['eng', 'tam'] }, () => fakeProcess('List of available languages in "tessdata" (1):\neng\n'));
  assert.equal(result.status, 'LANGUAGE_UNAVAILABLE');
  assert.match(result.error, /tam/);
});

test('local OCR verifies its language data before capturing receipt text', async () => {
  const fakeSpawn = (_command, args) => args[0] === '--list-langs'
    ? fakeProcess('List of available languages in "tessdata" (1):\neng\n')
    : fakeProcess('Store\nGrand Total 99.00');
  const result = await runTesseract({ path: 'receipt.jpg' }, config, fakeSpawn);
  assert.equal(result.status, 'COMPLETED');
  assert.match(result.text, /Grand Total/);
});
test('local OCR keeps recognised text when the optional TSV config is unavailable', async () => {
  const fakeSpawn = (_command, args) => args.includes('--list-langs')
    ? fakeProcess('List of available languages in "tessdata" (1):\neng\n')
    : fakeProcess('English Store\nGrand Total 99.00', 0, "read_params_file: Can't open tsv");
  const result = await runTesseract({ path: 'receipt.jpg' }, { ...config, withConfidence: true }, fakeSpawn);
  assert.equal(result.status, 'COMPLETED');
  assert.match(result.text, /Grand Total 99.00/);
  assert.equal(result.confidence, null);
});

test('keeps a payment reference separate from an invoice or receipt number', () => {
  const parsed = parseReceiptText(`Google Pay
Paid to
Apex Plumbing Supplies
₹1,500
Completed
Oct 21, 2026
UPI transaction ID: 429512345678`);

  assert.equal(parsed.documentType, 'PAYMENT_CONFIRMATION');
  assert.equal(parsed.receiptNumber, null);
  assert.equal(parsed.invoiceNumber, null);
  assert.equal(parsed.transactionId, '429512345678');
  assert.equal(parsed.transactionReference, '429512345678');
  assert.equal(parsed.suggestedExpenseName, 'Payment to Apex Plumbing Supplies');
});

test('classifies and extracts an English utility payment receipt without using account values as the receipt number', () => {
  const parsed = parseReceiptText(`TANGEDCO PAYMENT PORTAL
Payment Receipt
Consumer No: 031200095434
Receipt No: PGCICI708814179
Date: 20/01/2025
CC Charges 3719.00
CC Deposit 824.00
BPSC 32.75
R Charges 130.00
Rounding Off 0.25
Total 4706.00`);

  assert.equal(parsed.documentType, 'UTILITY_BILL');
  assert.equal(parsed.merchant, 'TANGEDCO PAYMENT PORTAL');
  assert.equal(parsed.receiptNumber, 'PGCICI708814179');
  assert.equal(parsed.transactionId, null);
  assert.equal(parsed.receiptDate, '2025-01-20');
  assert.equal(parsed.totalMinor, 470600);
  assert.equal(parsed.suggestedExpenseName, 'Utility Bill - TANGEDCO PAYMENT PORTAL');
});
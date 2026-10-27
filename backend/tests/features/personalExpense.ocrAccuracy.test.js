import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import sharp from 'sharp';
import {
  parseReceiptText,
  sanitizeNumericToken,
  dateFrom,
  extractTotalAmount,
  extractPaymentAmount,
  isPaymentAppScreenshot,
  analyzeReceiptExtraction,
} from '../../src/features/personalExpense/ocr/receiptParser.js';
import { buildReceiptVariants } from '../../src/features/personalExpense/ocr/receiptPreprocess.js';
import { extractReceipt } from '../../src/features/personalExpense/personalExpenseOcr.service.js';
import { tesseractConfiguration, checkTesseractRuntime } from '../../src/features/personalExpense/ocr/tesseractLocal.provider.js';

/* -------------------------------------------------------------------------- */
/* 1. Grocery and Supermarket Receipts                                        */
/* -------------------------------------------------------------------------- */
test('1. Grocery receipt: itemized lines, quantity multipliers, taxes and grand total', () => {
  const groceryText = `Nilgiris Supermarket
Tax Invoice # NIL-2026-9042
Date: 21-Oct-2026
Aashirvaad Atta 5kg 1 x 245.00 245.00
Tata Salt 1kg 2 x 28.00 56.00
Amul Butter 500g 1 x 275.00 275.00
Fortune Sunlite Oil 1L 2 x 135.00 270.00
Subtotal 846.00
CGST @2.5% 21.15
SGST @2.5% 21.15
Round Off -0.30
Net Payable Rs. 888.00
Cash Tendered: 1,000.00
Change Due: 112.00
Thank You! Visit Again`;

  const parsed = parseReceiptText(groceryText);
  assert.equal(parsed.merchant, 'Nilgiris Supermarket');
  assert.equal(parsed.receiptDate, '2026-10-21');
  assert.equal(parsed.receiptNumber, 'NIL-2026-9042');
  assert.equal(parsed.subtotalMinor, 84600);
  assert.equal(parsed.taxMinor, 4230); // 21.15 + 21.15 = 42.30
  assert.equal(parsed.totalMinor, 88800);
  assert.equal(parsed.totalAmount, 888.00);
  assert.equal(parsed.items.length, 4);
  assert.equal(parsed.items[0].description, 'Aashirvaad Atta 5kg');
  assert.equal(parsed.items[1].quantity, 2);
  assert.equal(parsed.items[1].unitPriceMinor, 2800);
  assert.equal(parsed.items[1].amountMinor, 5600);
  assert.equal(parsed.fieldConfidence.total.level, 'HIGH');
  assert.equal(parsed.fieldConfidence.date.level, 'HIGH');
});

/* -------------------------------------------------------------------------- */
/* 2. Electrical Materials and Hardware Receipts                              */
/* -------------------------------------------------------------------------- */
test('2. Electrical and hardware receipt: wires, switches, pipes with GST', () => {
  const hardwareText = `Sri Balaji Electricals & Hardware
GSTIN: 33ABCDE1234F1Z5
Bill No: EB-784
Date: 22-Oct-2026
Finolex 1.5 sq mm Wire 2 x 1,450.00 2,900.00
Anchor Roma 16A Switch 10 x 45.00 450.00
PVC Conduit Pipe 25mm 5 x 80.00 400.00
Subtotal 3,750.00
CGST 9% 337.50
SGST 9% 337.50
Grand Total: ₹4,425.00`;

  const parsed = parseReceiptText(hardwareText);
  assert.equal(parsed.merchant, 'Sri Balaji Electricals & Hardware');
  assert.equal(parsed.receiptDate, '2026-10-22');
  assert.equal(parsed.receiptNumber, 'EB-784');
  assert.equal(parsed.subtotalMinor, 375000);
  assert.equal(parsed.taxMinor, 67500);
  assert.equal(parsed.totalMinor, 442500);
  assert.equal(parsed.totalAmount, 4425.00);
  assert.equal(parsed.items.length, 3);
  assert.equal(parsed.items[0].description, 'Finolex 1.5 sq mm Wire');
  assert.equal(parsed.items[0].quantity, 2);
  assert.equal(parsed.items[0].amountMinor, 290000);
  assert.equal(parsed.suggestedCategory, 'Repairs & Maintenance');
  assert.equal(parsed.suggestedExpenseType, 'REPAIRS_MAINTENANCE');
});

/* -------------------------------------------------------------------------- */
/* 3. Google Pay (GPay) Payment Screenshot                                     */
/* -------------------------------------------------------------------------- */
test('3. Google Pay (GPay) screenshot: payee, UPI ID, reference and status', () => {
  const gpayText = `Google Pay
Paid to
Apex Hardware & Sanitary
apexhardware@okaxis
₹3,450
Completed
Oct 21, 2026, 11:42 AM
UPI transaction ID: 429512345678
To: Apex Hardware & Sanitary
From: State Bank of India XX1234
Google transaction ID: CICAgODV76T6eQ`;

  const parsed = parseReceiptText(gpayText);
  assert.equal(parsed.isPaymentScreenshot, true);
  assert.equal(parsed.merchant, 'Apex Hardware & Sanitary');
  assert.equal(parsed.totalMinor, 345000);
  assert.equal(parsed.totalAmount, 3450.00);
  assert.equal(parsed.receiptDate, '2026-10-21');
  assert.equal(parsed.paymentApplication, 'GOOGLE_PAY');
  assert.equal(parsed.payeeUpiId, 'apexhardware@okaxis');
  assert.equal(parsed.transactionReference, '429512345678');
  assert.equal(parsed.settlement, 'PAID');
  assert.equal(parsed.items.length, 0); // No phantom items generated for payment proofs
  assert.equal(parsed.fieldConfidence.total.level, 'HIGH');
  assert.equal(parsed.fieldConfidence.reference.level, 'HIGH');
});

/* -------------------------------------------------------------------------- */
/* 4. PhonePe Payment Screenshot                                              */
/* -------------------------------------------------------------------------- */
test('4. PhonePe screenshot: recipient, UTR, time and payment outcome', () => {
  const phonepeText = `PhonePe
Transaction Successful
21 Oct 2026, 03:15 pm
Paid to
Kumar Provisions
₹1,250.00
Debited from
A/c No. ...4321
UTR: 429587654321`;

  const parsed = parseReceiptText(phonepeText);
  assert.equal(parsed.isPaymentScreenshot, true);
  assert.equal(parsed.paymentApplication, 'PHONEPE');
  assert.equal(parsed.merchant, 'Kumar Provisions');
  assert.equal(parsed.totalMinor, 125000);
  assert.equal(parsed.totalAmount, 1250.00);
  assert.equal(parsed.receiptDate, '2026-10-21');
  assert.equal(parsed.transactionReference, '429587654321');
  assert.equal(parsed.settlement, 'PAID');
  assert.equal(parsed.fieldConfidence.total.level, 'HIGH');
});

/* -------------------------------------------------------------------------- */
/* 5. Paytm Payment Screenshot                                                */
/* -------------------------------------------------------------------------- */
test('5. Paytm screenshot: Money sent, UPI ref no and date', () => {
  const paytmText = `Paytm Payments Bank
Money sent successfully to
Saravana Bhavan
₹480
21 Oct 2026, 08:30 PM
UPI Ref No: 429500112233
From: HDFC Bank A/c ...7890`;

  const parsed = parseReceiptText(paytmText);
  assert.equal(parsed.isPaymentScreenshot, true);
  assert.equal(parsed.paymentApplication, 'PAYTM');
  assert.equal(parsed.merchant, 'Saravana Bhavan');
  assert.equal(parsed.totalMinor, 48000);
  assert.equal(parsed.totalAmount, 480.00);
  assert.equal(parsed.receiptDate, '2026-10-21');
  assert.equal(parsed.transactionReference, '429500112233');
  assert.equal(parsed.settlement, 'PAID');
});

test('5a. Shared payment-confirmation screenshot: prominent amount and payee without a reference', () => {
  const sharedConfirmationText = `You
13 September, 8:20 pm
₹57,658.00
Paid to
NAVEENKUMAR A
Banking name: NAVEENKUMAR A
13 September 2026, 8:20 pm`;

  const parsed = parseReceiptText(sharedConfirmationText);
  assert.equal(parsed.isPaymentScreenshot, true);
  assert.equal(parsed.totalMinor, 5765800);
  assert.equal(parsed.totalAmount, 57658.00);
  assert.equal(parsed.merchant, 'NAVEENKUMAR A');
  assert.equal(parsed.receiptDate, '2026-09-13');
  assert.equal(parsed.transactionReference, null);
  assert.equal(parsed.settlement, 'PAID');
});

/* -------------------------------------------------------------------------- */
/* 6. Failed & Pending UPI Payment Proofs                                     */
/* -------------------------------------------------------------------------- */
test('6. UPI payment failure is detected and diagnostic warning is attached', () => {
  const failedText = `Google Pay
Paid to City Services
cityservices@okhdfcbank
₹1,800
Payment failed
22 Oct 2026, 10:15 AM
UPI transaction ID: 429611223344
Money will not be debited from your account`;

  const parsed = parseReceiptText(failedText);
  assert.equal(parsed.isPaymentScreenshot, true);
  assert.equal(parsed.settlement, 'FAILED');
  assert.equal(parsed.totalMinor, 180000);
  assert.ok(parsed.warnings.some((w) => w.code === 'PAYMENT_NOT_COMPLETED'));
  assert.equal(parsed.needsReview, true);
});

test('6b. UPI payment pending is detected and flagged for review', () => {
  const pendingText = `PhonePe
Payment Pending
22 Oct 2026
Paid to Modern Electricals
₹2,100
Awaiting confirmation from beneficiary bank
UTR: 429699887766`;

  const parsed = parseReceiptText(pendingText);
  assert.equal(parsed.isPaymentScreenshot, true);
  assert.equal(parsed.settlement, 'PENDING');
  assert.ok(parsed.warnings.some((w) => w.code === 'PAYMENT_NOT_COMPLETED'));
});

/* -------------------------------------------------------------------------- */
/* 7. Bank Transaction Receipt / SMS without mistaking Available Balance      */
/* -------------------------------------------------------------------------- */
test('7. Bank SMS / confirmation: extracts debited amount and ignores available balance', () => {
  const bankSmsText = `State Bank of India
Transaction Alert
Dear Customer, your A/c XX5678 has been debited by Rs. 4,500.00 on 21-Oct-2026.
Transfer to Sri Murugan Stores.
UPI Ref: 429567890123.
Available Bal: Rs. 38,420.50.`;

  const parsed = parseReceiptText(bankSmsText);
  // Must extract 4,500.00 (450000 minor), NOT the available balance of 38,420.50!
  assert.equal(parsed.totalMinor, 450000);
  assert.equal(parsed.totalAmount, 4500.00);
  assert.equal(parsed.receiptDate, '2026-10-21');
  assert.equal(parsed.transactionReference, '429567890123');
});

/* -------------------------------------------------------------------------- */
/* 8. Restaurant Receipt with Cash Tendered and Change                        */
/* -------------------------------------------------------------------------- */
test('8. Restaurant receipt: ignores cash tendered and change due, selects net bill total', () => {
  const restaurantText = `Ananda Bhavan Restaurant
GSTIN: 33AAAAA1234A1Z5
Bill No: AB-102
Date: 21/10/2026
Masala Dosa 2 x 90.00 180.00
Filter Coffee 2 x 35.00 70.00
Subtotal 250.00
CGST @2.5% 6.25
SGST @2.5% 6.25
Total Payable: ₹262.50
Cash Tendered: 500.00
Change Due: 237.50
Thank You Visit Again`;

  const parsed = parseReceiptText(restaurantText);
  assert.equal(parsed.merchant, 'Ananda Bhavan Restaurant');
  assert.equal(parsed.receiptDate, '2026-10-21');
  assert.equal(parsed.subtotalMinor, 25000);
  assert.equal(parsed.taxMinor, 1250);
  assert.equal(parsed.totalMinor, 26250);
  assert.equal(parsed.totalAmount, 262.50);
  assert.equal(parsed.items.length, 2);
});

/* -------------------------------------------------------------------------- */
/* 9. Multilingual Receipts: Tamil & Hindi                                    */
/* -------------------------------------------------------------------------- */
test('9. Tamil store receipt: extracts Tamil merchant, items and மொத்தம் (total)', () => {
  const tamilText = `அன்னை மளிகை ஸ்டோர்
தேதி: 21-10-2026
பொன்னி அரிசி 10kg 1 x 550.00 550.00
சூரியகாந்தி எண்ணெய் 1L 1 x 140.00 140.00
Subtotal 690.00
மொத்தம் ₹690.00
நன்றி மீண்டும் வருக`;

  const parsed = parseReceiptText(tamilText);
  assert.equal(parsed.receiptDate, '2026-10-21');
  assert.equal(parsed.totalMinor, 69000);
  assert.equal(parsed.totalAmount, 690.00);
  assert.equal(parsed.subtotalMinor, 69000);
  assert.match(parsed.merchant, /அன்னை மளிகை ஸ்டோர்/);
  assert.equal(parsed.items.length, 2);
  assert.match(parsed.items[0].description, /பொன்னி அரிசி/);
});

test('9b. Hindi store receipt: extracts Hindi merchant and कुल (total)', () => {
  const hindiText = `श्री गणेश प्रोविज़न स्टोर
दिनांक: 21-10-2026
आटा 10kg 1 x 420.00 420.00
चीनी 2kg 2 x 45.00 90.00
Subtotal 510.00
कुल ₹510.00
धन्यवाद`;

  const parsed = parseReceiptText(hindiText);
  assert.equal(parsed.receiptDate, '2026-10-21');
  assert.equal(parsed.totalMinor, 51000);
  assert.equal(parsed.totalAmount, 510.00);
  assert.match(parsed.merchant, /श्री गणेश प्रोविज़न स्टोर/);
  assert.equal(parsed.items.length, 2);
  assert.match(parsed.items[0].description, /आटा/);
});

/* -------------------------------------------------------------------------- */
/* 10. Date Disambiguation Rules                                              */
/* -------------------------------------------------------------------------- */
test('10. Date parsing: unlabelled ambiguous date returns null; labelled date resolves in Indian format', () => {
  // Unlabelled ambiguous date: 04/05/2026 (could be April 5 or May 4) -> returns null for manual confirmation
  assert.equal(parseReceiptText('Quick Mart\n04/05/2026\nTotal 150.00').receiptDate, null);

  // Labelled date: Date: 04/05/2026 -> resolves to DD/MM/YYYY (2026-05-04)
  assert.equal(parseReceiptText('Quick Mart\nDate: 04/05/2026\nTotal 150.00').receiptDate, '2026-05-04');

  // Unambiguous numeric date: 25/08/2026 (day=25 > 12) -> resolves to 2026-08-25 even unlabelled
  assert.equal(parseReceiptText('Quick Mart\n25/08/2026\nTotal 150.00').receiptDate, '2026-08-25');

  // ISO date: 2026-09-15 -> resolves to 2026-09-15
  assert.equal(parseReceiptText('Quick Mart\n2026-09-15\nTotal 150.00').receiptDate, '2026-09-15');
});

/* -------------------------------------------------------------------------- */
/* 11. OCR Character Swap Sanitization & Artifact Resilience                  */
/* -------------------------------------------------------------------------- */
test('11. OCR character swaps (O->0, S->5, l->1, B->8) and misread rupee symbols', () => {
  assert.equal(sanitizeNumericToken('O12.5O'), '012.50');
  assert.equal(sanitizeNumericToken('1S0.00'), '150.00');
  assert.equal(sanitizeNumericToken('l,250.00'), '1250.00');
  assert.equal(sanitizeNumericToken('? 450.00'), '450.00');
  assert.equal(sanitizeNumericToken('₹ 1,25,450.00'), '125450.00');
  assert.equal(sanitizeNumericToken('B50.00'), '850.00');
});

/* -------------------------------------------------------------------------- */
/* 12. Arithmetic Invariant & Field Confidence Verification                   */
/* -------------------------------------------------------------------------- */
test('12. Arithmetic checks flag mismatches and derive missing total safely', () => {
  // Subtotal (500) + Tax (50) does not match Total (900)
  const mismatch = analyzeReceiptExtraction({
    merchant: 'Store',
    receiptDate: '2026-10-21',
    subtotalMinor: 50000,
    taxMinor: 5000,
    totalMinor: 90000,
    items: [],
    isPaymentScreenshot: false,
  });
  assert.ok(mismatch.warnings.some((w) => w.code === 'TOTAL_MISMATCH'));
  assert.equal(mismatch.fieldConfidence.total.level, 'MEDIUM');

  // Missing total is derived from subtotal and tax
  const derived = analyzeReceiptExtraction({
    merchant: 'Store',
    receiptDate: '2026-10-21',
    subtotalMinor: 50000,
    taxMinor: 5000,
    totalMinor: null,
    items: [],
    isPaymentScreenshot: false,
  });
  assert.equal(derived.totalMinor, 55000);
  assert.equal(derived.totalAmount, 550.00);
  assert.ok(derived.warnings.some((w) => w.code === 'TOTAL_DERIVED'));
});

/* -------------------------------------------------------------------------- */
/* 13. Preprocessing Pipeline: Generates Variants & Cleans Up Safely          */
/* -------------------------------------------------------------------------- */
test('13. Preprocessing pipeline: creates enhanced, thermal and digital variants and cleans up', async () => {
  const tempTestImage = path.join(os.tmpdir(), `test-receipt-${Date.now()}.png`);
  // Create a synthetic 1200x800 receipt-like image
  await sharp({
    create: {
      width: 1200,
      height: 800,
      channels: 3,
      background: { r: 245, g: 245, b: 240 },
    },
  }).png().toFile(tempTestImage);

  try {
    const { variants, inverted, cleanup } = await buildReceiptVariants(tempTestImage);
    assert.ok(variants.length >= 2);
    // Verify upscaling: initial width 1200 should be scaled up to >= 1800 for optimal OCR
    const meta = await sharp(variants[0].path).metadata();
    assert.ok(meta.width >= 1800);
    assert.ok(fs.existsSync(variants[0].path));

    // Execute cleanup and verify all temp files removed
    await cleanup();
    assert.ok(!fs.existsSync(variants[0].path));
  } finally {
    fs.rmSync(tempTestImage, { force: true });
  }
});

/* -------------------------------------------------------------------------- */
/* 14. Full OCR Orchestrator: Multi-Pass Execution and Field Confidence       */
/* -------------------------------------------------------------------------- */
test('14. extractReceipt orchestrator evaluates variants and returns field-level confidence', async () => {
  const dummyFile = { path: 'receipt.png', mimetype: 'image/png', size: 1024 };
  const mockRun = async (_file, config) => ({
    status: 'COMPLETED',
    text: `Apex Hardware
Date: 21-Oct-2026
PVC Pipe 2 x 150.00 300.00
Subtotal 300.00
Grand Total: ₹300.00`,
    confidence: 88,
  });

  const outcome = await extractReceipt(dummyFile, {
    env: { PERSONAL_EXPENSE_OCR_PROVIDER: 'tesseract-local' },
    run: mockRun,
  });

  assert.equal(outcome.status, 'COMPLETED');
  assert.equal(outcome.result.merchant, 'Apex Hardware');
  assert.equal(outcome.result.totalMinor, 30000);
  assert.equal(outcome.result.totalAmount, 300.00);
  assert.equal(outcome.result.fieldConfidence.total.level, 'HIGH');
  assert.equal(outcome.result.fieldConfidence.date.level, 'HIGH');
});

/* -------------------------------------------------------------------------- */
/* 15. Bank IMPS / NetBanking Transfer Advice Perspective                     */
/* -------------------------------------------------------------------------- */
test('15. Bank IMPS Transfer Advice: beneficiary, date, amount, IMPS reference', () => {
  const bankAdviceText = `HDFC Bank NetBanking
Payment Confirmation & Transfer Advice
Date: 24-Oct-2026
Beneficiary Name: Apex Hardware & Supplies
From Account: A/c 50100234567890
Transfer Amount: Rs. 14,500.00
IMPS Ref No: 429812345678
Status: Transfer Successful`;

  const parsed = parseReceiptText(bankAdviceText);
  assert.equal(parsed.isPaymentScreenshot, true);
  assert.equal(parsed.merchant, 'Apex Hardware & Supplies');
  assert.equal(parsed.totalMinor, 1450000);
  assert.equal(parsed.totalAmount, 14500.00);
  assert.equal(parsed.receiptDate, '2026-10-24');
  assert.equal(parsed.transactionReference, '429812345678');
  assert.equal(parsed.settlement, 'PAID');
});

/* -------------------------------------------------------------------------- */
/* 16. PhonePe Transfer to Contact with "To <Name>" Header Pattern            */
/* -------------------------------------------------------------------------- */
test('16. PhonePe transfer to contact with To <Name>: recipient, UTR, date, amount', () => {
  const phonePeTransferText = `PhonePe
Transaction Successful
To Rajesh Electrician
₹2,500
24 Oct 2026, 04:30 pm
Debited from State Bank of India ...5678
UTR: 429887654321
Transaction ID: T2610241630123456789012`;

  const parsed = parseReceiptText(phonePeTransferText);
  assert.equal(parsed.isPaymentScreenshot, true);
  assert.equal(parsed.merchant, 'Rajesh Electrician');
  assert.equal(parsed.totalMinor, 250000);
  assert.equal(parsed.totalAmount, 2500.00);
  assert.equal(parsed.receiptDate, '2026-10-24');
  assert.equal(parsed.transactionReference, '429887654321');
  assert.equal(parsed.settlement, 'PAID');
});

/* -------------------------------------------------------------------------- */
/* 17. Standard Tax Invoice Perspective (4 Essential Fields)                  */
/* -------------------------------------------------------------------------- */
test('17. Printed Tax Invoice perspective: extracts the 4 essential fields cleanly', () => {
  const invoiceText = `Shree Balaji Plywood & Hardware
GSTIN: 33ABCDE1234F1Z5
Invoice No: INV-2026-0042
Invoice Date: 2026-10-24
Billed to: Naveen
18mm Marine Ply 4 x 2200.00 8800.00
Fevicol SH 5kg 1 x 1150.00 1150.00
Subtotal: 9950.00
CGST 9%: 895.50
SGST 9%: 895.50
Grand Total: ₹ 11,741.00`;

  const parsed = parseReceiptText(invoiceText);
  assert.equal(parsed.merchant, 'Shree Balaji Plywood & Hardware');
  assert.equal(parsed.receiptNumber, 'INV-2026-0042');
  assert.equal(parsed.receiptDate, '2026-10-24');
  assert.equal(parsed.totalMinor, 1174100);
  assert.equal(parsed.totalAmount, 11741.00);
});

/* -------------------------------------------------------------------------- */
/* 18. POS Thermal Supermarket Receipt Perspective                            */
/* -------------------------------------------------------------------------- */
test('18. POS Thermal Supermarket receipt: store name, bill no, date, net payable', () => {
  const thermalText = `DMart Ready Supermarket
Avenue Supermarts Ltd
Bill No: 8491
Date: 24/10/2026 Time: 19:45
Item Qty Amount
Aashirvaad Atta 10kg 1 450.00
Tata Salt 1kg 2 56.00
TOTAL: 506.00
CASH TENDERED: 1000.00
CHANGE DUE: 494.00
Thank You Visit Again`;

  const parsed = parseReceiptText(thermalText);
  assert.equal(parsed.merchant, 'DMart Ready Supermarket');
  assert.equal(parsed.receiptNumber, '8491');
  assert.equal(parsed.receiptDate, '2026-10-24');
  assert.equal(parsed.totalMinor, 50600);
  assert.equal(parsed.totalAmount, 506.00);
});

/* -------------------------------------------------------------------------- */
/* 19. Receipt Top Header Vendor Name Extraction                              */
/* -------------------------------------------------------------------------- */
test('19. Receipt Top Header Vendor Name extraction: handles titles, greetings, and locations', () => {
  // Case A: Title on line 0, merchant on line 1
  const textWithTitleFirst = `TAX INVOICE
City Electricals & Hardware
GSTIN: 33AAAAA1234A1Z5
Invoice No: INV-8921
Date: 2026-10-24
Total Amount: ₹ 4,500.00`;
  const parsedA = parseReceiptText(textWithTitleFirst);
  assert.equal(parsedA.merchant, 'City Electricals & Hardware');
  assert.equal(parsedA.receiptNumber, 'INV-8921');
  assert.equal(parsedA.totalMinor, 450000);

  // Case B: Greeting prefix on line 0
  const textWithGreeting = `WELCOME TO NILGIRIS SUPERMARKET
12, Commercial Street, Bangalore
Bill No: 10425
Date: 24-Oct-2026
Total: ₹ 1,250.00`;
  const parsedB = parseReceiptText(textWithGreeting);
  assert.equal(parsedB.merchant, 'NILGIRIS SUPERMARKET');
  assert.equal(parsedB.receiptNumber, '10425');
  assert.equal(parsedB.totalMinor, 125000);

  // Case C: Merchant with title suffix
  const textWithSuffix = `Apollo Pharmacy - Retail Invoice
Reg No: 12345
Bill #: AP-90412
Date: 24/10/2026
Total: ₹ 650.00`;
  const parsedC = parseReceiptText(textWithSuffix);
  assert.equal(parsedC.merchant, 'Apollo Pharmacy');
  assert.equal(parsedC.receiptNumber, 'AP-90412');
  assert.equal(parsedC.totalMinor, 65000);
});

/* -------------------------------------------------------------------------- */
/* 20. Multi-Format Invoice & Bill Number Recognition                         */
/* -------------------------------------------------------------------------- */
test('20. Multi-format Invoice & Bill number recognition: two-line, slash-delimited, cash memo, order ID', () => {
  // Two-line pattern: Label on line 1, value on line 2
  const twoLineBill = `Sri Balaji Store
Bill No:
84912
Date: 24-10-2026
Total: 350.00`;
  assert.equal(parseReceiptText(twoLineBill).receiptNumber, '84912');

  // Slash-delimited invoice format: TI/2026/049
  const slashInv = `Lakshmi Paints
Tax Invoice No: TI/2026/049
Date: 24/10/2026
Total: 8,400.00`;
  assert.equal(parseReceiptText(slashInv).receiptNumber, 'TI/2026/049');

  // Cash memo format: CM-402
  const cashMemo = `Madras Coffee House
Cash Memo No: CM-402
Date: 24-Oct-2026
Total: 120.00`;
  assert.equal(parseReceiptText(cashMemo).receiptNumber, 'CM-402');

  // Order ID format: 402-9812-491
  const orderIdText = `FastTrack Delivery
Order ID: 402-9812-491
Date: 24-Oct-2026
Total: 499.00`;
  assert.equal(parseReceiptText(orderIdText).receiptNumber, '402-9812-491');
});

/* -------------------------------------------------------------------------- */
/* 21. Category Inference: Known filled, Unknown left as null                 */
/* -------------------------------------------------------------------------- */
test('21. Category inference: fills known categories, leaves unknown category as null', () => {
  // Known category: Hardware & plumbing -> Repairs & Maintenance
  const hardware = parseReceiptText(`Sri Balaji Hardware\nPipes and wire repair\nTotal: 500.00`);
  assert.equal(hardware.suggestedCategory, 'Repairs & Maintenance');

  // Known category: Supermarket grocery -> Groceries
  const grocery = parseReceiptText(`Nilgiris Supermarket\nProvisions and milk\nTotal: 450.00`);
  assert.equal(grocery.suggestedCategory, 'Groceries');

  // Unknown generic expense -> null (not forced to 'Purchase')
  const unknown = parseReceiptText(`XYZ Enterprise\nGeneral service\nTotal: 2,000.00`);
  assert.equal(unknown.suggestedCategory, null);
  assert.equal(unknown.suggestedExpenseType, null);
});

/* -------------------------------------------------------------------------- */
/* 22. Printed GST Invoice with combined Tax/Contact line and signature block  */
/* -------------------------------------------------------------------------- */
test('22. Printed GST Invoice with combined Tax/Contact header (e.g. Sree Muthuarul Enterprises)', () => {
  const invoiceText = `(ORIGINAL)
GSTIN: 33AIPPA9705K1Z3 CELL: 9345225779
SREE MUTHUARUL ENTERPRISES
128A, Thandu Mariamman Kovil Street,
Avinashi Road, Coimbatore - 641018.
Email: sreemuthuarul@gmail.com
INVOICE
To. ATOMINOS CONSULTING PRIVATE LIMITED
SF100-14 AND15, Pallavi Nagar,
Vilankurichi,
Coimbatore.
Ph: 8110985012
GSTIN : 33ABBCA0338E1ZD
Payment Terms : Credit
Bill No : 3567
Date : 23/03/2026
User : Admin
1 LUKER HALOW25 OUTDOOR 940540 16 NO 900.00 14400.00 18 2592.00 16992.00
Total 16.000 14400.00 2592.00 16992.00
Net Amount : 16992.00
Rupees Sixteen Thousand Nine Hundred And Ninety Two Only
BANK DETAILS:
BANK NAME: CANARA BANK, CA A/C NO: 61211010002420
IFSC CODE: CNRB0001204, BRANCH: HEAD QUARTERS ROAD.
For SREE MUTHUARUL ENTERPRISES
Authorised Signatory`;

  const parsed = parseReceiptText(invoiceText);
  assert.equal(parsed.merchant, 'SREE MUTHUARUL ENTERPRISES');
  assert.equal(parsed.receiptNumber, '3567');
  assert.equal(parsed.expenseDate, '2026-03-23');
  assert.equal(parsed.totalAmount, 16992.00);
  assert.equal(parsed.totalMinor, 1699200);
});

test('23. Tamil and English bilingual receipt with Unicode ZWNJ virama characters', () => {
  // Simulates Tesseract OCR output containing Tamil text, English bill codes, and zero-width non-joiners (\u200C)
  const tamilOcrText = `அன்னை\u200C மளிகை ஸ்டோர்\u200C
பில்\u200C எண்\u200C: AM-582
தேதி: 25-10-2026

பொன்னி அரிசி 10kg 550.00
சூரியகாந்தி எண்ணெய் 1L 140.00

மொத்தம்\u200C: 690.00`;

  const parsed = parseReceiptText(tamilOcrText);
  assert.equal(parsed.merchant, 'அன்னை மளிகை ஸ்டோர்');
  assert.equal(parsed.receiptNumber, 'AM-582');
  assert.equal(parsed.expenseDate, '2026-10-25');
  assert.equal(parsed.totalAmount, 690.00);
  assert.equal(parsed.totalMinor, 69000);
});

/* -------------------------------------------------------------------------- */
/* 24. Universal Multi-Archetype Vendor & Bill Number Extraction              */
/* -------------------------------------------------------------------------- */
test('24. Universal Multi-Archetype: Side-by-side Bill No, Buyer block isolation, and multi-part slash codes', () => {
  // Archetype A: Standard GST Tax Invoice with Buyer ("To:") block and side-by-side Bill No & Date
  const gstInvoiceWithBuyer = `TAX INVOICE
SRI BALAJI ELECTRICALS & HARDWARE
14/2, Cross Cut Road, Gandhipuram, Coimbatore - 641012
GSTIN: 33AAACB1234F1Z9  Ph: 9842109842
Email: balajielectricals@gmail.com
To: ATOMINOS COMMUNITY RESIDENCE ASSOCIATION
Flat SF-201, Green Valley, Coimbatore
Bill No : 8492    Date : 18/04/2026    User: Staff
Item Rate Qty Amount
LED Tube 250 4 1000.00
Grand Total : ₹ 1,000.00`;

  const parsedA = parseReceiptText(gstInvoiceWithBuyer);
  assert.equal(parsedA.merchant, 'SRI BALAJI ELECTRICALS & HARDWARE');
  assert.equal(parsedA.receiptNumber, '8492');
  assert.equal(parsedA.expenseDate, '2026-04-18');
  assert.equal(parsedA.totalAmount, 1000.00);

  // Archetype B: Multi-part slash-delimited commercial invoice
  const slashDelimited = `INVOICE
Apex Elevators & Escalators Pvt Ltd
GSTIN: 33AABCA4567D1Z2
Invoice No: APEX/2025-26/0491
Date of Issue: 12-05-2026
Maintenance AMC Q1: 15000.00
Total Amount Payable: 15,000.00`;

  const parsedB = parseReceiptText(slashDelimited);
  assert.equal(parsedB.merchant, 'Apex Elevators & Escalators Pvt Ltd');
  assert.equal(parsedB.receiptNumber, 'APEX/2025-26/0491');
  assert.equal(parsedB.expenseDate, '2026-05-12');
  assert.equal(parsedB.totalAmount, 15000.00);

  // Archetype C: Cash Memo with "No. 402"
  const cashMemo = `CASH MEMO
MURUGAN TRADERS
Hardware & Sanitary Mart
No. 402
Dated: 22/06/2026
PVC Pipe 4inch: 450.00
Total: 450.00`;

  const parsedC = parseReceiptText(cashMemo);
  assert.equal(parsedC.merchant, 'MURUGAN TRADERS');
  assert.equal(parsedC.receiptNumber, '402');
  assert.equal(parsedC.expenseDate, '2026-06-22');
  assert.equal(parsedC.totalAmount, 450.00);

  // Archetype D: Utility & Broadband Invoice
  const broadbandBill = `TAX INVOICE
TATA PLAY BROADBAND PRIVATE LIMITED
Customer CA: 1049281729
Invoice No: TPF-2026-98124
Bill Date: 05/10/2026
Plan 300 Mbps: 1178.82
Total Due: ₹ 1,178.82`;

  const parsedD = parseReceiptText(broadbandBill);
  assert.equal(parsedD.merchant, 'TATA PLAY BROADBAND PRIVATE LIMITED');
  assert.equal(parsedD.receiptNumber, 'TPF-2026-98124');
  assert.equal(parsedD.expenseDate, '2026-10-05');
  assert.equal(parsedD.totalAmount, 1178.82);
});

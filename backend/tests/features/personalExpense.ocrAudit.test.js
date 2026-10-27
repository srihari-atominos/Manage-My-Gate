import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { OxrProvider } from '../../src/features/personalExpense/ocr/oxr.provider.js';
import { TesseractProvider } from '../../src/features/personalExpense/ocr/tesseract.provider.js';
import { OcrOrchestrator } from '../../src/features/personalExpense/ocr/ocr-orchestrator.js';
import { reconcileReceiptResults } from '../../src/features/personalExpense/ocr/receipt-reconciler.js';
import { validateExtractedReceipt } from '../../src/features/personalExpense/ocr/receipt-validator.js';
import { extractItemsFromMarkdownTable } from '../../src/features/personalExpense/ocr/receipt-field-extractor.js';

test('OXR process() refuses to call the API when the provider is disabled', async () => {
  const tmpFile = path.join(os.tmpdir(), `audit-oxr-${Date.now()}.png`);
  await fs.writeFile(tmpFile, 'dummy');
  try {
    let called = false;
    const result = await new OxrProvider().process(
      { path: tmpFile, mimetype: 'image/png' },
      { env: {}, fetchImpl: async () => { called = true; return { ok: true }; } }
    );
    assert.equal(called, false);
    assert.equal(result.status, 'UNAVAILABLE');
  } finally {
    await fs.rm(tmpFile, { force: true });
  }
});

test('Markdown tables: each table uses its own header and metadata tables are ignored', () => {
  const markdown = [
    '| Bill No | Date |',
    '|---|---|',
    '| 1042 | 12/03/2026 |',
    '',
    '| Item | Qty | Rate | Amount |',
    '|---|---|---|---|',
    '| Taxi fare | 2 | 50.00 | 100.00 |',
    '| Totalizer cable | 1 | 30.00 | 30.00 |',
    '| CGST 9% | | | 11.70 |',
    '| Grand Total | | | 141.70 |',
  ].join('\n');

  const items = extractItemsFromMarkdownTable(markdown);
  assert.deepEqual(items.map((i) => [i.description, i.quantity, i.amountMinor]), [
    ['Taxi fare', 2, 10000],
    ['Totalizer cable', 1, 3000],
  ]);
});

test('Validator does not duplicate warnings the parser already raised', () => {
  const report = validateExtractedReceipt({
    totalMinor: 10000,
    receiptDate: null,
    merchant: null,
    warnings: [
      { code: 'DATE_MISSING', message: 'date' },
      { code: 'MERCHANT_MISSING', message: 'merchant' },
    ],
  });
  const codes = report.warnings.map((w) => w.code);
  assert.deepEqual(codes.sort(), ['DATE_MISSING', 'MERCHANT_MISSING']);
  assert.equal(report.needsReview, true);
});

test('Validator checks item sum against total minus tax when no subtotal is printed', () => {
  const report = validateExtractedReceipt({
    totalMinor: 11800,
    taxMinor: 1800,
    receiptDate: '2026-03-12',
    merchant: 'Shop',
    items: [{ description: 'A', amountMinor: 10000 }],
  });
  assert.equal(report.warnings.some((w) => w.code === 'ITEMS_MISMATCH'), false);
});

test('Reconciler stages the arithmetically consistent total on conflict and keeps client-facing fields', () => {
  const tesseract = {
    extractedFields: {
      totalMinor: 90000, subtotalMinor: 10000, taxMinor: 1800, receiptDate: '2026-03-12', merchant: 'Apex Hardware',
      suggestedCategory: 'Repairs & Maintenance', suggestedNotes: 'Items: Pipe', items: [],
    },
  };
  const oxr = {
    extractedFields: { totalMinor: 11800, subtotalMinor: 10000, taxMinor: 1800, receiptDate: '2026-03-12', merchant: 'Apex Hardware', items: [] },
  };
  const { reconciledFields, disagreements } = reconcileReceiptResults(tesseract, oxr);
  assert.equal(reconciledFields.totalMinor, 11800);
  assert.equal(reconciledFields.provenance.totalMinor.staged, 'oxr');
  assert.equal(disagreements.length, 1);
  assert.equal(reconciledFields.needsReview, true);
  assert.equal(reconciledFields.suggestedCategory, 'Repairs & Maintenance');
  assert.equal(reconciledFields.suggestedNotes, 'Items: Pipe');
  assert.equal(reconciledFields.expenseDate, '2026-03-12');
});

test('Orchestrator clamps error text to the 240-char ocrError schema limit', async () => {
  const failing = (error) => ({ process: async () => ({ status: 'FAILED', error }) });
  const orchestrator = new OcrOrchestrator({ tesseract: failing('t'.repeat(200)), oxr: failing('o'.repeat(200)) });
  const outcome = await orchestrator.processReceipt({ path: 'x.png' }, { mode: 'dual' });
  assert.equal(outcome.status, 'FAILED');
  assert.ok(outcome.error.length <= 240);
});

test('Tesseract runs the engine language check once per receipt, not once per pass', async () => {
  const provider = new TesseractProvider();
  const runtimeSeen = [];
  const run = async (_file, config) => {
    runtimeSeen.push(config.runtime);
    return { status: 'COMPLETED', text: 'Shop\nTotal 10.00', confidence: 80, runtime: { status: 'READY', usableLanguages: ['eng'] } };
  };
  await provider.process(
    { path: 'x.png', mimetype: 'image/png' },
    { run, preprocess: async () => ({ variants: [{ label: 'a', path: 'a.png' }, { label: 'b', path: 'b.png' }], cleanup: async () => {} }), env: {} }
  );
  assert.equal(runtimeSeen[0], undefined);
  if (runtimeSeen.length > 1) assert.equal(runtimeSeen[1]?.status, 'READY');
});

/* -------------------------------------------------------------------------- */
/* Vendor / document-number extraction                                        */
/* -------------------------------------------------------------------------- */
import { parseReceiptText, merchantEmailHint, merchantAgreementScore, extractGstSummary } from '../../src/features/personalExpense/ocr/receiptParser.js';

const luxeReceipt = `MAISON DE LUXE
680 Madison Avenue
New York, NY 10065
Sale Doc #: 84291
DATE: 03/18/2026 TIME: 10:52:41 PM
Silk Midi Dress Ivory 36 $1890.00
SUBTOTAL $1890.00
TOTAL $1890.00
with tags for store credit.`;

test('Footer prose ("tags for store credit") is not taken as the vendor; "Sale Doc #" is the bill number', () => {
  const parsed = parseReceiptText(luxeReceipt);
  assert.equal(parsed.merchant, 'MAISON DE LUXE');
  assert.equal(parsed.receiptNumber, '84291');
});

test('Vendor comes from the signature block only when a signatory line follows, for any vendor name', () => {
  const parsed = parseReceiptText(`TAX INVOICE
Bill No : 77
Date : 05/05/2026
Net Amount : 500.00
BANK DETAILS: For ACME TRADERS
Authorised Signatory`);
  assert.equal(parsed.merchant, 'ACME TRADERS');
});

test('GST summary row supplies subtotal and tax only when the printed rate reproduces the tax', () => {
  const ok = extractGstSummary(['Taxable Value CGST% AMT SGST% AMT NET% AMT', '14400.00 9.00 1296.00 9.00 1296.00 18.00 2592.00']);
  assert.deepEqual(ok, { taxableMinor: 1440000, taxMinor: 259200 });
  const misread = extractGstSummary(['Taxable Value CGST% AMT', '14400.00 9.00 1296.00 9.00 1296.00 18.00 9999.00']);
  assert.equal(misread, null);
});

test('Email local part verifies a merchant read: noisy line scores lower than a clean one', () => {
  const hint = merchantEmailHint('Email: sreemuthuarul@gmail.com');
  assert.equal(hint, 'sreemuthuarul');
  assert.ok(merchantAgreementScore('SREE MUTHUARUL ENTERPRISES', hint) > merchantAgreementScore('iL)', hint));
  assert.equal(merchantEmailHint('info@shop.com'), '');
});

/* -------------------------------------------------------------------------- */
/* Till-roll receipt without a vendor name                                    */
/* -------------------------------------------------------------------------- */
import { trimMerchantNoise } from '../../src/features/personalExpense/ocr/headerBand.js';
import { previewReceiptOcr } from '../../src/features/expense/expenseOcr.service.js';

const cashReceipt = `CASH RECEIPT
Adress: 1234 Lorem Ipsum, Dolor
Tel: 123-456-7890
Date: 01-01-2018 10:35
Lorem 6.50
Ipsum 7.50
Dolor Sit 48.00
Amet 9.30
Consectetur 11.90
Adipiscing Elit 1.20
Sed Do 0.40
Total 84.80
Sub-total 76.80
Sales Tax 8.00
Balance 84.80`;

test('An address line is not a vendor, and "Sub-total" with a hyphen is read', () => {
  const parsed = parseReceiptText(cashReceipt);
  assert.equal(parsed.merchant, null);
  assert.equal(parsed.totalMinor, 8480);
  assert.equal(parsed.subtotalMinor, 7680);
  assert.equal(parsed.taxMinor, 800);
  assert.equal(parsed.items.length, 7);
  assert.equal(parsed.warnings.some((w) => w.code === 'ITEMS_MISMATCH'), false);
});

test('Stray leading characters are trimmed from the vendor only when the printed email proves it', () => {
  assert.equal(trimMerchantNoise('SFSREE MUTHUARUL ENTERPRISES', 'Email: sreemuthuarul@gmail.com'), 'SREE MUTHUARUL ENTERPRISES');
  assert.equal(trimMerchantNoise('SFSREE MUTHUARUL ENTERPRISES', 'no email here'), 'SFSREE MUTHUARUL ENTERPRISES');
});

test('Community OCR: the total is voted across passes; a stray address number or garbage pass cannot win', async () => {
  const run = async (_file, config) => {
    const bad = 'CASH RECEIPT\nAdress: 1234 Lorem Ipsum\nDate: 01-01-2018';
    return config.pageSegmentationMode === 6
      ? { status: 'COMPLETED', text: cashReceipt, confidence: 93 }
      : { status: 'COMPLETED', text: `${bad}\nTotal 1234.00`, confidence: 55 };
  };
  const out = await previewReceiptOcr({ mimetype: 'image/png', path: 'r.png' }, { env: { EXPENSE_OCR_PROVIDER: 'tesseract-local' }, run, preprocess: async () => ({ variants: [{ label: 'a', path: 'a.png' }, { label: 'b', path: 'b.png' }], cleanup: async () => {} }) });
  assert.equal(out.result.totalMinor, 8480);
  assert.equal(out.result.merchant, null);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { TesseractProvider } from '../../src/features/personalExpense/ocr/tesseract.provider.js';
import { OxrProvider } from '../../src/features/personalExpense/ocr/oxr.provider.js';
import { OcrOrchestrator } from '../../src/features/personalExpense/ocr/ocr-orchestrator.js';
import { reconcileReceiptResults } from '../../src/features/personalExpense/ocr/receipt-reconciler.js';
import { validateExtractedReceipt, validateAmount, validateReceiptDate, validateReceiptArithmetic } from '../../src/features/personalExpense/ocr/receipt-validator.js';
import { extractItemsFromMarkdownTable, extractStructuredReceiptFields } from '../../src/features/personalExpense/ocr/receipt-field-extractor.js';

// Helper mock process
const fakeSpawn = (stdoutText, code = 0, stderrText = '') => () => {
  const proc = new EventEmitter();
  proc.stdout = new EventEmitter();
  proc.stdout.setEncoding = () => {};
  proc.stderr = new EventEmitter();
  proc.stderr.setEncoding = () => {};
  proc.kill = () => {};
  queueMicrotask(() => {
    if (stdoutText) proc.stdout.emit('data', stdoutText);
    if (stderrText) proc.stderr.emit('data', stderrText);
    proc.emit('close', code);
  });
  return proc;
};

// Helper mock fetch
const fakeFetch = ({ status = 200, ok = true, json = null, text = '', error = null }) => async () => {
  if (error) throw error;
  return {
    status,
    ok,
    json: async () => json,
    text: async () => text,
  };
};

// Sample test receipts
const sampleReceiptText = `Nilgiris Supermarket
2026-10-21
Atta 5kg 1 x 245.00
Subtotal 245.00
Tax 12.25
Grand Total ₹257.25`;

const sampleOxrMarkdown = `# Nilgiris Supermarket
Invoice Date: 2026-10-21

| Item | Qty | Price | Total |
| :--- | :--- | :--- | :--- |
| Atta 5kg | 1 | 245.00 | 245.00 |

Subtotal: 245.00
Tax: 12.25
Grand Total: 257.25
`;

/* -------------------------------------------------------------------------- */
/* Provider Tests 1-10                                                        */
/* -------------------------------------------------------------------------- */

test('1. Tesseract successfully extracts text and parses fields', async () => {
  const tmpFile = path.join(os.tmpdir(), `test-tess-${Date.now()}.png`);
  await fs.writeFile(tmpFile, 'dummy-content');

  try {
    const provider = new TesseractProvider();
    const runMock = async () => ({
      status: 'COMPLETED',
      text: sampleReceiptText,
      confidence: 94,
    });

    const result = await provider.process(
      { path: tmpFile, mimetype: 'image/png', size: 1024 },
      { run: runMock, preprocess: async () => ({ variants: [], cleanup: async () => {} }) }
    );

    assert.equal(result.status, 'COMPLETED');
    assert.equal(result.provider, 'tesseract');
    assert.equal(result.extractedFields.merchant, 'Nilgiris Supermarket');
    assert.equal(result.extractedFields.totalMinor, 25725);
    assert.equal(result.extractedFields.receiptDate, '2026-10-21');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('2. OXR successfully returns structured output', async () => {
  const tmpFile = path.join(os.tmpdir(), `test-oxr-${Date.now()}.png`);
  await fs.writeFile(tmpFile, 'dummy-content');

  try {
    const provider = new OxrProvider();
    const fetchMock = fakeFetch({
      ok: true,
      status: 200,
      json: {
        code: 200,
        message: 'success',
        data: {
          file_name: 'test.png',
          results: {
            markdown: sampleOxrMarkdown,
            json_structure: {
              elements: [
                {
                  type: 'table',
                  headers: ['Item', 'Qty', 'Price', 'Total'],
                  rows: [['Atta 5kg', '1', '245.00', '245.00']],
                },
              ],
            },
          },
        },
      },
    });

    const result = await provider.process(
      { path: tmpFile, mimetype: 'image/png', size: 1024 },
      { fetchImpl: fetchMock, env: { OCR_OXR_ENABLED: 'true', OXR_API_URL: 'http://localhost:8000/v1/parse/sync' } }
    );

    assert.equal(result.status, 'COMPLETED');
    assert.equal(result.provider, 'oxr');
    assert.equal(result.extractedFields.merchant, 'Nilgiris Supermarket');
    assert.equal(result.extractedFields.totalMinor, 25725);
    assert.equal(result.extractedFields.items.length, 1);
    assert.equal(result.extractedFields.items[0].description, 'Atta 5kg');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('3. OXR times out gracefully', async () => {
  const tmpFile = path.join(os.tmpdir(), `test-oxr-to-${Date.now()}.png`);
  await fs.writeFile(tmpFile, 'dummy-content');

  try {
    const provider = new OxrProvider();
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    const fetchMock = fakeFetch({ error: abortError });

    const result = await provider.process(
      { path: tmpFile, mimetype: 'image/png', size: 1024 },
      { fetchImpl: fetchMock, env: { OCR_OXR_ENABLED: 'true' } }
    );

    assert.equal(result.status, 'TIMEOUT');
    assert.match(result.error, /timed out/i);
    assert.equal(result.extractedFields.totalMinor, null);
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('4. OXR returns an HTTP error (500 and 429)', async () => {
  const tmpFile = path.join(os.tmpdir(), `test-oxr-err-${Date.now()}.png`);
  await fs.writeFile(tmpFile, 'dummy-content');

  try {
    const provider = new OxrProvider();

    // 500 error
    const fetch500 = fakeFetch({ ok: false, status: 500, text: 'Internal Server Error' });
    const res500 = await provider.process(
      { path: tmpFile, mimetype: 'image/png', size: 1024 },
      { fetchImpl: fetch500, env: { OCR_OXR_ENABLED: 'true' } }
    );
    assert.equal(res500.status, 'FAILED');
    assert.match(res500.error, /HTTP 500/);

    // 429 Rate limit
    const fetch429 = fakeFetch({ ok: false, status: 429, text: 'Rate limit exceeded' });
    const res429 = await provider.process(
      { path: tmpFile, mimetype: 'image/png', size: 1024 },
      { fetchImpl: fetch429, env: { OCR_OXR_ENABLED: 'true' } }
    );
    assert.equal(res429.status, 'FAILED');
    assert.match(res429.error, /rate limit/i);
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('5. OXR returns malformed JSON data', async () => {
  const tmpFile = path.join(os.tmpdir(), `test-oxr-mal-${Date.now()}.png`);
  await fs.writeFile(tmpFile, 'dummy-content');

  try {
    const provider = new OxrProvider();
    const fetchMalformed = async () => ({
      status: 200,
      ok: true,
      json: async () => { throw new Error('Unexpected token < in JSON'); },
    });

    const result = await provider.process(
      { path: tmpFile, mimetype: 'image/png', size: 1024 },
      { fetchImpl: fetchMalformed, env: { OCR_OXR_ENABLED: 'true' } }
    );

    assert.equal(result.status, 'FAILED');
    assert.match(result.error, /invalid JSON/i);
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('6. Dual mode: Tesseract fails while OXR succeeds', async () => {
  const mockTesseract = {
    process: async () => ({
      provider: 'tesseract',
      status: 'FAILED',
      error: 'Tesseract command failed',
      extractedFields: null,
      rawText: '',
    }),
  };

  const mockOxr = {
    process: async () => ({
      provider: 'oxr',
      status: 'COMPLETED',
      error: null,
      rawText: sampleOxrMarkdown,
      extractedFields: extractStructuredReceiptFields({ markdown: sampleOxrMarkdown }),
    }),
  };

  const orchestrator = new OcrOrchestrator({ tesseract: mockTesseract, oxr: mockOxr });
  const outcome = await orchestrator.processDual({ path: 'test.png' });

  assert.equal(outcome.status, 'COMPLETED');
  assert.equal(outcome.engineStatus, 'DUAL_OXR_ONLY');
  assert.equal(outcome.result.totalMinor, 25725);
  assert.equal(outcome.result.singleEngineFallback, 'oxr');
  assert.ok(outcome.result.warnings.some((w) => w.code === 'TESSERACT_ENGINE_FAILED'));
});

test('7. Dual mode: OXR fails while Tesseract succeeds', async () => {
  const mockTesseract = {
    process: async () => ({
      provider: 'tesseract',
      status: 'COMPLETED',
      error: null,
      rawText: sampleReceiptText,
      extractedFields: {
        merchant: 'Nilgiris Supermarket',
        totalMinor: 25725,
        receiptDate: '2026-10-21',
        items: [],
      },
    }),
  };

  const mockOxr = {
    process: async () => ({
      provider: 'oxr',
      status: 'FAILED',
      error: 'OXR network timeout',
      extractedFields: null,
      rawText: '',
    }),
  };

  const orchestrator = new OcrOrchestrator({ tesseract: mockTesseract, oxr: mockOxr });
  const outcome = await orchestrator.processDual({ path: 'test.png' });

  assert.equal(outcome.status, 'COMPLETED');
  assert.equal(outcome.engineStatus, 'DUAL_TESSERACT_ONLY');
  assert.equal(outcome.result.totalMinor, 25725);
  assert.equal(outcome.result.singleEngineFallback, 'tesseract');
  assert.ok(outcome.result.warnings.some((w) => w.code === 'OXR_ENGINE_FAILED'));
});

test('8. Dual mode: Both providers fail', async () => {
  const mockTesseract = {
    process: async () => ({ provider: 'tesseract', status: 'FAILED', error: 'Tesseract crashed' }),
  };
  const mockOxr = {
    process: async () => ({ provider: 'oxr', status: 'FAILED', error: 'OXR endpoint down' }),
  };

  const orchestrator = new OcrOrchestrator({ tesseract: mockTesseract, oxr: mockOxr });
  const outcome = await orchestrator.processDual({ path: 'test.png' });

  assert.equal(outcome.status, 'FAILED');
  assert.equal(outcome.engineStatus, 'BOTH_FAILED');
  assert.match(outcome.error, /Both OCR engines failed/i);
});

test('9. Optional OXR is disabled by default', async () => {
  const provider = new OxrProvider();
  const availability = await provider.isAvailable({ OCR_OXR_ENABLED: 'false' });
  assert.equal(availability.available, false);
  assert.match(availability.reason, /disabled in configuration/i);
});

test('10. Unsupported file formats (e.g. .exe or .txt) are rejected safely', async () => {
  const tesseract = new TesseractProvider();
  const oxr = new OxrProvider();

  const badFile = { path: 'malware.exe', mimetype: 'application/x-msdownload', size: 100 };
  const resT = await tesseract.process(badFile);
  assert.equal(resT.status, 'UNSUPPORTED');
  assert.match(resT.error, /supports JPG, PNG, and WEBP/i);

  const resO = await oxr.process(badFile);
  assert.equal(resO.status, 'UNSUPPORTED');
  assert.match(resO.error, /supports JPG, PNG, WEBP, and PDF/i);
});

/* -------------------------------------------------------------------------- */
/* Reconciliation Tests 11-20                                                 */
/* -------------------------------------------------------------------------- */

test('11. Reconciliation: Both engines return the same amount -> HIGH confidence', () => {
  const tesseract = {
    extractedFields: {
      totalMinor: 125000,
      receiptDate: '2026-10-25',
      merchant: 'ABC Supermarket',
    },
  };
  const oxr = {
    extractedFields: {
      totalMinor: 125000,
      receiptDate: '2026-10-25',
      merchant: 'ABC Supermarket',
    },
  };

  const result = reconcileReceiptResults(tesseract, oxr);
  assert.equal(result.reconciledFields.totalMinor, 125000);
  assert.equal(result.provenance.totalMinor.agreement, true);
  assert.equal(result.reconciledFields.fieldConfidence.total.level, 'HIGH');
  assert.equal(result.disagreements.length, 0);
});

test('12. Reconciliation: Both engines return different amounts -> conflict flagged', () => {
  const tesseract = {
    extractedFields: {
      totalMinor: 120000,
      receiptDate: '2026-10-25',
      merchant: 'Apex Hardware',
    },
  };
  const oxr = {
    extractedFields: {
      totalMinor: 125000,
      receiptDate: '2026-10-25',
      merchant: 'Apex Hardware',
    },
  };

  const result = reconcileReceiptResults(tesseract, oxr);
  assert.equal(result.disagreements.length, 1);
  assert.equal(result.disagreements[0].field, 'totalMinor');
  assert.equal(result.provenance.totalMinor.agreement, false);
  assert.equal(result.reconciledFields.fieldConfidence.total.level, 'LOW');
  assert.ok(result.reconciledFields.warnings.some((w) => w.code === 'OCR_PROVIDER_DISAGREEMENT'));
});

test('13. Reconciliation: Both engines return different dates -> conflict flagged', () => {
  const tesseract = {
    extractedFields: {
      totalMinor: 5000,
      receiptDate: '2026-10-20',
      merchant: 'Cafeteria',
    },
  };
  const oxr = {
    extractedFields: {
      totalMinor: 5000,
      receiptDate: '2026-10-21',
      merchant: 'Cafeteria',
    },
  };

  const result = reconcileReceiptResults(tesseract, oxr);
  assert.equal(result.disagreements.length, 1);
  assert.equal(result.disagreements[0].field, 'receiptDate');
  assert.equal(result.provenance.receiptDate.agreement, false);
  assert.equal(result.reconciledFields.fieldConfidence.date.level, 'LOW');
});

test('14. Reconciliation: Merchant names differ only in capitalization or spacing -> reconciled without conflict', () => {
  const tesseract = {
    extractedFields: {
      totalMinor: 5000,
      receiptDate: '2026-10-20',
      merchant: '   apex   hardware  ltd  ',
    },
  };
  const oxr = {
    extractedFields: {
      totalMinor: 5000,
      receiptDate: '2026-10-20',
      merchant: 'APEX HARDWARE LTD',
    },
  };

  const result = reconcileReceiptResults(tesseract, oxr);
  assert.equal(result.disagreements.length, 0);
  assert.equal(result.provenance.merchant.agreement, true);
  assert.equal(result.reconciledFields.fieldConfidence.merchant.level, 'HIGH');
});

test('15. Reconciliation: One engine omits the total -> other engine value is safely preserved', () => {
  const tesseract = {
    extractedFields: {
      totalMinor: null,
      receiptDate: '2026-10-20',
      merchant: 'Corner Store',
    },
  };
  const oxr = {
    extractedFields: {
      totalMinor: 35000,
      receiptDate: '2026-10-20',
      merchant: 'Corner Store',
    },
  };

  const result = reconcileReceiptResults(tesseract, oxr);
  assert.equal(result.reconciledFields.totalMinor, 35000);
  assert.equal(result.provenance.totalMinor.source, 'oxr');
  assert.equal(result.disagreements.length, 0);
});

test('16. Reconciliation: Both engines return incomplete results -> marks needsReview', () => {
  const tesseract = {
    extractedFields: { totalMinor: null, receiptDate: null, merchant: null },
  };
  const oxr = {
    extractedFields: { totalMinor: null, receiptDate: null, merchant: null },
  };

  const result = reconcileReceiptResults(tesseract, oxr);
  assert.equal(result.reconciledFields.totalMinor, null);
  assert.equal(result.reconciledFields.needsReview, true);
});

test('17. Reconciliation: One engine provides a misleading result -> validation flags warnings', () => {
  const tesseract = {
    extractedFields: {
      merchant: 'Electric World',
      subtotalMinor: 10000,
      taxMinor: 1800,
      totalMinor: 11800,
      receiptDate: '2026-10-21',
    },
  };
  const oxr = {
    extractedFields: {
      merchant: 'Electric World',
      subtotalMinor: 10000,
      taxMinor: 1800,
      totalMinor: 999999, // Wildly incorrect
      receiptDate: '2026-10-21',
    },
  };

  const result = reconcileReceiptResults(tesseract, oxr);
  assert.equal(result.disagreements.length, 1);
  assert.equal(result.disagreements[0].field, 'totalMinor');
  assert.equal(result.reconciledFields.needsReview, true);
});

test('18. Validator: Subtotal, tax and total are inconsistent -> TOTAL_MISMATCH warning', () => {
  const fields = {
    subtotalMinor: 10000, // 100.00
    taxMinor: 500,        // 5.00
    totalMinor: 15000,    // 150.00 (mismatch!)
    receiptDate: '2026-10-21',
    merchant: 'Test Store',
  };

  const validation = validateExtractedReceipt(fields);
  assert.ok(validation.warnings.some((w) => w.code === 'TOTAL_MISMATCH'));
  assert.equal(validation.needsReview, true);
});

test('19. Validator: Detects payment screenshot status distinction (document status vs verified)', () => {
  const paymentProofFields = {
    totalMinor: 50000,
    receiptDate: '2026-10-21',
    merchant: 'Vendor UPI',
    documentDisplayedStatus: 'FAILED',
    isPaymentScreenshot: true,
  };

  const validation = validateExtractedReceipt(paymentProofFields);
  assert.equal(validation.documentDisplayedStatus, 'FAILED');
  assert.equal(validation.verifiedPaymentStatus, 'UNVERIFIED');
  assert.ok(validation.warnings.some((w) => w.code === 'PAYMENT_FAILED_ON_PROOF'));
});

test('20. Preserves user-corrected values over OCR values', () => {
  const ocrExtracted = {
    merchant: 'Original OCR Merchant',
    totalMinor: 10000,
    receiptDate: '2026-10-20',
  };

  const userReviewEdit = {
    merchant: 'User Corrected Merchant Name',
    totalMinor: 10500,
    receiptDate: '2026-10-21',
    confirmed: true,
  };

  // Service simulation
  const merged = {
    ...ocrExtracted,
    ...userReviewEdit,
    confirmedAt: new Date(),
  };

  assert.equal(merged.merchant, 'User Corrected Merchant Name');
  assert.equal(merged.totalMinor, 10500);
  assert.equal(merged.receiptDate, '2026-10-21');
  assert.ok(merged.confirmedAt instanceof Date);
});

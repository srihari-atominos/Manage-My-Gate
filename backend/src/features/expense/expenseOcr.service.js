import { parseReceiptText } from '../personalExpense/ocr/receiptParser.js';
import { runTesseract, validateOcrFile } from '../personalExpense/ocr/tesseractLocal.provider.js';
import { buildOcrVariants } from './expenseOcrPreprocess.js';
import { extractPdfText } from './expensePdfText.js';

const DEFAULT_TIMEOUT_MS = 20_000;
const SEGMENTATION_MODES = [6, 11, 4];
const MAX_OCR_RUNS = 5;
const ROUNDING_TOLERANCE_MINOR = 100;
const LOW_CONFIDENCE = 65;
const DAY_MS = 24 * 60 * 60 * 1000;

export function expenseOcrConfiguration(env = process.env) {
  const languages = String(env.EXPENSE_OCR_LANGUAGES || 'eng').split('+').map((value) => value.trim()).filter(Boolean);
  const timeout = Number(env.EXPENSE_OCR_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return {
    configured: env.EXPENSE_OCR_PROVIDER === 'tesseract-local',
    command: env.TESSERACT_COMMAND || 'tesseract',
    languages,
    timeoutMs: Number.isFinite(timeout) && timeout >= 1_000 && timeout <= 120_000 ? timeout : DEFAULT_TIMEOUT_MS,
  };
}

export function extractReceiptData(text = '') {
  const data = parseReceiptText(text);
  const totalAmount = data.totalAmount != null ? data.totalAmount : (data.totalMinor != null ? data.totalMinor / 100 : null);
  const expenseDate = data.expenseDate || data.receiptDate;

  return {
    expenseDate,
    receiptDate: expenseDate,
    totalAmount,
    totalMinor: data.totalMinor,
    subtotalAmount: data.subtotalAmount,
    subtotalMinor: data.subtotalMinor,
    taxMinor: data.taxMinor,
    discountMinor: data.discountMinor,
    additionalChargesMinor: data.additionalChargesMinor,
    merchant: data.merchant,
    merchantAddress: data.merchantAddress,
    receiptNumber: data.receiptNumber,
    currency: data.currency,
    isPaymentScreenshot: data.isPaymentScreenshot,
    paymentMethod: data.paymentMethod,
    paymentApplication: data.paymentApplication,
    payeeUpiId: data.payeeUpiId,
    settlement: data.settlement,
    transactionReference: data.transactionReference,
    suggestedExpenseName: data.suggestedExpenseName,
    suggestedCategory: data.suggestedCategory,
    suggestedExpenseType: data.suggestedExpenseType,
    description: data.description,
    notes: data.notes,
    suggestedNotes: data.suggestedNotes,
    explicitNotes: data.explicitNotes,
    items: data.items.map((item) => ({
      description: item.description || item.itemName,
      itemName: item.itemName || item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice != null ? item.unitPrice : (item.unitPriceMinor != null ? item.unitPriceMinor / 100 : 0),
      unitPriceMinor: item.unitPriceMinor,
      amount: item.amount != null ? item.amount : (item.amountMinor != null ? item.amountMinor / 100 : 0),
      amountMinor: item.amountMinor,
    })),
    confidence: data.confidence,
  };
}

const warn = (code, message) => ({ code, message });

/**
 * Cross-checks the extracted figures against each other so wrong OCR reads are flagged instead of
 * silently filled in: items vs subtotal, subtotal + tax vs total, payment outcome, missing key fields.
 * Fills a missing total from its components when they are all known.
 */
export function analyzeExtraction(result, { ocrConfidence = null, now = new Date() } = {}) {
  const warnings = [];
  const out = { ...result };
  const discount = out.discountMinor || 0;
  const charges = out.additionalChargesMinor || 0;

  if (out.totalMinor == null && out.subtotalMinor != null && !out.isPaymentScreenshot) {
    out.totalMinor = out.subtotalMinor + (out.taxMinor || 0) + charges - discount;
    out.totalDerived = true;
    warnings.push(warn('TOTAL_DERIVED', 'The total was not readable, so it was calculated from the subtotal and tax. Please verify it.'));
  } else if (out.totalMinor == null && out.items?.length && !out.isPaymentScreenshot) {
    const itemSumMinor = out.items.reduce((sum, item) => sum + (item.amountMinor || 0), 0);
    if (itemSumMinor > 0) {
      out.totalMinor = itemSumMinor;
      out.totalDerived = true;
      warnings.push(warn('TOTAL_DERIVED', 'The total was not readable, so it was calculated from the sum of line items. Please verify it.'));
    }
  }

  if (out.totalMinor != null && out.totalAmount == null) {
    out.totalAmount = out.totalMinor / 100;
  }
  if (out.totalMinor == null) {
    warnings.push(warn('TOTAL_MISSING', 'The total amount could not be read. Enter it manually.'));
  }

  if (!out.isPaymentScreenshot) {
    if (out.subtotalMinor != null && out.totalMinor != null && !out.totalDerived) {
      const expected = out.subtotalMinor + (out.taxMinor || 0) + charges - discount;
      if (Math.abs(expected - out.totalMinor) > ROUNDING_TOLERANCE_MINOR) {
        warnings.push(warn('TOTAL_MISMATCH', 'Subtotal plus tax does not match the total. One of the amounts may have been misread.'));
      }
    }
    const itemSum = out.items.reduce((sum, item) => sum + (item.amountMinor || 0), 0);
    const itemTarget = out.subtotalMinor ?? (out.totalMinor != null ? out.totalMinor - (out.taxMinor || 0) - charges + discount : null);
    if (out.items.length && itemTarget != null && Math.abs(itemSum - itemTarget) > ROUNDING_TOLERANCE_MINOR) {
      warnings.push(warn('ITEMS_MISMATCH', 'The item amounts do not add up to the subtotal. Some items may be missing or misread.'));
    }
    if (!out.merchant) warnings.push(warn('MERCHANT_MISSING', 'The vendor name could not be read.'));
  } else {
    if (out.settlement && out.settlement !== 'PAID') {
      warnings.push(warn('PAYMENT_NOT_COMPLETED', `This screenshot shows a ${out.settlement.toLowerCase()} payment. Do not record it as paid.`));
    }
    if (!out.transactionReference) {
      warnings.push(warn('REFERENCE_MISSING', 'No UPI transaction ID / UTR could be read. Enter it from the payment app.'));
    }
  }

  const effectiveDate = out.expenseDate || out.receiptDate;
  if (!effectiveDate) {
    warnings.push(warn('DATE_MISSING', 'The date could not be read, or is ambiguous (e.g. 10/11/2026). Enter it manually.'));
  } else if (new Date(`${effectiveDate}T00:00:00Z`).getTime() > now.getTime() + DAY_MS) {
    warnings.push(warn('DATE_IN_FUTURE', 'The date read from the receipt is in the future.'));
  }

  if (ocrConfidence != null && ocrConfidence < LOW_CONFIDENCE) {
    warnings.push(warn('LOW_CONFIDENCE', 'The image is hard to read. Check every field, or retake the photo in better light.'));
  }

  // 0-100: OCR word confidence, reduced for each cross-check that failed.
  const penalty = warnings.filter((w) => w.code !== 'TOTAL_DERIVED').length * 8;
  const baseConf = ocrConfidence ?? (out.confidence || 90);
  out.confidence = Math.max(0, Math.min(100, Math.round(baseConf - penalty)));
  out.warnings = warnings;
  out.needsReview = warnings.length > 0;
  return out;
}

const extractionScore = (result) =>
  (result.receiptDate || result.expenseDate ? 2 : 0) +
  (result.totalMinor != null ? 3 : 0) +
  (result.merchant ? 2 : 0) +
  (result.transactionReference ? 2 : 0) +
  (result.isPaymentScreenshot ? 2 : 0) +
  Math.min(result.items?.length || 0, 5);

const hasConsistencyProblem = (result) => result.warnings.some((w) => w.code === 'TOTAL_MISMATCH' || w.code === 'ITEMS_MISMATCH');

export async function previewReceiptOcr(file, { env = process.env, run = runTesseract, preprocess = buildOcrVariants, readPdfText = extractPdfText } = {}) {
  if (file?.mimetype === 'application/pdf') {
    const text = await readPdfText(file.path);
    if (!text) return { status: 'UNSUPPORTED_FILE', error: 'This PDF has no readable text (it looks scanned). Upload a photo or screenshot of it instead, or enter the details manually.', result: null };
    const result = analyzeExtraction(extractReceiptData(text), { ocrConfidence: 95 });
    return { status: 'COMPLETED', error: null, result: { ...result, recognizedText: text.slice(0, 6000), source: 'PDF_TEXT' } };
  }

  const validFile = validateOcrFile(file);
  if (!validFile.valid) return { status: validFile.status, error: validFile.error, result: null };

  const config = { ...expenseOcrConfiguration(env), withConfidence: true };
  if (!config.configured) return { status: 'NOT_CONFIGURED', error: 'Local receipt OCR is not configured. Enter the expense details manually.', result: null };

  let prepared = { variants: [], cleanup: async () => {} };
  try { prepared = await preprocess(file.path); } catch { /* fall back to the original upload */ }

  try {
    const sources = [...prepared.variants, { label: 'original', path: file.path }];
    const attempts = [];
    prepared.variants.forEach((variant, index) => SEGMENTATION_MODES.slice(0, index === 0 ? 3 : 1).forEach((mode) => attempts.push({ variant, mode })));
    SEGMENTATION_MODES.slice(0, prepared.variants.length ? 1 : 3).forEach((mode) => attempts.push({ variant: sources.at(-1), mode }));

    let best = null;
    let firstFailure = null;
    for (const { variant, mode } of attempts.slice(0, MAX_OCR_RUNS)) {
      const outcome = await run({ ...file, path: variant.path }, { ...config, pageSegmentationMode: mode });
      if (outcome.status !== 'COMPLETED') { firstFailure ??= outcome; continue; }
      const result = analyzeExtraction(extractReceiptData(outcome.text), { ocrConfidence: outcome.confidence ?? null });
      // A result that passes its own arithmetic checks beats a higher-scoring one that does not.
      const rank = extractionScore(result) - (hasConsistencyProblem(result) ? 4 : 0);
      if (!best || rank > best.rank) best = { result, rank, text: outcome.text, mode, variant: variant.label };
      if (extractionScore(result) >= 5 && !hasConsistencyProblem(result)) break;
    }
    if (!best) return { status: firstFailure?.status || 'NO_TEXT', error: firstFailure?.error || 'No readable text was found on this receipt. Enter the details manually.', result: null };

    // Supplementary pass for white-on-black bands: merge the negated image's text and keep it only if it helps.
    const needsMore = best.result.totalMinor == null || best.result.totalDerived || hasConsistencyProblem(best.result);
    if (needsMore && prepared.inverted) {
      const outcome = await run({ ...file, path: prepared.inverted.path }, { ...config, pageSegmentationMode: 6 });
      if (outcome.status === 'COMPLETED') {
        const text = `${best.text}\n${outcome.text}`;
        const result = analyzeExtraction(extractReceiptData(text), { ocrConfidence: best.result.confidence ?? outcome.confidence ?? null });
        const rank = extractionScore(result) - (hasConsistencyProblem(result) ? 4 : 0);
        if (rank > best.rank && !result.totalDerived) best = { result, rank, text, mode: 6, variant: `${best.variant}+inverted` };
      }
    }

    return {
      status: 'COMPLETED',
      error: null,
      result: { ...best.result, recognizedText: best.text.slice(0, 6000), pageSegmentationMode: best.mode, source: 'IMAGE_OCR', preprocessing: best.variant },
    };
  } finally {
    await prepared.cleanup();
  }
}

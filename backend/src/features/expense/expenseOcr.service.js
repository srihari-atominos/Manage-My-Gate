import fs from 'node:fs';
import { parseReceiptText } from '../personalExpense/ocr/receiptParser.js';
import { runTesseract, validateOcrFile, resolveTessdataDir } from '../personalExpense/ocr/tesseractLocal.provider.js';
import { buildOcrVariants } from './expenseOcrPreprocess.js';
import { extractPdfText } from './expensePdfText.js';
import { needsHeaderPass, mergeHeaderIdentity, trimMerchantNoise } from '../personalExpense/ocr/headerBand.js';
import oxrProvider from '../personalExpense/ocr/oxr.provider.js';
import { mergeCommunityReceiptFields } from './communityReceiptNormalizer.js';

const DEFAULT_TIMEOUT_MS = 20_000;
const SEGMENTATION_MODES = [3, 4, 6];
const MAX_OCR_RUNS = 5;
const ROUNDING_TOLERANCE_MINOR = 100;
const LOW_CONFIDENCE = 65;
const DAY_MS = 24 * 60 * 60 * 1000;

const resolveTesseractCommand = (env = process.env) => {
  if (env.TESSERACT_COMMAND) return env.TESSERACT_COMMAND;
  if (process.platform === 'win32') {
    const winPath = 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe';
    if (fs.existsSync(winPath)) return winPath;
  }
  return 'tesseract';
};

export function expenseOcrConfiguration(env = process.env) {
  const rawLanguages = String(env.EXPENSE_OCR_LANGUAGES || 'eng+tam')
    .split('+')
    .map((value) => value.trim())
    .filter(Boolean);
  const languages = rawLanguages.length ? rawLanguages : ['eng', 'tam'];
  const timeout = Number(env.EXPENSE_OCR_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const command = resolveTesseractCommand(env);
  const tessdataDir = resolveTessdataDir(env);
  const explicitProvider = String(
    env.EXPENSE_OCR_PROVIDER || env.PERSONAL_EXPENSE_OCR_PROVIDER || env.OCR_PROVIDER || ''
  ).toLowerCase();
  const configured =
    explicitProvider === 'tesseract-local' ||
    explicitProvider === 'tesseract' ||
    explicitProvider === 'dual' ||
    explicitProvider === 'fallback' ||
    (explicitProvider === '' && Boolean(env.TESSERACT_COMMAND));
  return {
    configured,
    command,
    tessdataDir,
    languages,
    timeoutMs: Number.isFinite(timeout) && timeout >= 1_000 && timeout <= 120_000 ? timeout : DEFAULT_TIMEOUT_MS,
  };
}

export function extractReceiptData(text = '') {
  const data = parseReceiptText(text);
  const totalAmount = data.totalAmount != null ? data.totalAmount : (data.totalMinor != null ? data.totalMinor / 100 : null);
  const expenseDate = data.expenseDate || data.receiptDate;

  const extracted = {
    expenseDate,
    receiptDate: expenseDate,
    totalAmount,
    totalMinor: data.totalMinor,
    subtotalAmount: data.subtotalAmount,
    subtotalMinor: data.subtotalMinor,
    taxMinor: data.taxMinor,
    cgstAmount: data.cgstAmount ?? (data.cgstMinor != null ? data.cgstMinor / 100 : null),
    cgstMinor: data.cgstMinor ?? null,
    sgstAmount: data.sgstAmount ?? (data.sgstMinor != null ? data.sgstMinor / 100 : null),
    sgstMinor: data.sgstMinor ?? null,
    discountMinor: data.discountMinor,
    additionalChargesMinor: data.additionalChargesMinor,
    merchant: data.merchant,
    merchantAddress: data.merchantAddress,
    receiptNumber: data.receiptNumber,
    invoiceNumber: data.invoiceNumber || null,
    billNumber: data.billNumber || null,
    orderId: data.orderId || null,
    transactionId: data.transactionId || null,
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
    fieldConfidence: data.fieldConfidence || {},
  };
  return mergeCommunityReceiptFields(extracted, text);
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
    // Line items may be printed tax-inclusive, so they can legitimately add up to the grand total instead of the subtotal.
    const itemsMatchTotal = out.totalMinor != null && Math.abs(itemSum - out.totalMinor) <= ROUNDING_TOLERANCE_MINOR;
    if (out.items.length && itemTarget != null && Math.abs(itemSum - itemTarget) > ROUNDING_TOLERANCE_MINOR && !itemsMatchTotal) {
      warnings.push(warn('ITEMS_MISMATCH', 'The item amounts do not add up to the subtotal. Some items may be missing or misread.'));
    }
    if (!out.merchant) warnings.push(warn('MERCHANT_MISSING', 'The vendor name could not be read.'));
  } else {
    if (out.settlement && out.settlement !== 'PAID') {
      warnings.push(warn('PAYMENT_NOT_COMPLETED', `This screenshot shows a ${out.settlement.toLowerCase()} payment. Do not record it as paid.`));
    }
    if (!out.transactionReference) {
      warnings.push(
        warn(
          'REFERENCE_MISSING',
          out.paymentMethod === 'BANK_TRANSFER'
            ? 'No bank transaction reference / UTR could be read. Enter it from the transfer receipt.'
            : 'No UPI transaction ID / UTR could be read. Enter it from the payment app.'
        )
      );
    }
  }

  const effectiveDate = out.expenseDate || out.receiptDate;
  if (!effectiveDate) {
    warnings.push(warn('DATE_MISSING', 'The date could not be read, or is ambiguous (e.g. 10/11/2026). Enter it manually.'));
  } else if (new Date(`${effectiveDate}T00:00:00Z`).getTime() > now.getTime() + DAY_MS) {
    warnings.push(warn('DATE_IN_FUTURE', 'The receipt date ' + effectiveDate + ' is later than today. Upload the correct receipt or enter the date manually.'));
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

/**
 * A total is corroborated when something else on the receipt independently adds up to it: the line items,
 * or subtotal + tax + charges - discount. A total that nothing supports (e.g. "1234" lifted from an address)
 * is not corroborated, so a pass that read the real figures outranks it.
 */
const totalCorroborated = (result) => {
  if (result.totalMinor == null || result.totalDerived) return false;
  const itemSum = (result.items || []).reduce((sum, item) => sum + (item.amountMinor || 0), 0);
  if (itemSum > 0 && Math.abs(itemSum - result.totalMinor) <= ROUNDING_TOLERANCE_MINOR) return true;
  if (result.subtotalMinor != null) {
    const expected = result.subtotalMinor + (result.taxMinor || 0) + (result.additionalChargesMinor || 0) - (result.discountMinor || 0);
    return Math.abs(expected - result.totalMinor) <= ROUNDING_TOLERANCE_MINOR;
  }
  return false;
};

// Higher is better: fields captured, minus arithmetic problems, plus corroboration and the engine's own confidence.
const rankResult = (result, ocrConfidence) =>
  extractionScore(result) - (hasConsistencyProblem(result) ? 4 : 0) + (totalCorroborated(result) ? 3 : 0) + (ocrConfidence ?? 50) / 25;
const isOcrFallbackEnabled = (env = process.env) => env.EXPENSE_OCR_OXR_ENABLED === 'true' || env.OCR_OXR_ENABLED === 'true';
const hasCoreReceiptFields = (result = {}) => Boolean(result.merchant && result.receiptNumber && (result.receiptDate || result.expenseDate) && result.totalMinor != null);
const requiresStructuredFallback = (result = {}, text = '') =>
  !hasCoreReceiptFields(result) ||
  result.totalDerived ||
  hasConsistencyProblem(result) ||
  (/\b(?:tangedco|tneb|electricity)\b/i.test(text) && !(result.items || []).length);

const withFieldProvenance = (result, source, confidence) => {
  const existing = result.fieldConfidence || {};
  // The shared receipt parser uses { score, level } and the canonical names
  // total/date/reference. The Community Finance client consumes provenance
  // under totalMinor/receiptDate/receiptNumber. Translate at this boundary so
  // good values are not incorrectly withheld from the form.
  const aliases = {
    merchant: ['merchant'],
    receiptNumber: ['receiptNumber', 'reference'],
    receiptDate: ['receiptDate', 'date'],
    totalMinor: ['totalMinor', 'total'],
    items: ['items'],
  };
  const detailsFor = (field) => aliases[field]
    .map((key) => existing[key])
    .find(Boolean) || null;
  const confidenceFor = (field) => {
    const details = detailsFor(field);
    return details?.score ?? details?.confidence ?? confidence ?? result.confidence ?? null;
  };
  const provenance = (field) => {
    const details = detailsFor(field);
    return { source: details?.source || source, confidence: confidenceFor(field) };
  };
  return {
    ...result,
    fieldProvenance: {
      merchant: result.merchant ? provenance('merchant') : null,
      receiptNumber: result.receiptNumber ? provenance('receiptNumber') : null,
      receiptDate: (result.receiptDate || result.expenseDate) ? provenance('receiptDate') : null,
      totalMinor: result.totalMinor != null ? provenance('totalMinor') : null,
      items: result.items?.length ? provenance('items') : null,
    },
    fieldConfidence: existing,
  };
};

export async function previewReceiptOcr(file, { env = process.env, run = runTesseract, preprocess = buildOcrVariants, readPdfText = extractPdfText, oxr = oxrProvider } = {}) {
  if (file?.mimetype === 'application/pdf') {
    const text = await readPdfText(file.path);
    let pdfResult = null;
    if (text) {
      pdfResult = analyzeExtraction(extractReceiptData(text), { ocrConfidence: 95 });
      if (!requiresStructuredFallback(pdfResult, text) || !isOcrFallbackEnabled(env)) {
        return { status: 'COMPLETED', error: null, result: { ...withFieldProvenance(pdfResult, 'pdf-text', 95), recognizedText: text.slice(0, 6000), source: 'PDF_TEXT' } };
      }
    }
    if (isOcrFallbackEnabled(env)) {
      const outcome = await oxr.process(file, { env });
      if (outcome.status === 'COMPLETED') {
        const result = analyzeExtraction(mergeCommunityReceiptFields(outcome.extractedFields, outcome.rawText), { ocrConfidence: outcome.confidence });
        return { status: 'COMPLETED', error: null, result: { ...withFieldProvenance(result, 'oxr', outcome.confidence), recognizedText: outcome.rawText.slice(0, 6000), source: 'PDF_OXR', ocrEngine: 'oxr', needsReview: result.needsReview || !hasCoreReceiptFields(result) } };
      }
    }
    if (pdfResult) {
      const partial = { ...pdfResult, warnings: [...(pdfResult.warnings || []), warn('OXR_FALLBACK_FAILED', 'Structured OCR was unavailable; review every value extracted from this PDF.')], needsReview: true };
      return { status: 'COMPLETED', error: null, result: { ...withFieldProvenance(partial, 'pdf-text', 95), recognizedText: text.slice(0, 6000), source: 'PDF_TEXT' } };
    }
    return { status: 'UNSUPPORTED_FILE', error: 'This PDF has no readable text and structured OCR is not available. Enter the details manually.', result: null };
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
    const focusedAmountVariant = prepared.variants.find((variant) => variant.label === 'payment-amount');
    if (focusedAmountVariant) {
      attempts.push({
        variant: focusedAmountVariant,
        mode: 7,
        characterWhitelist: '₹0123456789,.',
      });
    }
    const fullVariants = prepared.variants.filter((v) => v.label !== 'payment-amount');
    fullVariants.forEach((variant) => attempts.push({ variant, mode: 6 }));
    fullVariants.forEach((variant) => attempts.push({ variant, mode: 3 }));
    attempts.push({ variant: sources.at(-1), mode: 6 });
    attempts.push({ variant: sources.at(-1), mode: 3 });
    attempts.push({ variant: sources.at(-1), mode: 11 });

    let best = null;
    let firstFailure = null;
    const completedRuns = [];

    for (const { variant, mode, characterWhitelist } of attempts.slice(0, MAX_OCR_RUNS)) {
      const outcome = await run(
        { ...file, path: variant.path },
        { ...config, pageSegmentationMode: mode, characterWhitelist }
      );
      if (outcome.status !== 'COMPLETED') { firstFailure ??= outcome; continue; }
      const result = analyzeExtraction(extractReceiptData(outcome.text), { ocrConfidence: outcome.confidence ?? null });
      // A result that passes its own arithmetic checks beats a higher-scoring one that does not.
      const rank = rankResult(result, outcome.confidence);
      completedRuns.push({ result, rank, text: outcome.text, mode, variant: variant.label, confidence: outcome.confidence });
      if (!best || rank > best.rank) best = { result, rank, text: outcome.text, mode, variant: variant.label };
      // Stop early only if the core fields are captured cleanly and the total is backed by the rest of the receipt
      const hasCore4 = result.merchant && (result.expenseDate || result.receiptDate) && result.totalMinor != null && (result.receiptNumber || result.transactionReference);
      const cleanAndCorroborated = result.merchant && (result.expenseDate || result.receiptDate) && totalCorroborated(result) && (outcome.confidence ?? 0) >= 85;
      if ((hasCore4 || cleanAndCorroborated) && !hasConsistencyProblem(result)) break;
    }
    if (!best) return { status: firstFailure?.status || 'NO_TEXT', error: firstFailure?.error || 'No readable text was found on this receipt. Enter the details manually.', result: null };

    // The total is decided by vote across passes, not by whichever single pass ranks highest: a stray low-confidence pass
    // can look self-consistent (one garbage "item" equal to its own total). Passes weigh in by OCR confidence, with a bonus
    // when the rest of the receipt backs the total. The best-ranked pass that agrees with the winner becomes the anchor.
    const totalVotes = new Map();
    for (const r of completedRuns) {
      if (r.result.totalMinor == null || r.result.totalDerived || r.variant === 'payment-amount') continue;
      const weight = (r.confidence ?? 50) / 100 + (totalCorroborated(r.result) ? 1 : 0);
      totalVotes.set(r.result.totalMinor, (totalVotes.get(r.result.totalMinor) || 0) + weight);
    }
    const focusedAmount = completedRuns
      .filter((run) => run.variant === 'payment-amount' && run.result.totalMinor != null)
      .sort((a, b) => b.rank - a.rank)[0];

    const sortedVotes = [...totalVotes.entries()].sort((a, b) => b[1] - a[1]);
    const topVotedTotal = sortedVotes[0]?.[0] ?? null;

    // Use focusedAmount if topVotedTotal is missing, or if topVotedTotal is a small stray screen digit (< 1000 minor) and focusedAmount is substantial
    const winningTotal = (topVotedTotal != null && !(topVotedTotal < 1000 && (focusedAmount?.result.totalMinor ?? 0) >= 1000))
      ? topVotedTotal
      : (focusedAmount?.result.totalMinor ?? topVotedTotal);

    if (winningTotal != null && best.result.totalMinor !== winningTotal) {
      const anchor = completedRuns.filter((r) => r.result.totalMinor === winningTotal && !r.result.totalDerived && r.variant !== 'payment-amount').sort((a, b) => b.rank - a.rank)[0];
      if (anchor) {
        best = { result: anchor.result, rank: anchor.rank, text: anchor.text, mode: anchor.mode, variant: anchor.variant };
      } else {
        best.result.totalMinor = winningTotal;
        best.result.totalAmount = winningTotal / 100;
      }
    }

    // Reconcile core fields across all successful passes
    const mergedResult = { ...best.result };
    const commercialKeywords = /\b(?:enterprises?|agency|agencies|solutions|services|traders|stores?|mart|company|co|ltd|limited|pvt|electricals?|hardware|plumbing|sanitation|consulting)\b/i;

    for (const r of completedRuns) {
      // 1. Merchant: Prioritize merchant with commercial suffix or signature block over addresses or generic words
      const isItemRow = (name) => mergedResult.items.some((item) => String(item.description || '').trim().toLowerCase() === String(name).trim().toLowerCase());
      const supportingPasses = completedRuns.filter((other) => other.result.merchant && other.result.merchant.toLowerCase() === r.result.merchant?.toLowerCase()).length;
      if (!mergedResult.merchant && r.result.merchant && !isItemRow(r.result.merchant) && (supportingPasses >= 2 || commercialKeywords.test(r.result.merchant))) {
        mergedResult.merchant = r.result.merchant;
      } else if (r.result.merchant && r.result.merchant !== mergedResult.merchant) {
        const hasCommCurrent = commercialKeywords.test(mergedResult.merchant);
        const hasCommCandidate = commercialKeywords.test(r.result.merchant);
        if (!hasCommCurrent && hasCommCandidate) {
          mergedResult.merchant = r.result.merchant;
        }
      }

      // 2. Keep a document number distinct from a payment transaction reference.
      const candBill = r.result.receiptNumber;
      if (candBill) {
        const str = String(candBill).trim();
        const isAddressOrFlat = /\b(?:[a-zA-Z]{1,3}\d{1,4}[-/]\d+|sf\d+|pallavi|nagar|road|street|floor|credit|admin|user)\b/i.test(str);
        if (!isAddressOrFlat && (!mergedResult.receiptNumber || /^\d{3,6}$/.test(str))) {
          mergedResult.receiptNumber = str;
        }
      }
      if (!mergedResult.transactionReference && r.result.transactionReference) {
        mergedResult.transactionReference = String(r.result.transactionReference).trim();
      }

      // 3. Date
      if (!mergedResult.expenseDate && (r.result.expenseDate || r.result.receiptDate)) {
        mergedResult.expenseDate = r.result.expenseDate || r.result.receiptDate;
        mergedResult.receiptDate = mergedResult.expenseDate;
      }

      // 4. Total: the best-ranked pass already chose it using corroboration (items / subtotal + tax). Another pass may only
      // fill it when missing; a bigger number is not a better total (it is often an address or phone number).
      if (mergedResult.totalMinor == null && r.result.totalMinor != null) {
        mergedResult.totalMinor = r.result.totalMinor;
        mergedResult.totalAmount = r.result.totalAmount;
      }
    }

    // Header-band pass: re-read the top of the page on its own to fill a missing / garbled bill no, date or vendor.
    if (!mergedResult.isPaymentScreenshot && prepared.header && needsHeaderPass(mergedResult, best.text)) {
      const outcome = await run({ ...file, path: prepared.header.path }, { ...config, pageSegmentationMode: 6 });
      if (outcome.status === 'COMPLETED') {
        const filled = mergeHeaderIdentity(mergedResult, best.text, outcome.text);
        Object.assign(mergedResult, filled);
        // A vendor/number that came from the header read is no longer "missing".
        if (filled.merchant) mergedResult.warnings = (mergedResult.warnings || []).filter((w) => w.code !== 'MERCHANT_MISSING');
        if (filled.receiptDate) mergedResult.warnings = (mergedResult.warnings || []).filter((w) => w.code !== 'DATE_MISSING');
        mergedResult.needsReview = (mergedResult.warnings || []).length > 0;
      }
    }

    // Supplementary pass for white-on-black bands: merge the negated image's text and keep it only if it helps.
    const needsMore = best.result.totalMinor == null || best.result.totalDerived || hasConsistencyProblem(best.result);
    if (needsMore && prepared.inverted) {
      const outcome = await run({ ...file, path: prepared.inverted.path }, { ...config, pageSegmentationMode: 6 });
      if (outcome.status === 'COMPLETED') {
        const text = `${best.text}\n${outcome.text}`;
        const result = analyzeExtraction(extractReceiptData(text), { ocrConfidence: best.result.confidence ?? outcome.confidence ?? null });
        const rank = rankResult(result, best.result.confidence ?? outcome.confidence);
        if (rank > best.rank && !result.totalDerived) best = { result, rank, text, mode: 6, variant: `${best.variant}+inverted` };
      }
    }

    mergedResult.merchant = trimMerchantNoise(mergedResult.merchant, completedRuns.map((r) => r.text).join(' '));

    let finalResult = mergedResult;
    let finalText = best.text;
    let finalSource = 'IMAGE_OCR';
    let finalEngine = 'tesseract';
    let finalConfidence = best.result.confidence ?? null;

    // Structured OCR is intentionally a fallback: it is used when the local pass
    // cannot establish the core identity/total or cannot reconstruct a utility table.
    if (isOcrFallbackEnabled(env) && requiresStructuredFallback(mergedResult, best.text)) {
      const outcome = await oxr.process(file, { env });
      if (outcome.status === 'COMPLETED') {
        const structured = analyzeExtraction(mergeCommunityReceiptFields(outcome.extractedFields, outcome.rawText), { ocrConfidence: outcome.confidence });
        const tesseractScore = rankResult(mergedResult, finalConfidence);
        const structuredScore = rankResult(structured, outcome.confidence);
        const conflicts = [];
        if (mergedResult.totalMinor != null && structured.totalMinor != null && mergedResult.totalMinor !== structured.totalMinor) {
          conflicts.push(warn('OCR_FIELD_CONFLICT', `OCR engines disagree on the total amount. Local OCR: ₹${(mergedResult.totalMinor / 100).toFixed(2)}, structured OCR: ₹${(structured.totalMinor / 100).toFixed(2)}. Confirm the total before saving.`));
        }
        if (mergedResult.receiptNumber && structured.receiptNumber && mergedResult.receiptNumber !== structured.receiptNumber) {
          conflicts.push(warn('OCR_FIELD_CONFLICT', 'OCR engines disagree on the receipt number. Confirm it before saving.'));
        }
        if (structuredScore >= tesseractScore || !hasCoreReceiptFields(mergedResult)) {
          finalResult = { ...structured, warnings: [warn('FALLBACK_TO_OXR', 'Local OCR extraction was incomplete; structured OCR was used for verification.'), ...conflicts, ...(structured.warnings || [])], needsReview: structured.needsReview || conflicts.length > 0 || !hasCoreReceiptFields(structured) };
          finalText = outcome.rawText || best.text;
          finalSource = 'IMAGE_OCR_OXR_FALLBACK';
          finalEngine = 'oxr';
          finalConfidence = outcome.confidence ?? structured.confidence ?? null;
        } else if (conflicts.length) {
          finalResult = { ...mergedResult, warnings: [...(mergedResult.warnings || []), ...conflicts], needsReview: true };
        }
      } else {
        finalResult = { ...mergedResult, warnings: [...(mergedResult.warnings || []), warn('OXR_FALLBACK_FAILED', 'Structured OCR was unavailable; review the locally extracted fields.')], needsReview: true };
      }
    }

    return {
      status: 'COMPLETED',
      error: null,
      result: { ...withFieldProvenance(finalResult, finalEngine, finalConfidence), recognizedText: finalText.slice(0, 6000), pageSegmentationMode: best.mode, source: finalSource, preprocessing: best.variant, ocrEngine: finalEngine },
    };
  } finally {
    await prepared.cleanup();
  }
}

/**
 * Receipt Reconciler
 *
 * Compares field-level extraction results from Tesseract and OXR.
 * Detects conflicts, aggregates agreement signals, preserves data provenance,
 * and produces a safe, reconciled receipt payload for user review.
 */

import { validateExtractedReceipt, validateReceiptArithmetic } from './receipt-validator.js';

const cleanString = (val) =>
  String(val || '')
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');

/**
 * Calculates string similarity between 0 and 1.
 */
function textSimilarity(a, b) {
  const normA = cleanString(a);
  const normB = cleanString(b);
  if (!normA && !normB) return 1;
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;
  if (normA.includes(normB) || normB.includes(normA)) return 0.85;

  // Word overlap Jaccard index
  const wordsA = new Set(normA.split(' '));
  const wordsB = new Set(normB.split(' '));
  const intersection = [...wordsA].filter((w) => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);
  return intersection.length / union.size;
}

/**
 * Scores how trustworthy a provider's total is, so a conflict can be staged with the better candidate.
 * A total that was derived (not printed), or that contradicts the receipt's own subtotal/tax/items, scores lower.
 */
function totalCandidateScore(fields) {
  let score = 0;
  if (!fields.totalDerived) score += 2;
  if (fields.subtotalMinor != null && validateReceiptArithmetic(fields).consistent) score += 2;
  const itemSum = (fields.items || []).reduce((sum, item) => sum + Number(item.amountMinor || 0), 0);
  if (itemSum > 0 && Math.abs(itemSum - fields.totalMinor) <= 50) score += 1;
  return score;
}

/**
 * Reconciles two provider results (Tesseract and OXR).
 *
 * @param {Object} tesseractResult - ProviderOcrResult or extractedFields from Tesseract
 * @param {Object} oxrResult - ProviderOcrResult or extractedFields from OXR
 * @returns {Object} Reconciled receipt extraction result
 */
export function reconcileReceiptResults(tesseractResult, oxrResult) {
  const tFields = tesseractResult?.extractedFields || tesseractResult || {};
  const oFields = oxrResult?.extractedFields || oxrResult || {};

  const disagreements = [];
  const provenance = {};
  const reconciledFields = {};

  // 1. Total Amount Comparison
  const tTotal = tFields.totalMinor;
  const oTotal = oFields.totalMinor;

  if (tTotal != null && oTotal != null) {
    if (tTotal === oTotal) {
      reconciledFields.totalMinor = tTotal;
      reconciledFields.totalAmount = tFields.totalAmount ?? tTotal / 100;
      provenance.totalMinor = { source: 'reconciled', agreement: true, value: tTotal };
    } else {
      // Disagreement: do not arbitrarily pick one; flag conflict for user review
      disagreements.push({
        field: 'totalMinor',
        message: `Total amount conflict: Tesseract found ₹${(tTotal / 100).toFixed(2)}, OXR found ₹${(oTotal / 100).toFixed(2)}.`,
        tesseractValue: tTotal,
        oxrValue: oTotal,
      });
      // Stage the arithmetically better-supported candidate (ties go to Tesseract); the conflict is still flagged for review
      const pickOxr = totalCandidateScore(oFields) > totalCandidateScore(tFields);
      const staged = pickOxr ? oTotal : tTotal;
      reconciledFields.totalMinor = staged;
      reconciledFields.totalAmount = staged / 100;
      provenance.totalMinor = {
        source: 'conflict',
        agreement: false,
        candidates: { tesseract: tTotal, oxr: oTotal },
        staged: pickOxr ? 'oxr' : 'tesseract',
      };
    }
  } else if (tTotal != null) {
    reconciledFields.totalMinor = tTotal;
    reconciledFields.totalAmount = tFields.totalAmount ?? tTotal / 100;
    provenance.totalMinor = { source: 'tesseract', agreement: false, value: tTotal };
  } else if (oTotal != null) {
    reconciledFields.totalMinor = oTotal;
    reconciledFields.totalAmount = oFields.totalAmount ?? oTotal / 100;
    provenance.totalMinor = { source: 'oxr', agreement: false, value: oTotal };
  } else {
    reconciledFields.totalMinor = null;
    reconciledFields.totalAmount = null;
    provenance.totalMinor = { source: 'none', agreement: false, value: null };
  }

  // 2. Receipt Date Comparison
  const tDate = tFields.receiptDate;
  const oDate = oFields.receiptDate;

  if (tDate && oDate) {
    if (tDate === oDate) {
      reconciledFields.receiptDate = tDate;
      provenance.receiptDate = { source: 'reconciled', agreement: true, value: tDate };
    } else {
      disagreements.push({
        field: 'receiptDate',
        message: `Date conflict: Tesseract found ${tDate}, OXR found ${oDate}.`,
        tesseractValue: tDate,
        oxrValue: oDate,
      });
      reconciledFields.receiptDate = tDate; // Staged candidate
      provenance.receiptDate = {
        source: 'conflict',
        agreement: false,
        candidates: { tesseract: tDate, oxr: oDate },
      };
    }
  } else if (tDate) {
    reconciledFields.receiptDate = tDate;
    provenance.receiptDate = { source: 'tesseract', agreement: false, value: tDate };
  } else if (oDate) {
    reconciledFields.receiptDate = oDate;
    provenance.receiptDate = { source: 'oxr', agreement: false, value: oDate };
  } else {
    reconciledFields.receiptDate = null;
    provenance.receiptDate = { source: 'none', agreement: false, value: null };
  }

  // 3. Merchant Name Comparison
  const tMerchant = tFields.merchant;
  const oMerchant = oFields.merchant;

  if (tMerchant && oMerchant) {
    const similarity = textSimilarity(tMerchant, oMerchant);
    if (similarity >= 0.7) {
      // Pick the cleaner / longer version
      const preferred = tMerchant.length >= oMerchant.length ? tMerchant : oMerchant;
      reconciledFields.merchant = preferred;
      provenance.merchant = { source: 'reconciled', agreement: true, value: preferred };
    } else {
      disagreements.push({
        field: 'merchant',
        message: `Merchant name conflict: Tesseract found "${tMerchant}", OXR found "${oMerchant}".`,
        tesseractValue: tMerchant,
        oxrValue: oMerchant,
      });
      reconciledFields.merchant = tMerchant;
      provenance.merchant = {
        source: 'conflict',
        agreement: false,
        candidates: { tesseract: tMerchant, oxr: oMerchant },
      };
    }
  } else if (tMerchant) {
    reconciledFields.merchant = tMerchant;
    provenance.merchant = { source: 'tesseract', agreement: false, value: tMerchant };
  } else if (oMerchant) {
    reconciledFields.merchant = oMerchant;
    provenance.merchant = { source: 'oxr', agreement: false, value: oMerchant };
  } else {
    reconciledFields.merchant = null;
    provenance.merchant = { source: 'none', agreement: false, value: null };
  }

  // 4. Subtotal & Tax Comparison
  reconciledFields.subtotalMinor = tFields.subtotalMinor ?? oFields.subtotalMinor ?? null;
  provenance.subtotalMinor = {
    source: tFields.subtotalMinor != null ? 'tesseract' : (oFields.subtotalMinor != null ? 'oxr' : 'none'),
    value: reconciledFields.subtotalMinor,
  };

  reconciledFields.taxMinor = tFields.taxMinor ?? oFields.taxMinor ?? null;
  provenance.taxMinor = {
    source: tFields.taxMinor != null ? 'tesseract' : (oFields.taxMinor != null ? 'oxr' : 'none'),
    value: reconciledFields.taxMinor,
  };

  reconciledFields.discountMinor = tFields.discountMinor ?? oFields.discountMinor ?? null;
  reconciledFields.additionalChargesMinor = tFields.additionalChargesMinor ?? oFields.additionalChargesMinor ?? null;
  reconciledFields.currency = tFields.currency || oFields.currency || 'INR';
  reconciledFields.receiptNumber = tFields.receiptNumber || oFields.receiptNumber || null;
  reconciledFields.invoiceNumber = tFields.invoiceNumber || oFields.invoiceNumber || null;
  reconciledFields.billNumber = tFields.billNumber || oFields.billNumber || null;
  reconciledFields.orderId = tFields.orderId || oFields.orderId || null;
  reconciledFields.documentType = tFields.documentType || oFields.documentType || 'UNKNOWN';
  reconciledFields.merchantAddress = tFields.merchantAddress || oFields.merchantAddress || null;
  reconciledFields.receiptTime = tFields.receiptTime || oFields.receiptTime || null;
  reconciledFields.expenseDate = reconciledFields.receiptDate;

  // Fields the client reads that are not compared above. Take them from whichever engine supplied the merchant,
  // so the suggested name/notes stay consistent with the merchant shown; fall back to the other engine.
  const merchantFromOxr = provenance.merchant?.source === 'oxr' || reconciledFields.merchant === oMerchant && reconciledFields.merchant !== tMerchant;
  const [primary, secondary] = merchantFromOxr ? [oFields, tFields] : [tFields, oFields];
  for (const key of [
    'cgstMinor', 'cgstAmount', 'sgstMinor', 'sgstAmount', 'subtotalAmount',
    'suggestedCategory', 'suggestedExpenseType', 'suggestedExpenseName',
    'description', 'notes', 'suggestedNotes', 'explicitNotes',
  ]) {
    reconciledFields[key] = primary[key] ?? secondary[key] ?? null;
  }

  // 5. Items Reconciliation: prefer structured item list from OXR if tabular, or richer Tesseract items
  const tItems = tFields.items || [];
  const oItems = oFields.items || [];
  if (oItems.length > 0 && oItems.length >= tItems.length) {
    reconciledFields.items = oItems;
    provenance.items = { source: 'oxr', count: oItems.length };
  } else if (tItems.length > 0) {
    reconciledFields.items = tItems;
    provenance.items = { source: 'tesseract', count: tItems.length };
  } else {
    reconciledFields.items = [];
    provenance.items = { source: 'none', count: 0 };
  }

  // 6. Payment Screenshot / Proof Fields
  const isPaymentScreenshot = Boolean(tFields.isPaymentScreenshot || oFields.isPaymentScreenshot);
  reconciledFields.isPaymentScreenshot = isPaymentScreenshot;
  reconciledFields.paymentMethod = tFields.paymentMethod || oFields.paymentMethod || null;
  reconciledFields.paymentApplication = tFields.paymentApplication || oFields.paymentApplication || null;
  reconciledFields.payeeUpiId = tFields.payeeUpiId || oFields.payeeUpiId || null;
  reconciledFields.transactionReference = tFields.transactionReference || oFields.transactionReference || null;
  reconciledFields.transactionId = tFields.transactionId || oFields.transactionId || reconciledFields.transactionReference;

  // Status distinction: document displayed status vs verified
  reconciledFields.documentDisplayedStatus =
    tFields.documentDisplayedStatus ||
    oFields.documentDisplayedStatus ||
    tFields.settlement ||
    oFields.settlement ||
    null;
  reconciledFields.settlement = reconciledFields.documentDisplayedStatus;
  reconciledFields.verifiedPaymentStatus = 'UNVERIFIED';

  // 7. Confidence Assessment (based on agreement, validations, and field presence)
  let confidenceScore = 60;
  if (provenance.totalMinor?.agreement) confidenceScore += 20;
  if (provenance.receiptDate?.agreement) confidenceScore += 10;
  if (provenance.merchant?.agreement) confidenceScore += 10;
  if (disagreements.length > 0) confidenceScore = Math.max(30, confidenceScore - disagreements.length * 15);

  reconciledFields.confidence = confidenceScore;
  reconciledFields.fieldConfidence = {
    total: {
      score: provenance.totalMinor?.agreement ? 95 : (reconciledFields.totalMinor != null ? 70 : 0),
      level: provenance.totalMinor?.agreement ? 'HIGH' : (disagreements.some((d) => d.field === 'totalMinor') ? 'LOW' : 'MEDIUM'),
    },
    date: {
      score: provenance.receiptDate?.agreement ? 95 : (reconciledFields.receiptDate ? 70 : 0),
      level: provenance.receiptDate?.agreement ? 'HIGH' : (disagreements.some((d) => d.field === 'receiptDate') ? 'LOW' : 'MEDIUM'),
    },
    merchant: {
      score: provenance.merchant?.agreement ? 90 : (reconciledFields.merchant ? 65 : 0),
      level: provenance.merchant?.agreement ? 'HIGH' : (disagreements.some((d) => d.field === 'merchant') ? 'LOW' : 'MEDIUM'),
    },
  };

  // Run validation on reconciled fields
  const validation = validateExtractedReceipt(reconciledFields);

  const conflictWarnings = disagreements.map((d) => ({
    code: 'OCR_PROVIDER_DISAGREEMENT',
    field: d.field,
    message: d.message,
    candidates: d.oxrValue !== undefined ? { tesseract: d.tesseractValue, oxr: d.oxrValue } : undefined,
  }));

  reconciledFields.warnings = [...conflictWarnings, ...validation.warnings];
  reconciledFields.needsReview = validation.needsReview || disagreements.length > 0;
  reconciledFields.disagreements = disagreements;
  reconciledFields.provenance = provenance;

  return {
    reconciledFields,
    disagreements,
    provenance,
    dualProcessed: true,
  };
}

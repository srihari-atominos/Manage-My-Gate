/**
 * Receipt Validation Service
 *
 * Validates extracted receipt fields, arithmetic consistency, date constraints,
 * and payment proof settlement indications before saving or staging for review.
 */

const MAX_ROUNDING_TOLERANCE_PAISE = 50; // Up to 50 paise rounding discrepancy allowed

/**
 * Validates a monetary minor units amount (paise / cents).
 * @param {number|null} minorAmount
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateAmount(minorAmount) {
  if (minorAmount == null) {
    return { valid: false, error: 'Amount is required.' };
  }
  if (!Number.isFinite(minorAmount) || !Number.isSafeInteger(minorAmount)) {
    return { valid: false, error: 'Amount is not a valid integer representation.' };
  }
  if (minorAmount <= 0) {
    return { valid: false, error: 'Amount must be greater than zero.' };
  }
  return { valid: true };
}

/**
 * Validates ISO receipt date string (YYYY-MM-DD).
 * @param {string|null} dateStr
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateReceiptDate(dateStr) {
  if (!dateStr) {
    return { valid: false, error: 'Receipt date is missing.' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { valid: false, error: 'Receipt date must be in YYYY-MM-DD format.' };
  }

  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  if (
    dateObj.getUTCFullYear() !== y ||
    dateObj.getUTCMonth() !== m - 1 ||
    dateObj.getUTCDate() !== d
  ) {
    return { valid: false, error: 'Receipt date is not a valid calendar date.' };
  }

  // Range checks: not more than 1 day in the future (allowing slight timezone differences)
  const now = new Date();
  const maxFuture = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  if (dateObj > maxFuture) {
    return { valid: false, error: 'Receipt date cannot be in the future.' };
  }

  // Not older than 10 years
  const minPast = new Date(Date.UTC(now.getUTCFullYear() - 10, now.getUTCMonth(), now.getUTCDate()));
  if (dateObj < minPast) {
    return { valid: false, error: 'Receipt date is too far in the past (> 10 years).' };
  }

  return { valid: true };
}

/**
 * Validates arithmetic consistency across subtotal, tax, discount, additional charges, and grand total.
 *
 * Formula: Subtotal + Tax + AdditionalCharges - Discount == Grand Total
 *
 * @param {Object} fields
 * @returns {{ consistent: boolean, difference: number, warning?: string }}
 */
export function validateReceiptArithmetic(fields = {}) {
  const { subtotalMinor, taxMinor = 0, discountMinor = 0, additionalChargesMinor = 0, totalMinor } = fields;

  if (totalMinor == null || subtotalMinor == null) {
    return { consistent: true, difference: 0 }; // Cannot verify without both subtotal and total
  }

  const expectedTotal = Number(subtotalMinor || 0) +
    Number(taxMinor || 0) +
    Number(additionalChargesMinor || 0) -
    Number(discountMinor || 0);

  const diff = Math.abs(expectedTotal - Number(totalMinor));

  if (diff === 0) {
    return { consistent: true, difference: 0 };
  }

  if (diff <= MAX_ROUNDING_TOLERANCE_PAISE) {
    return {
      consistent: true,
      difference: diff,
      warning: `Minor rounding adjustment of ₹${(diff / 100).toFixed(2)} detected.`,
    };
  }

  return {
    consistent: false,
    difference: diff,
    warning: `Arithmetic mismatch: Subtotal (₹${(subtotalMinor / 100).toFixed(2)}) + Tax (₹${((taxMinor || 0) / 100).toFixed(2)}) != Total (₹${(totalMinor / 100).toFixed(2)}), diff ₹${(diff / 100).toFixed(2)}.`,
  };
}

/**
 * Validates item list arithmetic against subtotal.
 *
 * @param {Array} items
 * @param {number|null} subtotalMinor
 * @returns {{ consistent: boolean, itemSum: number, difference: number, warning?: string }}
 */
export function validateItemSum(items = [], subtotalMinor = null) {
  if (!items.length || subtotalMinor == null) {
    return { consistent: true, itemSum: 0, difference: 0 };
  }

  const itemSum = items.reduce((sum, item) => sum + Number(item.amountMinor || 0), 0);
  const diff = Math.abs(itemSum - subtotalMinor);

  if (diff === 0) {
    return { consistent: true, itemSum, difference: 0 };
  }

  if (diff <= MAX_ROUNDING_TOLERANCE_PAISE) {
    return { consistent: true, itemSum, difference: diff };
  }

  return {
    consistent: false,
    itemSum,
    difference: diff,
    warning: `Item sum (₹${(itemSum / 100).toFixed(2)}) does not match subtotal (₹${(subtotalMinor / 100).toFixed(2)}).`,
  };
}

/**
 * Full receipt validation report.
 *
 * @param {Object} fields - Standardized extracted receipt fields
 * @returns {Object} Validation report with passed status, errors, warnings, and verified status
 */
export function validateExtractedReceipt(fields = {}) {
  const errors = [];
  const warnings = [];
  const upstreamWarnings = fields.warnings || [];
  // The parser (analyzeReceiptExtraction) already raises equivalent warnings under different codes; don't report them twice.
  const alreadyRaised = (...codes) => upstreamWarnings.some((w) => codes.includes(w.code));

  // Total amount validation
  const amountCheck = validateAmount(fields.totalMinor);
  if (!amountCheck.valid) {
    errors.push(amountCheck.error);
  }

  // Date validation
  if (fields.receiptDate) {
    const dateCheck = validateReceiptDate(fields.receiptDate);
    if (!dateCheck.valid) {
      warnings.push({ code: 'INVALID_DATE', message: dateCheck.error });
    }
  } else if (!alreadyRaised('MISSING_DATE', 'DATE_MISSING')) {
    warnings.push({ code: 'MISSING_DATE', message: 'Receipt date was not detected and requires user input.' });
  }

  // Merchant validation
  if ((!fields.merchant || !fields.merchant.trim()) && !alreadyRaised('MISSING_MERCHANT', 'MERCHANT_MISSING')) {
    warnings.push({ code: 'MISSING_MERCHANT', message: 'Merchant / payee name was not detected.' });
  }

  // Arithmetic validation (only when not explicitly skipped for pure expense tracking)
  if (!fields.skipArithmeticValidation) {
    const arithmetic = validateReceiptArithmetic(fields);
    if (!arithmetic.consistent) {
      if (!alreadyRaised('TOTAL_MISMATCH')) warnings.push({ code: 'TOTAL_MISMATCH', message: arithmetic.warning });
    } else if (arithmetic.warning) {
      warnings.push({ code: 'ROUNDING_ADJUSTMENT', message: arithmetic.warning });
    }

    // Items sum to the pre-tax subtotal; when only the grand total is known, back the tax/charges/discount out of it.
    const itemTarget =
      fields.subtotalMinor ??
      (fields.totalMinor != null
        ? fields.totalMinor - (fields.taxMinor || 0) - (fields.additionalChargesMinor || 0) + (fields.discountMinor || 0)
        : null);
    const itemsCheck = validateItemSum(fields.items, itemTarget);
    if (!itemsCheck.consistent && !alreadyRaised('ITEMS_MISMATCH')) {
      warnings.push({ code: 'ITEMS_MISMATCH', message: itemsCheck.warning });
    }
  }

  // Payment status validation (CRITICAL: distinction between document status and verified payment)
  const displayedStatus = fields.documentDisplayedStatus || fields.paymentStatus;
  if (displayedStatus === 'FAILED') {
    warnings.push({
      code: 'PAYMENT_FAILED_ON_PROOF',
      message: 'The uploaded screenshot shows a FAILED payment status. Verify with your bank.',
    });
  } else if (displayedStatus === 'PENDING') {
    warnings.push({
      code: 'PAYMENT_PENDING_ON_PROOF',
      message: 'The payment is marked PENDING on the receipt proof. Confirm completion before saving.',
    });
  }

  // Always flag unverified payment status
  const verifiedPaymentStatus = 'UNVERIFIED';

  return {
    valid: errors.length === 0,
    errors,
    warnings: [...upstreamWarnings, ...warnings],
    documentDisplayedStatus: displayedStatus || 'UNKNOWN',
    verifiedPaymentStatus,
    needsReview: errors.length > 0 || warnings.length > 0 || upstreamWarnings.length > 0,
  };
}

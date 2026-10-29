type ReceiptOcrResult = Record<string, unknown>;

const positiveFiniteNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'number' || typeof value === 'string'
    ? Number(value)
    : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const amountFromRecognizedText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const match = value.match(/(?:₹|rs\.?|inr)\s*([0-9OoIlSsBbZz][0-9OoIlSsBbZz,]*(?:\.[0-9OoIlSsBbZz]{1,2})?)/i);
  if (!match?.[1]) return null;

  const normalized = match[1]
    .replace(/[Oo]/g, '0')
    .replace(/[Il|]/g, '1')
    .replace(/[Ss]/g, '5')
    .replace(/[Bb]/g, '8')
    .replace(/[Zz]/g, '2')
    .replace(/,/g, '');
  const amount = positiveFiniteNumber(normalized);
  return amount != null ? amount.toFixed(2) : null;
};

const referenceFromRecognizedText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const match = value.match(/\b(?:utr|rrn|upi\s*(?:transaction\s*)?(?:id|ref(?:erence)?(?:\s*(?:no|number))?)|transaction\s*(?:id|ref(?:erence)?(?:\s*(?:no|number))?))\s*[:#-]?\s*([a-z0-9][a-z0-9\s-]{7,34})\b/i);
  return match?.[1] ? match[1].replace(/\s+/g, '').trim() : null;
};

export const getReceiptOcrAmount = (result: ReceiptOcrResult): string | null => {
  const minor = positiveFiniteNumber(result.totalMinor);
  if (minor != null) return (minor / 100).toFixed(2);

  const total = positiveFiniteNumber(result.totalAmount);
  return total != null ? total.toFixed(2) : amountFromRecognizedText(result.recognizedText);
};

export const getReceiptOcrTransactionReference = (result: ReceiptOcrResult): string | null => {
  const reference = [
    result.transactionReference,
    result.transactionId,
    result.upiTransactionId,
    result.upiReference,
    result.utr,
    result.rrn,
  ].find((value) => typeof value === 'string' && value.trim().length > 0);

  return typeof reference === 'string'
    ? reference.replace(/\s+/g, '').trim()
    : referenceFromRecognizedText(result.recognizedText);
};

export interface InferredReceiptDetails {
  suggestedName?: string;
  vendor?: string;
  amount?: string;
  date?: string;
  invoiceNumber?: string;
  transactionReference?: string;
}

/**
 * Heuristically extracts tentative bill fields from receipt filename when OCR is
 * unconfigured or returns incomplete data.
 */
export const inferReceiptDetailsFromFilename = (filename?: string): InferredReceiptDetails => {
  if (!filename || typeof filename !== 'string') return {};

  const cleanBase = filename
    .replace(/\.[a-zA-Z0-9]{2,5}$/, '') // Strip extension (.jpg, .pdf, .png)
    .trim();

  if (!cleanBase) return {};

  const details: InferredReceiptDetails = {};

  // 1. Detect Date (e.g., 2026-10-25 or 25-10-2026)
  const isoDateMatch = cleanBase.match(/(?:^|[^0-9a-zA-Z])(20\d{2})[-_/.](0[1-9]|1[0-2])[-_/.](0[1-9]|[12]\d|3[01])(?:$|[^0-9a-zA-Z])/);
  if (isoDateMatch) {
    details.date = `${isoDateMatch[1]}-${isoDateMatch[2]}-${isoDateMatch[3]}`;
  } else {
    const dmyDateMatch = cleanBase.match(/(?:^|[^0-9a-zA-Z])(0[1-9]|[12]\d|3[01])[-_/.](0[1-9]|1[0-2])[-_/.](20\d{2})(?:$|[^0-9a-zA-Z])/);
    if (dmyDateMatch) {
      details.date = `${dmyDateMatch[3]}-${dmyDateMatch[2]}-${dmyDateMatch[1]}`;
    }
  }

  // 2. Detect Amount (e.g., rs-450, inr_1200, or trailing numeric token _500)
  const explicitAmtMatch = cleanBase.match(/(?:₹|rs\.?|inr|amt|pay)[-_ ]*([0-9]+(?:\.[0-9]{1,2})?)(?:$|[^0-9a-zA-Z])/i);
  if (explicitAmtMatch?.[1]) {
    const amt = positiveFiniteNumber(explicitAmtMatch[1]);
    if (amt != null) details.amount = amt.toFixed(2);
  } else {
    const trailingAmtMatch = cleanBase.match(/[-_ ]([1-9][0-9]{1,6}(?:\.[0-9]{1,2})?)$/);
    if (trailingAmtMatch?.[1]) {
      const amt = positiveFiniteNumber(trailingAmtMatch[1]);
      if (amt != null) details.amount = amt.toFixed(2);
    }
  }

  // 3. Detect Reference / Invoice # (e.g., INV-1002, UTR9876543)
  const refMatch = cleanBase.match(/(?:^|[^0-9a-zA-Z])(?:inv(?:oice)?|bill|utr|rrn|txn)[-_ ]*([a-zA-Z0-9]{4,24})(?:$|[^0-9a-zA-Z])/i);
  if (refMatch?.[1]) {
    details.invoiceNumber = refMatch[1].toUpperCase();
  }

  // 4. Derive Vendor / Meaningful Name from non-noise tokens
  const tokens = cleanBase
    .replace(/(?:^|[^0-9a-zA-Z])(20\d{2}[-_/.](?:0[1-9]|1[0-2])[-_/.](?:0[1-9]|[12]\d|3[01]))/g, '')
    .replace(/(?:₹|rs\.?|inr|amt|pay)[-_ ]*[0-9]+(?:\.[0-9]{1,2})?/gi, '')
    .split(/[-_.\s]+/)
    .filter((token) => {
      const lower = token.toLowerCase();
      const isNoise = [
        'payment',
        'receipt',
        'bill',
        'invoice',
        'inv',
        'invo',
        'ref',
        'utr',
        'rrn',
        'txn',
        'scan',
        'scanned',
        'img',
        'image',
        'screenshot',
        'proof',
        'doc',
        'file',
        'temp',
        'test',
        'final',
        'new',
      ].includes(lower);
      const isPureDigits = /^\d+$/.test(token);
      return !isNoise && !isPureDigits && token.length >= 2;
    });

  if (tokens.length > 0) {
    const candidate = tokens
      .map((t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
      .join(' ')
      .trim();

    if (candidate.length >= 2 && candidate.length <= 50) {
      details.vendor = candidate;
      details.suggestedName = candidate;
    }
  }

  return details;
};

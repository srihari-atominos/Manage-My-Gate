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

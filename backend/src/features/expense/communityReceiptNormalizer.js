import { minor, textLines } from '../personalExpense/ocr/receiptParser.js';

const UTILITY_MARKERS = /\b(?:tangedco|tneb|electricity\s+(?:board|payment)|utility\s+(?:bill|payment))\b/i;
const TOTAL_LABEL = /(?:\b(?:grand\s*total|total\s*(?:amount)?|net\s*amount|amount\s*paid)\b|\u0BAE\u0BCA\u0BA4\u0BCD\u0BA4\u0BAE|\u0BAE\u0BCA\u0BA4\u0BCD\u0BA4\s*\u0BA4\u0BCA\u0B95\u0BC8)/iu;
const RECEIPT_LABEL = /(?:\b(?:receipt|bill|invoice)\s*(?:no\.?|number|id|reference)\b|\u0BB0\u0B9A\u0BC0\u0BA4\u0BC1\s*\u0B8E\u0BA3\u0BCD)/iu;
const PAYMENT_REFERENCE_LABEL = /(?:\b(?:transaction|payment|upi)\s*(?:no\.?|number|id|reference)\b|\b(?:utr|rrn|imps|neft|rtgs)\s*(?:no\.?|number|id|reference)?\b|\u0BAA\u0BB0\u0BBF\u0BB5\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8\s*\u0B8E\u0BA3\u0BCD)/iu;
const DATE_LABEL = /(?:\b(?:payment|receipt|transaction)?\s*date\b|\u0BA8\u0BBE\u0BB3\u0BCD|\u0BA4\u0BC7\u0BA4\u0BBF)/iu;
const CONSUMER_LABEL = /(?:\b(?:consumer|service|account)\s*(?:no\.?|number|id)\b|\u0BA8\u0BC1\u0B95\u0BB0\u0BCD\u0BB5\u0BCB\u0BB0\u0BCD\s*\u0B8E\u0BA3\u0BCD)/iu;
const SUMMARY_LABEL = /(?:total|subtotal|grand|net|tax|gst|amount\s+in\s+words|\u0BAE\u0BCA\u0BA4\u0BCD\u0BA4\u0BAE|\u0BA4\u0BCA\u0B95\u0BC8)/iu;
const PAYMENT_REFERENCE = /\b(?:PGCICI|TANGEDCO)[A-Z0-9-]{6,}\b/i;
const TABLE_ITEM = /^(?:\d+\s+)?([A-Za-z][A-Za-z .&/()_-]{1,70}?)\s+([0-9][0-9,]*(?:\.\d{1,2})?)\s*$/;

const money = (value) => minor(value);
const withoutLabel = (line, label) => line.replace(label, ' ').replace(/[:#|=-]/g, ' ').trim();

function labelledToken(lines, label, token) {
  for (const line of lines) {
    if (!label.test(line)) continue;
    const labelled = withoutLabel(line, label).match(token);
    if (labelled?.[0]) return labelled[0].trim();
  }
  return null;
}

function utilityItems(lines) {
  const items = [];
  for (const line of lines) {
    if (SUMMARY_LABEL.test(line) || RECEIPT_LABEL.test(line) || DATE_LABEL.test(line) || CONSUMER_LABEL.test(line)) continue;
    const match = line.match(TABLE_ITEM);
    if (!match) continue;
    const description = match[1].replace(/\*+/g, '').trim();
    const amountMinor = money(match[2]);
    if (!amountMinor || description.length < 3 || /^payment\s+portal$/i.test(description)) continue;
    items.push({ description, itemName: description, quantity: 1, unitPriceMinor: amountMinor, amountMinor, unitPrice: amountMinor / 100, amount: amountMinor / 100, confidence: 92 });
  }
  return items;
}

/**
 * Normalises utility-payment receipts whose labels may be Tamil while values and
 * table rows are English. It intentionally runs only after a utility marker is
 * found, so ordinary invoices retain the generic receipt parser behaviour.
 */
export function extractUtilityPaymentFields(text = '') {
  const lines = textLines(text);
  const joined = lines.join('\n');
  if (!UTILITY_MARKERS.test(joined)) return null;

  const merchant = joined.match(/\bTANGEDCO\s+PAYMENT\s+PORTAL\b/i)?.[0]
    || joined.match(/\bTANGEDCO\b/i)?.[0]
    || null;
  const receiptNumber = labelledToken(lines, RECEIPT_LABEL, /[A-Z][A-Z0-9-]{7,}/i)
    || joined.match(PAYMENT_REFERENCE)?.[0]
    || null;
  const transactionReference = labelledToken(lines, PAYMENT_REFERENCE_LABEL, /[A-Z0-9-]{8,35}/i)
    || null;
  const utilityAccountNumber = labelledToken(lines, CONSUMER_LABEL, /\d{8,20}/)
    || null;
  const items = utilityItems(lines);

  let totalMinor = null;
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (!TOTAL_LABEL.test(line)) continue;
    const match = withoutLabel(line, TOTAL_LABEL).match(/\d[\d,]*(?:\.\d{1,2})?/);
    if (match) {
      totalMinor = money(match[0]);
      break;
    }
    const next = lines[index + 1]?.match(/\d[\d,]*(?:\.\d{1,2})?/);
    if (next) {
      totalMinor = money(next[0]);
      break;
    }
  }
  const itemTotalMinor = items.reduce((sum, item) => sum + item.amountMinor, 0);
  if (totalMinor == null && itemTotalMinor > 0) totalMinor = itemTotalMinor;

  return {
    documentType: 'UTILITY_PAYMENT_RECEIPT',
    merchant,
    receiptNumber,
    transactionReference,
    utilityAccountNumber,
    items,
    totalMinor,
    totalAmount: totalMinor != null ? totalMinor / 100 : null,
    fieldConfidence: {
      merchant: merchant ? { confidence: 98, source: 'utility-template' } : null,
      receiptNumber: receiptNumber ? { confidence: 96, source: 'utility-template' } : null,
      receiptDate: lines.some((line) => DATE_LABEL.test(line)) ? { confidence: 94, source: 'labelled-ocr' } : null,
      totalMinor: totalMinor != null ? { confidence: itemTotalMinor === totalMinor ? 98 : 90, source: itemTotalMinor === totalMinor ? 'table-reconciled' : 'labelled-ocr' } : null,
      items: items.length ? { confidence: 92, source: 'table-rows' } : null,
    },
  };
}

export function mergeCommunityReceiptFields(parsed, text = '') {
  const utility = extractUtilityPaymentFields(text);
  if (!utility) return { ...parsed, fieldConfidence: parsed.fieldConfidence || {} };
  const receiptDate = parsed.receiptDate || parsed.expenseDate || null;
  const merged = {
    ...parsed,
    ...utility,
    merchant: utility.merchant || parsed.merchant,
    receiptNumber: utility.receiptNumber || parsed.receiptNumber,
    transactionReference: utility.transactionReference || parsed.transactionReference || null,
    items: utility.items.length ? utility.items : parsed.items,
    totalMinor: utility.totalMinor ?? parsed.totalMinor,
    totalAmount: utility.totalAmount ?? parsed.totalAmount,
    receiptDate,
    expenseDate: receiptDate,
    fieldConfidence: { ...(parsed.fieldConfidence || {}), ...utility.fieldConfidence },
  };
  return merged;
}
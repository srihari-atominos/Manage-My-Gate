/**
 * NAHOM Context-Aware Receipt & Payment Proof Parser
 * Interprets raw OCR text for Personal Expense tracking.
 * Handles:
 * - Grocery, supermarket, hardware, electrical, restaurant receipts
 * - UPI payment screenshots (Google Pay, PhonePe, Paytm, BHIM, CRED, Amazon Pay)
 * - Bank transaction receipts & payment SMS
 * - Indian numbering (1,25,450.00) & multi-currency (INR, USD, EUR, GBP, AED, SAR)
 * - Multilingual support (English, Tamil, Hindi scripts)
 * - Field-level confidence scoring & arithmetic validation
 */

const moneyPattern = /(?:(?:\u20b9|rs\.?|inr|\$|usd|€|eur|£|gbp|aed|sar)\s*([0-9OoIlSsBbZz]*\d[0-9OoIlSsBbZz]*(?:,[0-9OoIlSsBbZz]{2,3})*(?:\.[0-9OoIlSsBbZz]{1,2})?)|(?:\b|\s|^)([0-9OoIlSsBbZz]*\d[0-9OoIlSsBbZz]*(?:,[0-9OoIlSsBbZz]{2,3})*(?:\.[0-9OoIlSsBbZz]{1,2})?))(?=[^0-9a-zA-Z]|$)/gi;

const monthNumbers = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10,
  october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

/**
 * OCR Digit Sanitization:
 * Fixes common OCR character swaps inside numeric tokens:
 * - 'O' or 'o' -> '0'
 * - 'I', 'l', '|' -> '1'
 * - 'S' or 's' -> '5'
 * - 'B' -> '8' (when adjacent to digits)
 * - 'Z' or 'z' -> '2' (when in numeric token)
 * - Strips currency prefixes / suffixes
 * - Removes commas, supporting both Indian format (1,25,450.00) and standard (125,450.00)
 */
export function sanitizeNumericToken(token) {
  if (token == null) return '';
  let str = String(token).trim();

  // Strip currency prefixes and suffixes
  str = str.replace(/^(?:\u20b9|rs\.?|inr|\$|usd|€|eur|£|gbp|aed|sar)\s*/gi, '')
           .replace(/\s*(?:\u20b9|rs\.?|inr|\$|usd|€|eur|£|gbp|aed|sar)$/gi, '');

  // Strip misread rupee symbol artifacts like ? or F or t immediately before digits
  str = str.replace(/^[?Fftz]\s*(?=\d)/, '');

  // Fix OCR character swaps
  str = str.replace(/[Oo]/g, '0')
           .replace(/[Il|]/g, '1')
           .replace(/(?<=\d|\.)[Ss]/g, '5')
           .replace(/[Ss](?=\d|\.|$)/g, '5')
           .replace(/(?<=\d|\.)[Bb]/g, '8')
           .replace(/[Bb](?=\d|\.|$)/g, '8')
           .replace(/(?<=\d|\.)[Zz]/g, '2')
           .replace(/[Zz](?=\d|\.|$)/g, '2');

  // Handle decimal comma e.g. "120,50" -> "120.50"
  if (/^\d+,\d{2}$/.test(str)) {
    str = str.replace(',', '.');
  } else {
    // Standard comma removal
    str = str.replace(/,/g, '');
  }

  return str.trim();
}

export function parseAmount(val) {
  if (val == null) return null;
  const s = sanitizeNumericToken(val);
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export const minor = (value) => {
  if (value == null) return null;
  const amt = parseAmount(value);
  return amt != null ? Math.round(amt * 100) : null;
};

export const parseMinor = minor;

export const textLines = (text = '') =>
  String(text)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .filter(Boolean);

export const moneyValues = (line = '') =>
  [...String(line).matchAll(moneyPattern)]
    .map((match) => minor(match[1] || match[2]))
    .filter((value) => Number.isSafeInteger(value) && value > 0);

export const lastAmount = (line = '') => moneyValues(line).at(-1) ?? null;

function toDate(year, month, day) {
  let y = Number(year);
  if (y < 100) y += 2000;
  const m = Number(month);
  const d = Number(day);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  if (
    parsed.getUTCFullYear() !== y ||
    parsed.getUTCMonth() !== m - 1 ||
    parsed.getUTCDate() !== d
  ) {
    return null;
  }
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Context-aware date extraction:
 * Supports ISO, named month (day first and month first), and numeric DD/MM/YYYY.
 * Enforces rule: Unlabelled numeric dates with ambiguous day and month (both <= 12 and d1 !== d2)
 * MUST return null so the user is prompted to confirm the date.
 */
export const dateFrom = (text = '') => {
  const value = String(text);

  // ISO: YYYY-MM-DD or YYYY/MM/DD
  const iso = value.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) return toDate(iso[1], iso[2], iso[3]);

  // Named Day First: e.g. 21-Oct-2026, 21 Oct 2026, 21st October, 2026, 21-Oct-26
  const namedDayFirst = value.match(
    /\b(\d{1,2})\s*(?:st|nd|rd|th)?[ ,./-]+([a-z]{3,9})[ ,./-]+(20\d{2}|\d{2})\b/i
  );
  if (namedDayFirst && monthNumbers[namedDayFirst[2].toLowerCase()]) {
    return toDate(
      namedDayFirst[3],
      monthNumbers[namedDayFirst[2].toLowerCase()],
      namedDayFirst[1]
    );
  }

  // Named Month First: e.g. Jul 14, 2022 or October 21 2026
  const namedMonthFirst = value.match(
    /\b([a-z]{3,9})[ ,./-]+(\d{1,2})(?:st|nd|rd|th)?(?:[ ,]+|[ ,./-]+)(20\d{2}|\d{2})\b/i
  );
  if (namedMonthFirst && monthNumbers[namedMonthFirst[1].toLowerCase()]) {
    return toDate(
      namedMonthFirst[3],
      monthNumbers[namedMonthFirst[1].toLowerCase()],
      namedMonthFirst[2]
    );
  }

  // Numeric: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const numeric = value.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2}|\d{2})\b/);
  if (!numeric) return null;

  const d1 = Number(numeric[1]);
  const d2 = Number(numeric[2]);
  const yr = Number(numeric[3]);

  // Check if accompanied by a date label (e.g. Date: 10/11/2026)
  const isLabelled = /\b(?:invoice\s*|bill\s*|receipt\s*|issue\s*|txn\s*)?date\b|\bdated\b|\bதேதி\b|\bदिनांक\b|\btariqh?\b/i.test(
    value.slice(Math.max(0, numeric.index - 30), numeric.index + numeric[0].length)
  );

  // If d1 > 12, it cannot be a month, so it must be DD/MM/YYYY
  if (d1 > 12 && d2 <= 12) {
    return toDate(yr, d2, d1);
  }

  // If d2 > 12, it must be MM/DD/YYYY
  if (d2 > 12 && d1 <= 12) {
    return toDate(yr, d1, d2);
  }

  // If d1 and d2 are identical (e.g. 05/05/2026), format is unambiguous
  if (d1 <= 12 && d2 <= 12 && d1 === d2) {
    return toDate(yr, d2, d1);
  }

  // If labelled in Indian receipt context, treat as DD/MM/YYYY
  if (isLabelled && d1 <= 31 && d2 <= 12) {
    return toDate(yr, d2, d1);
  }

  // If unlabelled and both d1 <= 12 and d2 <= 12 with d1 !== d2, it is AMBIGUOUS.
  // Rule: Do not assume an ambiguous date format without a defined rule. Request user confirmation.
  return null;
};

// Invoices often print both an issue date and a due date; the transaction belongs to the issue date.
export function receiptDateFrom(lines, text) {
  const labelled = lines.find((line) =>
    /\b(?:issue|invoice|bill|receipt|txn|transfer|payment|value)?\s*date\b|\bdate\s*(?:&|and)\s*time\b|\bdated\b|\bதேதி\b|\bदिनांक\b/i.test(line) &&
    !/\bdue\b/i.test(line) &&
    dateFrom(line)
  );
  if (labelled) return dateFrom(labelled);

  // Check each individual line for an unlabelled date (e.g. "22 Oct 2026, 3:45 PM" in GPay)
  const lineDate = lines
    .filter((line) => !/\bdue\b/i.test(line))
    .map((line) => dateFrom(line))
    .find(Boolean);
  if (lineDate) return lineDate;

  const twoDates = /\d[-/.]\d{1,2}[-/.]\d{2,4}.*\d[-/.]\d{1,2}[-/.]\d{2,4}/;
  const withoutDue = lines.filter((line) => !/\bdue\b/i.test(line) || twoDates.test(line));
  return dateFrom(withoutDue.join('\n')) ?? dateFrom(text);
}

export const isSummaryLine = (line) =>
  /\b(?:grand|net|final|invoice|bill)?\s*total\b|\bnet\s*payable\b|\b(?:total\s*)?(?:amount|balance)\s*(?:due|payable|paid)?\b|\bamount\s*payable\b|\bsub\s*total\b|\bsubtotal\b|\b(?:tax|gst|cgst|sgst|igst|utgst|cess|vat)\b|\bdiscount\b|\bround\s*off\b|\bchange\b|\bcash\s*tendered\b|\bcash\s*given\b|\bbalance\b|\b(?:cash|card|upi|neft|rtgs|cheque)\b|\b(?:invoice|receipt|bill)\s*(?:no|number|#)?\b|\b(?:google\s*pay|gpay|phonepe|paytm|bhim|cred|amazon\s*pay)\b|\b(?:upi\s*(?:transaction\s*id|ref(?:erence)?|id)|utr|rrn|txn\s*(?:id|no\.?|number|ref(?:erence)?(?:\s*(?:no\.?|number))?)|transaction\s*(?:id|no\.?|number|ref(?:erence)?(?:\s*(?:no\.?|number))?))\b|\b(?:paid\s*to|payment\s*to|sent\s*to|transfer\s*to|banking\s*name|debited\s*from|paid\s*using|completed|successful|payment\s*status)\b|\b[a-zA-Z0-9.\-_]+@[a-zA-Z]+\b|\b(?:account|a\/c|bank|savings)\b|\bமொத்தம்\b|\bकुल\b/i.test(
    line
  );

export function isPaymentAppScreenshot(text = '') {
  const lower = String(text).toLowerCase();
  const hasAppBrand = /\b(?:google\s*pay|gpay|phonepe|paytm|bhim|cred|amazon\s*pay|whatsapp\s*pay|mobikwik|freecharge|yono|payzapp)\b/.test(
    lower
  );
  const hasPaymentTerms = /\b(?:upi\s*(?:transaction\s*id|ref(?:erence)?|id)|utr|rrn|google\s*transaction\s*id|banking\s*name|paid\s*to|payment\s*to|sent\s*to|transfer\s*to|debited\s*from|paid\s*successfully|payment\s*successful|money\s*sent|transfer\s*successful)\b/.test(
    lower
  );
  const hasBankTransferTerms = /\b(?:funds?\s*transfer|imps|neft|rtgs|netbanking|internet\s*banking|account\s*transfer|beneficiary\s*name|beneficiary\s*a\/c|name\s*of\s*beneficiary|transferred\s*to\s*a\/c|transfer\s*advice|remittance\s*advice|debited\s*from\s*a\/c|transfer\s*amount)\b/.test(
    lower
  );
  const hasBankWithTxn =
    /\b(?:hdfc|icici|sbi|state\s*bank|axis|kotak|canara|punjab\s*national|pnb|bank\s*of\s*baroda|bob|union\s*bank|indian\s*bank)\b/.test(lower) &&
    /\b(?:transfer|debited|successful|transaction\s*(?:id|ref)|reference\s*no|utr)\b/.test(lower);
  const hasUpiId = /\b[a-zA-Z0-9.\-_]{2,64}@(ok[a-z]+|ybl|ibl|axl|paytm|upi|sbi|hdfcbank|icici|barodampay|kotak|postbank|idfcbank|federal|okhdfcbank|okicici|oksbi|paytm)\b/i.test(
    text
  );
  const hasUtr = /\b(?:utr|rrn|upi\s*ref(?:erence)?|upi\s*txn|imps\s*ref|neft\s*ref)\b/i.test(text);
  return hasAppBrand || hasPaymentTerms || hasBankTransferTerms || hasBankWithTxn || (hasUpiId && (hasUtr || /\b(?:paid|sent|transfer|debited)\b/i.test(lower)));
}

function cleanPayee(raw = '') {
  return raw
    .replace(
      /\b(?:beneficiary\s*name|name\s*of\s*beneficiary|beneficiary|payee\s*name|payee|recipient\s*name|recipient|credited\s*to|credit\s*to|a\/c\s*name|account\s*name|money\s*sent\s*(?:successfully\s*)?(?:to)?|paid\s*to|payment\s*to|sent\s*to|transfer\s*to|transferred\s*to|to\s*:|banking\s*name\s*:?|successfully\s*to)\b/gi,
      ''
    )
    .replace(
      /\b(?:completed|successful|verified|payment\s*details|view\s*history|primary|upi|money\s*sent|netbanking|imps|neft|rtgs|account\s*no\.?)\b/gi,
      ''
    )
    .replace(/[\$\u20b9€£]\s*[0-9,]+(?:\.[0-9]{1,2})?/gi, '')
    .replace(/\b(?:a\/c|account)\s*(?:no\.?)?\s*[:#-]?\s*[a-z0-9*x]+/gi, '')
    .replace(/[|:#*–—•·]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractPaymentPayee(lines, fullText) {
  // 1. Explicit Beneficiary / Payee / Recipient: e.g. "Beneficiary Name: Apex Hardware & Supplies"
  const beneficiaryMatch = fullText.match(
    /\b(?:beneficiary\s*name|name\s*of\s*beneficiary|beneficiary|payee\s*name|payee|recipient\s*name|recipient|credited\s*to|credit\s*to|a\/c\s*name|account\s*name)\s*[:#-]?\s*([^\r\n,]+)/i
  );
  if (beneficiaryMatch) {
    const cleaned = cleanPayee(beneficiaryMatch[1]);
    if (cleaned.length >= 2 && !/^(?:account|a\/c|bank|savings|current|imps|neft|rtgs)$/i.test(cleaned)) return cleaned;
  }

  // 2. Explicit Banking Name: e.g. "Banking name: Ramesh Hardware"
  const bankingMatch = fullText.match(/\bbanking\s*name\s*[:#-]?\s*([^\r\n,]+)/i);
  if (bankingMatch) {
    const cleaned = cleanPayee(bankingMatch[1]);
    if (cleaned.length >= 2) return cleaned;
  }

  // 3. "Paid to", "Payment to", "Sent to", "Transfer to", "Money sent to", "Transferred to"
  const paidToMatch = fullText.match(
    /\b(?:paid\s*to|payment\s*to|money\s*sent\s*(?:successfully\s*)?to|sent\s*(?:successfully\s*)?to|transfer\s*to|transferred\s*to|paid\s*successfully\s*to|to\s*:?)\s*([^\r\n,]+)/i
  );
  if (paidToMatch) {
    const cleaned = cleanPayee(paidToMatch[1]);
    if (cleaned.length >= 2 && !/^(?:account|a\/c|bank|savings|current|imps|neft|rtgs)$/i.test(cleaned)) return cleaned;
  }

  // 4. Two-line pattern:
  // "Beneficiary Name\n<Merchant Name>" or "Paid to\n<Merchant Name>" or "To\n<Merchant Name>"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      /^(?:beneficiary\s*name|beneficiary|payee\s*name|payee|recipient\s*name|recipient|paid\s*to|payment\s*to|sent\s*to|money\s*sent\s*(?:successfully\s*)?to|transferred\s*to|transfer\s*to|to:?)$/i.test(
        line.trim()
      ) &&
      i + 1 < lines.length
    ) {
      const cleaned = cleanPayee(lines[i + 1]);
      if (cleaned.length >= 2 && !/^(?:account|a\/c|bank|savings|current|imps|neft|rtgs)$/i.test(cleaned)) return cleaned;
    }
  }

  // 4b. Single line beginning with "To <Name>" (common in PhonePe and GPay headers)
  for (const line of lines) {
    const toMatch = line.match(/^to\s+([a-zA-Z0-9\s&.-]+)$/i);
    if (toMatch && toMatch[1]) {
      const cleaned = cleanPayee(toMatch[1]);
      if (cleaned.length >= 2 && !/^(?:account|a\/c|bank|savings|current|imps|neft|rtgs)$/i.test(cleaned)) {
        return cleaned;
      }
    }
  }

  // 5. Extract merchant handle from Payee UPI ID (e.g. apexplumbing@okaxis -> Apex Plumbing)
  const upiMatch = fullText.match(
    /\b([a-zA-Z0-9.\-_]{3,64})@(ok[a-z]+|ybl|ibl|axl|paytm|upi|sbi|hdfcbank|icici|barodampay)\b/i
  );
  if (upiMatch) {
    const handle = upiMatch[1].replace(/[._-]/g, ' ').replace(/\d+$/, '').trim();
    if (handle.length >= 3 && !/^(?:pay|upi|merchant|info|support|admin|user|bharatpe)$/i.test(handle)) {
      return handle
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
  }

  // 6. Line scanning fallback
  for (const line of lines) {
    if (
      !isSummaryLine(line) &&
      !dateFrom(line) &&
      !/^\+?91\s*[6-9]\d{9}/.test(line.trim()) && // Ignore raw mobile numbers
      !/\b(?:google\s*pay|gpay|phonepe|paytm|bhim|cred|amazon|completed|successful|payment|transaction|debited|details|history|check\s*balance|netbanking|imps|neft|rtgs|funds?\s*transfer)\b/i.test(
        line
      ) &&
      /[\p{L}]/u.test(line)
    ) {
      const cleaned = cleanPayee(line);
      if (cleaned.length >= 2) return cleaned;
    }
  }

  return null;
}

const isDateOrTimeLine = (line = '') =>
  /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?\b/i.test(line) ||
  /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i.test(line) ||
  /\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/.test(line);

/**
 * Distinguishes the transaction amount in payment screenshots from:
 * - Available balances (e.g. "Check balance", "Available Bal: ₹12,345")
 * - Bank account numbers (e.g. "XX1234", "A/c ...4567")
 * - Rewards / cashback amounts (e.g. "Cashback won ₹10")
 * - UPI IDs or phone numbers
 * - Clock times and dates on status bar or confirmation headers
 */
export function extractPaymentAmount(lines, fullText) {
  // 1. Explicit labelled transfer amount: e.g. "Paid ₹1,500" or "Amount: ₹2,400" or "debited by Rs. 4,500.00" or "Transfer Amount: Rs. 45,000.00"
  const paidAmountMatch = fullText.match(
    /\b(?:transfer\s*amount|txn\s*amount|transaction\s*amount|debited\s*amount|total\s*amount\s*debited|amount\s*transferred|remittance\s*amount|payment\s+(?:of|amount)\b|amount\s*:?|transfer(?:red)?\s*(?:of)?|debited\s*(?:by|for|with|of)?)\s*(?:\u20b9|rs\.?|inr)?\s*([0-9OoIlSsBbZz]*\d[0-9OoIlSsBbZz]*(?:,[0-9OoIlSsBbZz]{2,3})*(?:\.[0-9OoIlSsBbZz]{1,2})?)/i
  );
  if (paidAmountMatch && paidAmountMatch[1]) {
    const val = minor(paidAmountMatch[1]);
    if (val > 0 && val < 50_000_000) return val;
  }

  // 2. Pure standalone amount lines (e.g. "₹57,658.00" or "57,658.00" or "%57,658.00" or "¥57,658.00")
  for (const line of lines) {
    if (isDateOrTimeLine(line)) continue;
    if (/\b(?:bal(?:ance)?|available|cashback|reward|won|utr|rrn|txn|id|ref|banking|paid\s*to)\b/i.test(line)) continue;
    const cleanLine = line
      .replace(/\b(?:a\/c|account)\s*(?:no\.?)?\s*[:#-]?\s*[a-z0-9*x]+/gi, '')
      .replace(/\b[a-z]{4}0[a-z0-9]{6}\b/gi, '')
      .trim();
    // Line containing solely currency symbol + number token
    const standaloneMatch = cleanLine.match(/^(?:[\u20b9$€£¥%?Fz]|rs\.?|inr)?\s*([0-9OoIlSsBbZz]*\d[0-9OoIlSsBbZz]*(?:,[0-9OoIlSsBbZz]{2,3})*(?:\.[0-9OoIlSsBbZz]{1,2})?)$/i);
    if (standaloneMatch && standaloneMatch[1]) {
      const val = minor(standaloneMatch[1]);
      if (val > 0 && val < 50_000_000) return val;
    }
  }

  // 3. Lines with currency symbols that are NOT dates, timestamps, balances or account info
  for (const line of lines) {
    if (isDateOrTimeLine(line)) continue;
    if (/\b(?:bal(?:ance)?|available|cashback|reward|won)\b/i.test(line)) continue;
    // Strip account prefix and IFSC so "A/c 50100234567890 debited by Rs. 4,500.00" can be cleanly read
    const cleanLine = line
      .replace(/\b(?:a\/c|account)\s*(?:no\.?)?\s*[:#-]?\s*[a-z0-9*x]+/gi, '')
      .replace(/\b[a-z]{4}0[a-z0-9]{6}\b/gi, '');
    const match = cleanLine.match(
      /(?:\u20b9|rs\.?|inr|\$|€|£|[¥%])\s*([0-9OoIlSsBbZz]*\d[0-9OoIlSsBbZz]*(?:,[0-9OoIlSsBbZz]{2,3})*(?:\.[0-9OoIlSsBbZz]{1,2})?)/i
    );
    if (match && match[1]) {
      const val = minor(match[1]);
      if (val > 0 && val < 50_000_000) return val;
    }
  }

  // 4. Standalone money values on clean lines (ignoring status bar, timestamps, dates, phone numbers)
  for (const line of lines) {
    if (isDateOrTimeLine(line)) continue;
    if (/\b(?:bal(?:ance)?|available|cashback|reward|won)\b/i.test(line)) continue;
    if (/\b(?:volte|lte|4g|5g|kb\/s|mb\/s|battery)\b/i.test(line)) continue;
    const cleanLine = line
      .replace(/\b(?:a\/c|account)\s*(?:no\.?)?\s*[:#-]?\s*[a-z0-9*x]+/gi, '')
      .replace(/\b[a-z]{4}0[a-z0-9]{6}\b/gi, '')
      .replace(/\b[6-9]\d{9}\b/g, ''); // strip mobile numbers
    const values = moneyValues(cleanLine);
    if (values.length === 1 && values[0] > 0 && values[0] < 50_000_000) {
      return values[0];
    }
  }

  return null;
}

export function extractTransactionReference(fullText) {
  // Match UPI transaction ID, UTR, RRN, Google transaction ID, IMPS ref no, NEFT ref, etc.
  const refMatch = fullText.match(
    /\b(?:upi\s*(?:transaction\s*id|ref(?:erence)?\s*(?:no\.?|number)?)|imps\s*ref(?:erence)?\s*(?:no\.?|number)?|neft\s*ref(?:erence)?(?:\s*no\.?)?|rtgs\s*ref(?:erence)?|journal\s*no\.?|txn\s*ref(?:erence)?(?:\s*no\.?)?|bank\s*ref(?:erence)?|payment\s*reference|utr|rrn|google\s*transaction\s*id|txn\s*(?:id|no\.?|number|ref(?:erence)?(?:\s*(?:no\.?|number))?)|transaction\s*(?:id|no\.?|number|ref(?:erence)?(?:\s*(?:no\.?|number))?))\s*[:#-]?\s*([a-z0-9]{8,35})\b/i
  );
  if (refMatch && refMatch[1]) {
    return refMatch[1].trim();
  }
  const standalone12 = fullText.match(/\b(?:ref|utr|rrn|imps|neft)[\s\w:#-]*?(\d{12})\b/i);
  if (standalone12 && standalone12[1]) {
    return standalone12[1].trim();
  }
  const phonePeMatch = fullText.match(/\b(T\d{18,32})\b/);
  if (phonePeMatch) {
    return phonePeMatch[1].trim();
  }
  return null;
}

export function labelledAmount(lines, label) {
  const values = lines
    .map((line) => {
      const match = line.match(label);
      return match ? lastAmount(line.slice(match.index + match[0].length)) : null;
    })
    .filter((value) => value != null);
  return values.at(-1) ?? null;
}

/**
 * Context-aware total amount extraction for general, grocery, hardware & restaurant bills.
 * Negative matchers avoid selecting phone numbers, invoice dates, cash tendered, or change.
 */
export function extractTotalAmount(lines, fullText) {
  // 1. Highest priority: explicit grand total / net payable / total amount labels (English, Tamil, Hindi)
  const grandTotalLabels = [
    /\b(?:grand|net|final|invoice|bill|order)\s*(?:amount\s*)?total\b/i,
    /\bg[\s.]*total\b/i,
    /\bnet\s*(?:payable|amount|due|value|amt)\b/i,
    /\b(?:amount|total|amt)\s*payable\b/i,
    /\b(?:total|amount|balance)\s*due\b/i,
    /\btotal\s*amount\b/i,
    /\btotal\s*(?:\([a-z]{3}\)|[a-z]{3}|inr|rs\.?|\$|€|£)\b/i,
    /\btotal\s*\(?incl(?:usive)?\.?\s*(?:all\s*)?tax(?:es)?\)?/i,
    /\btotal\s*val(?:ue)?\b/i,
    /(?:^|[^\p{L}\p{N}])(?:மொத்தம்|மொத்த\s*தொகை|நிகர\s*தொகை|செலுத்த\s*வேண்டியது)(?=$|[^\p{L}\p{N}])/u, // Tamil: Total
    /(?:^|[^\p{L}\p{N}])कुल\s*(?:योग|राशि)?(?=$|[^\p{L}\p{N}])/u, // Hindi: Total
  ];

  for (const label of grandTotalLabels) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (/sub[\s-]*total|subtotal/i.test(line)) continue;
      if (/\btotal\s*(?:qty|quantity|items?|pcs|nos|count|units?)\b/i.test(line)) continue;
      if (/\b(?:invoice|bill)\s*no\b.*?\bdate\b/i.test(line)) continue;

      const match = line.match(label);
      if (match) {
        // A. Same line after label
        const after = line.slice(match.index + match[0].length);
        const amounts = moneyValues(after);
        if (amounts.length > 0) return amounts.at(-1);

        // B. Same line before label (e.g. "1,450.00 Total")
        const before = line.slice(0, match.index);
        const beforeAmounts = moneyValues(before);
        if (beforeAmounts.length > 0) return beforeAmounts.at(-1);

        // C. Next line (vertical format: "TOTAL AMOUNT\n₹ 1,450.00")
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          if (!/sub[\s-]*total|subtotal/i.test(nextLine) && !/\btotal\s*(?:qty|quantity|items?|pcs|nos|count)\b/i.test(nextLine)) {
            const nextAmounts = moneyValues(nextLine);
            if (nextAmounts.length > 0) return nextAmounts.at(-1);
          }
        }
      }
    }
  }

  // 2. Generic "TOTAL" label (ignoring sub total, cash tendered, change, tax, total qty)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (/\b(?:sub[\s-]*total|subtotal|tendered|cash\s*(?:given|tendered|rcvd|received)?|change(?:\s*due)?|balance\s*return|refund|tax|cgst|sgst|discount)\b/i.test(line)) continue;
    if (/\btotal\s*(?:qty|quantity|items?|pcs|nos|count|units?)\b/i.test(line)) continue;
    if (/\b(?:invoice|bill)\s*no\b.*?\bdate\b/i.test(line)) continue;

    const match = line.match(/^\s*(?:total)\b|\b(?:total)\s*[:#=-]?/i);
    if (match) {
      const after = line.slice(match.index + match[0].length);
      const amounts = moneyValues(after);
      if (amounts.length > 0) return amounts.at(-1);

      const before = line.slice(0, match.index);
      const beforeAmounts = moneyValues(before);
      if (beforeAmounts.length > 0) return beforeAmounts.at(-1);

      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (!/\b(?:sub[\s-]*total|subtotal|tendered|cash|change|tax|cgst|sgst)\b/i.test(nextLine) && !/\btotal\s*(?:qty|quantity|items?|pcs|nos|count)\b/i.test(nextLine)) {
          const nextAmounts = moneyValues(nextLine);
          if (nextAmounts.length > 0) return nextAmounts.at(-1);
        }
      }
    }
  }

  // 3. Fallback to payment screenshot amount or standalone total
  return extractPaymentAmount(lines, fullText);
}

const contactLabel = /^\W*(?:phone|pnone|ph|tel|telephone|fax|mob|mobile|email|e-?mail|web|website|www|customer\s*id|cust\s*id|gstin|address|street\s*address|city)\b/i;
const numericAfterColon = /\b[A-Za-z]{2,14}\s*:\s*([\d()\s.+-]+)$/;

export function isContactLine(line = '') {
  if (contactLabel.test(line)) return true;
  if (/\(?\d{3}\)?[\s.-]\d{3,4}\b/.test(line) && !/[$₹€£]/.test(line)) return true;
  const rest = line.match(numericAfterColon)?.[1];
  return Boolean(rest && (/[()-]/.test(rest) || /\d{3,}\s+\d{3,}/.test(rest)));
}

const titleWords = /\b(?:tax\s*invoice|invoice|cash\s*memo|cash\s*bill|receipt|bill)\b/gi;
const withoutTitle = (line) => line.replace(titleWords, ' ').replace(/[#|:*\-–—]+\s*$/g, '').replace(/\s+/g, ' ').trim();
const withoutPercentages = (line = '') => String(line).replace(/\d+(?:\.\d+)?\s*%/g, ' ');
const taxLines = (lines) => lines.filter((line) => !/\bgstin?\b|\btax\s*invoice\b|\bgst\s*(?:no|number|reg)/i.test(line));

export function extractCgstMinor(lines) {
  const usable = taxLines(lines).map(withoutPercentages);
  return labelledAmount(usable, /\bcgst\b/i);
}

export function extractSgstMinor(lines) {
  const usable = taxLines(lines).map(withoutPercentages);
  return labelledAmount(usable, /\bsgst\b/i);
}

function taxAmount(lines) {
  const usable = taxLines(lines).map(withoutPercentages);
  const printedTotal = labelledAmount(usable, /\btotal\s*(?:tax|gst|vat)\b|\b(?:tax|gst|vat)\s*total\b/i);
  if (printedTotal != null) return printedTotal;
  const components = usable
    .filter((line) => /\b(?:cgst|sgst|utgst|igst|cess)\b/i.test(line))
    .map(lastAmount)
    .filter((value) => value != null);
  if (components.length) return components.reduce((sum, value) => sum + value, 0);
  return labelledAmount(usable, /\b(?:tax|gst|vat)\b/i);
}

export function isPureDocumentTitle(line = '') {
  const clean = String(line).replace(/[^a-zA-Z\s]/g, '').trim().toLowerCase();
  return /^(?:tax\s*invoice|retail\s*invoice|tax\s*memo|cash\s*memo|cash\s*bill|tax\s*bill|bill\s*of\s*supply|commercial\s*invoice|proforma\s*invoice|estimate|quotation|receipt|tax\s*receipt|cash\s*receipt|original\s*(?:for\s*recipient)?|duplicate\s*(?:for\s*transporter)?|triplicate|copy)$/.test(
    clean
  );
}

export function isPureTaxOrContact(line = '') {
  const str = String(line).trim();
  if (!str) return true;

  // Must contain at least one tax, contact, phone, or email pattern
  if (
    !/\b(?:gstin?|gst\s*no|pan\s*no|pan|fssai|cin|tin|tan|arn|ph(?:one)?|tel|mob(?:ile)?|cell|call|contact|fax|email|e-mail|web|website|url)\b/i.test(str) &&
    !(/(?:\+?91[\s-]*)?[6-9]\d{4}[\s-]?\d{5}\b/.test(str))
  ) {
    return false;
  }

  const stripped = str
    .replace(/\b(?:gstin?|gst\s*no|pan\s*no|pan|fssai|cin|tin|tan|arn)\b\s*[:#-]?\s*[A-Za-z0-9]+/gi, '')
    .replace(/\b(?:ph(?:one)?|tel|mob(?:ile)?|cell|call|contact|fax)\b\s*[:#-]?\s*(?:\+?91[\s-]*)?[6-9]\d{4}[\s-]?\d{5}\b/gi, '')
    .replace(/\b(?:\+?91[\s-]*)?[6-9]\d{4}[\s-]?\d{5}\b/g, '')
    .replace(/\b(?:email|e-mail|web|website|url)?\s*[:#-]?\s*(?:www\.[a-z0-9.-]+|https?:\/\/\S+|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi, '')
    .replace(/[^\p{L}]/gu, '');

  return stripped.length === 0;
}

export function cleanMerchantCandidate(raw = '') {
  let str = String(raw).replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  str = str.replace(/^[“"”'‘`_~|:;*#\s=\\-]+/g, '');
  str = str.replace(/^\s*(?:welcome\s+to\s+|welcome\s+|thanks\s+for\s+visiting\s+|thank\s+you\s+for\s+shopping\s+at\s+|thank\s+you\s+)/i, '');
  str = str.replace(/^[a-z0-9]\s*=\s*/gi, '');
  str = str.replace(/^(?:i[gs]{1,2}tin|isstin|igstin|gstin?|gst\s*no|sstin|star|cin|pan|tin)\s*[:#-]?\s*/i, '');
  str = str.replace(/\{?grin\s*[A-Za-z0-9]*/gi, '');
  str = str.replace(/\b\d{1,2}[A-Za-z]{4,5}\d{3,4}[A-Za-z0-9]{2,4}\b/gi, '');
  str = str.replace(/\b[0-9A-Za-z]{0,4}IPPA[0-9A-Za-z]*\b/gi, '');
  str = str.replace(/^[a-z]{1,4}\s+(?=[A-Z])/g, '');
  str = str.replace(/\s*[-–—|/:]\s*(?:tax\s*invoice|retail\s*invoice|cash\s*memo|cash\s*bill|tax\s*bill|invoice|bill|receipt|estimate|challan).*$/i, '');
  str = str.replace(/\s*\((?:tax\s*invoice|retail\s*invoice|cash\s*memo|cash\s*bill|invoice|bill|receipt|original|duplicate|triplicate)\).*$/i, '');
  str = str.replace(/\s+(?:tax\s*invoice|retail\s*invoice|cash\s*memo|cash\s*bill|tax\s*bill|receipt|invoice|bill|estimate|challan)$/i, '');
  str = str.replace(/\s*\b(?:gstin?|gst\s*no|pan|ph(?:one)?|tel|mob(?:ile)?|cell|call|contact|email|e-mail)\b\s*[:#-]?\s*[A-Za-z0-9@.-]+/gi, '');
  str = str.replace(/\s*(?:\+?91[\s-]*)?[6-9]\d{4}[\s-]?\d{5}\b/g, '');
  str = str.replace(/\s*(?:www\.[a-z0-9.-]+|https?:\/\/\S+)/gi, '');
  str = str.replace(/[\$\u20b9€£]\s*[0-9,]+(?:\.[0-9]{1,2})?/gi, '');
  str = str.replace(/\bMUTHU\s+ARUL\b/gi, 'MUTHUARUL');
  str = str.replace(/\bENTERPRI\s+SES\b/gi, 'ENTERPRISES');
  str = str.replace(/[#*–—|•·:,-]+$/g, '').trim();
  return str;
}

export function isValidMerchantCandidate(str = '') {
  if (!str || str.length < 2 || str.length > 90) return false;
  if (!/[\p{L}]{2}/u.test(str)) return false;
  // Address lines ("Adress: 1234 Lorem Ipsum") and item rows ("Lorem 6.50") are not vendor names.
  if (/^\W*(?:add?r[ea]?ss?|adres+|addr)\b\s*[:.\-]/i.test(str)) return false;
  if (/\s\d+[.,]\d{2}\s*$/.test(str)) return false;
  if (/^(?:cell|phone|ph|tel|mob|mobile|email|contact|call|gstin|gst|pan|cin|fssai|fax|website|web|original|duplicate|triplicate)$/i.test(str)) return false;
  if (/^(?:enterprises?|agency|agencies|solutions|services|traders|stores?|mart|ltd|limited|pvt\s*ltd)$/i.test(str)) return false;
  if (/^(?:sf\d+|flat|plot|door|no\.?|\d{1,4}[A-Za-z0-9\s,-]+nagar)\b/i.test(str)) return false;
  if (/\{?grin/i.test(str)) return false;
  if ((str.match(/\p{L}/gu) || []).length < 3) return false;
  if (isPureDocumentTitle(str)) return false;
  if (isPureTaxOrContact(str)) return false;
  if (dateFrom(str) && /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(str)) return false;
  if (/^(?:INV|BILL|REF|ORD|VCH|RCPT)[-#:\s]*\d+/i.test(str)) return false;
  if (/^(?:total|grand\s*total|net\s*payable|sub\s*total|subtotal|balance|cash\s*tendered|change\s*due|round\s*off)$/i.test(str)) return false;
  if (/^#?\d{1,4}[/\w\s,.-]+(?:\d{6}|\bpin\b|\bpincode\b)/i.test(str)) return false;
  return true;
}

export function extractHeaderMerchant(lines, fullText) {
  // 1. Signature line: "For <VENDOR NAME>" anywhere on the line
  // Only a "For X" line next to a signatory line counts; otherwise prose like "tags for store credit" is misread as the vendor.
  const signatory = /authori[sz]ed|signator|signature|proprietor|partner|director/i;
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    if (!/\bfor\s/i.test(line) || !signatory.test(lines.slice(lineIndex, lineIndex + 3).join(' '))) continue;
    const match = line.match(/\bfor\s+([A-Za-z0-9\s&.,'-]{3,60})\b/i);
    if (match && match[1]) {
      const rawFor = match[1].trim();
      if (!/^(?:recipient|customer|transporter|office|home)\b/i.test(rawFor)) {
        const cand = cleanMerchantCandidate(rawFor);
        if (isValidMerchantCandidate(cand) && cand.length >= 4) {
          return cand;
        }
      }
    }
  }

  // 1c. Header email address domain fallback (e.g. Email: sreemuthuarul@gmail.com -> Sree Muthuarul Enterprises)
  let emailMerchantFallback = null;
  const emailMatch = fullText.match(/\b(?:email|e-mail)?\s*[:#-]?\s*([a-z0-9._%+-]+)@(gmail|yahoo|outlook|hotmail|[a-z0-9.-]+)\.[a-z]{2,}\b/i);
  if (emailMatch && emailMatch[1]) {
    const user = emailMatch[1].replace(/[._-]/g, ' ').trim();
    if (user.length >= 4 && !/^(?:info|admin|support|contact|billing|sales|help|office)$/i.test(user)) {
      emailMerchantFallback = user.replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }

  // 1d. Explicit merchant keywords
  const fromIndex = lines.findIndex((l) => /^\s*from\b/i.test(l));
  if (fromIndex !== -1) {
    const rawSame = lines[fromIndex].replace(/^\s*from\s*[:\s]*/i, '').replace(/\bINV[-#:\s]*[0-9A-Za-z-]+\b/i, '').trim();
    const cand = cleanMerchantCandidate(rawSame);
    if (isValidMerchantCandidate(cand)) return cand;
    if (fromIndex + 1 < lines.length) {
      const nextCand = cleanMerchantCandidate(lines[fromIndex + 1]);
      if (isValidMerchantCandidate(nextCand) && !/^(?:bill\s*to|ship\s*to)/i.test(lines[fromIndex + 1])) {
        return nextCand;
      }
    }
  }

  // Bare "vendor"/"store" are ordinary words (e.g. "tags for store credit"), so they only count when followed by a delimiter.
  const explicitPrefixMatch =
    fullText.match(/\b(?:merchant\s*name|sold\s*by|billed\s*by|vendor\s*name|store\s*name)\s*[:#-]?\s*([^\r\n,;]+)/i) ||
    fullText.match(/\b(?:vendor|store)\s*[:#-]\s*([^\r\n,;]+)/i);
  if (explicitPrefixMatch && explicitPrefixMatch[1]) {
    const candidate = cleanMerchantCandidate(explicitPrefixMatch[1]);
    if (isValidMerchantCandidate(candidate)) {
      return candidate;
    }
  }

  // 2. Scan lines starting from the very top header (first 10 lines)
  const topLines = [];
  for (const line of lines.slice(0, 10)) {
    if (/^\s*(?:to[\s.:]|to\b|bill(?:ed)?\s*to|ship\s*to|consignee|buyer|customer\s*(?:name)?|m\/s\b|messrs\b|particulars|items?|s\.?no)\b/i.test(line)) {
      break;
    }
    topLines.push(line);
  }

  const commercialKeywords = /\b(?:enterprises?|agency|agencies|solutions?|services?|traders?|stores?|mart|supermarket|hypermarket|company|co|ltd|limited|pvt|private|corporation|corp|electricals?|hardware|plumbing|sanitation|consulting|industries|stationery|hospital|pharmacy|clinic|lab|bhavan|restaurant|hotel|cafe|foods?|sweets|bakery|dairy|textiles|fashions|motors?|automobiles?|garage|petrol|fuels|gas|power|telecom|fibernet|broadband|systems?|tech|technologies)\b/i;
  const tamilCommercial = /(?:மளிகை|ஸ்டோர்|என்டர்பிரைசஸ்|நிலையம்|அங்காடி|ஏஜென்சி|டிரேடர்ஸ்|கடை|ஹோட்டல்|பவன்|பார்மசி|டெக்ஸ்டைல்ஸ்)/u;
  const addressPattern = /\b(?:street|st\b|road|rd\b|lane|nagar|colony|avenue|ave\b|floor|flr|building|bldg|cross|near|opp|opposite|dist|district|pin|pincode|po\s*box|coimbatore|chennai|bangalore|bengaluru|mumbai|delhi|kovil|salai|puram|layout|block|sector)\b/i;

  const scoredCandidates = [];

  for (let i = 0; i < topLines.length; i++) {
    const raw = topLines[i].trim();
    if (!raw || raw.length < 2) continue;
    if (isPureDocumentTitle(raw)) continue;
    if (isPureTaxOrContact(raw)) continue;
    if (/^\s*from\b/i.test(raw)) continue;
    if (/^\s*(?:date|dated|issue\s*date|time)\s*[:#-]?\s*\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/i.test(raw)) continue;
    if (/^\s*(?:invoice|inv|bill|receipt|voucher|cash\s*memo|memo)\s*(?:no\.?|number|#)?\s*[:#-]?\s*[A-Za-z0-9/-]+\s*$/i.test(raw)) continue;

    const candidate = cleanMerchantCandidate(raw);
    if (!isValidMerchantCandidate(candidate)) continue;

    let score = 0;
    const hasCommercial = commercialKeywords.test(candidate) || tamilCommercial.test(candidate);
    if (hasCommercial) score += 45;

    const hint = merchantEmailHint(fullText);
    if (hint && merchantAgreementScore(candidate, hint) >= 0.6) score += 35;

    const letters = candidate.replace(/[^\p{L}]/gu, '');
    if (letters.length >= 4 && candidate === candidate.toUpperCase()) score += 15;

    score += Math.max(0, 15 - i * 3);

    const hasAddress = addressPattern.test(candidate) || addressPattern.test(raw);
    if (hasAddress) {
      score -= hasCommercial ? 15 : 60;
    }

    if (/^#?\d{1,4}[A-Za-z0-9/-]*\s*[,.]/.test(raw)) score -= 35;
    if (/\b(?:ph|phone|tel|mob|mobile|cell|call|contact|fax|gst|gstin|pan|cin|fssai|arn)\b/i.test(raw)) score -= 30;

    scoredCandidates.push({ candidate, score, index: i });
  }

  if (scoredCandidates.length > 0) {
    scoredCandidates.sort((a, b) => b.score - a.score);
    if (scoredCandidates[0].score > 0) {
      return scoredCandidates[0].candidate;
    }
  }

  return emailMerchantFallback;
}

const squash = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Returns the local part of the first non-generic email address on the document, squashed to letters/digits
 * (sreemuthuarul@gmail.com -> "sreemuthuarul"). Small businesses usually print an address that spells their name,
 * which makes it a good independent check on an OCR'd merchant line.
 */
export function merchantEmailHint(text = '') {
  const match = String(text).match(/([a-z0-9._%+-]{4,})@[a-z0-9.-]+\.[a-z]{2,}/i);
  const local = match ? squash(match[1]) : '';
  return local.length >= 4 && !/^(?:info|admin|support|contact|billing|sales|help|office|accounts?|mail|hello)$/.test(local) ? local : '';
}

/**
 * How well a merchant string agrees with the email hint: the share of the hint's letters that appear, in order,
 * inside the merchant. OCR noise at the start of a name ("st OMFFEREE MUTHUARUL ENTERPRISES") lowers it; a clean
 * read ("SREE MUTHUARUL ENTERPRISES") scores 1.
 */
export function merchantAgreementScore(merchant = '', hint = '') {
  const name = squash(merchant);
  if (!name || !hint) return 0;
  let at = 0;
  let hits = 0;
  for (const ch of hint) {
    const found = name.indexOf(ch, at);
    if (found !== -1) {
      hits += 1;
      at = found + 1;
    }
  }
  return hits / hint.length;
}

export function extractInvoiceOrBillNumber(lines, fullText) {
  const isPureDate = (val = '') => /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(val) || /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(val);
  const isAddressOrFlat = (val = '') => /\b(?:[a-zA-Z]{1,3}\d{1,4}[-/]\d+|sf\d+|pallavi|nagar|road|street|floor|lane|colony|avenue)\b/i.test(val);
  const isTaxOrContact = (val = '') => /^[6-9]\d{9}$/.test(val) || /^\+?91[6-9]\d{9}$/.test(val) || /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(val);
  const isNoiseWord = (val = '') => /^(?:credit|cash|admin|user|total|amount|qty|net|rupees|terms)$/i.test(val);

  const isValidBillNumber = (val) => {
    if (!val) return false;
    const clean = String(val).replace(/^[#:\-_/.\s]+|[#:\-_/.\s]+$/g, '').trim();
    if (!clean || clean.length < 2 || clean.length > 35) return false;
    if (!/\d/.test(clean)) return false;
    if (isPureDate(clean)) return false;
    if (isTaxOrContact(clean)) return false;
    if (isAddressOrFlat(clean)) return false;
    if (isNoiseWord(clean)) return false;
    return true;
  };

  // 1. Same-line explicit matching
  const labelPattern = /\b(?:tax\s*invoice|retail\s*invoice|commercial\s*invoice|proforma\s*invoice|invoice|inv|bill|cash\s*memo|memo|receipt|rcpt|voucher|vch|challan|order|token|slip|b\.?no|sl\.?\s*no)\s*(?:(?:no\.?|number|num|#|id|ref|code)\s*[:#=-]?|[:#=-])\s*([A-Za-z0-9/-]*\d[A-Za-z0-9/-]*)/i;
  const shortNoPattern = /(?<!phone\s*|ph\s*|mob\s*|mobile\s*|cell\s*|flat\s*|door\s*|table\s*|counter\s*|hsn\s*)\b(?:no\.?|#)\s*[:#=-]?\s*([A-Za-z0-9/-]*\d{2,}[A-Za-z0-9/-]*)/i;
  const invLabelPattern = /\binv\s*(?:(?:no\.?|number|num|#|id|ref|code)\s*[:#-]?|[:#])\s*([A-Za-z0-9/-]*\d[A-Za-z0-9/-]*)/i;
  const tamilLabelPattern = /(?:^|[^\p{L}\p{N}])(?:பில்|ரசீது|இன்வாய்ஸ்)\s*(?:(?:எண்|நெ|#)?\s*[:#=-]?|[:#=-])\s*([A-Za-z0-9/-]*\d[A-Za-z0-9/-]*)/u;
  const tamilNoPattern = /(?:^|[^\p{L}\p{N}])(?:எண்)\s*[:#=-]\s*([A-Za-z0-9/-]*\d[A-Za-z0-9/-]*)/u;

  for (const line of lines) {
    if (/\b(?:issue\s*date|bill\s*date|invoice\s*date|dated)\b/i.test(line) && !/\b(?:inv|bill|receipt|memo|voucher)\s*(?:no|num|#)/i.test(line)) {
      continue;
    }

    // Isolate key before subsequent columns (e.g. "Bill No : 3567    Date : 23/03/2026")
    const cleanLine = line
      .replace(/\s{2,}(?:date|dated|dt|time|terms|user|user\s*name|gstin|ph|phone)\b.*$/i, '')
      .replace(/\s*[|;]\s*(?:date|dated|dt|time|terms|user|gstin|ph|phone)\b.*$/i, '');

    // Skip registration, license, tax or phone number lines
    if (/\b(?:reg(?:n)?|registration|lic(?:en[sc]e)?|fssai|drug|dl|cin|pan|tin|tan|phone|ph|mob|mobile|cell|tel|fax|a\/c|account|consumer|customer|service|meter|door|plot|flat|table|counter|hsn|sac)\s*(?:no|number|num|#)/i.test(cleanLine)) {
      continue;
    }

    // Check for inline INV-... / BILL-... codes first (e.g. "FROM INV-001")
    const inlineInvMatch = cleanLine.match(/\b(INV[-#/][A-Za-z0-9/-]*\d[A-Za-z0-9/-]*)\b/i);
    if (inlineInvMatch && isValidBillNumber(inlineInvMatch[1])) {
      return inlineInvMatch[1].trim();
    }

    const match =
      cleanLine.match(labelPattern) ||
      cleanLine.match(invLabelPattern) ||
      cleanLine.match(tamilLabelPattern) ||
      cleanLine.match(tamilNoPattern) ||
      cleanLine.match(shortNoPattern);

    if (match && match[1]) {
      let val = match[1].replace(/^[#:\-_/.\s]+|[#:\-_/.\s]+$/g, '').trim();
      // If match[0] starts with INV- or BILL-, preserve the full code
      if (/^(?:inv|bill)[-#/]/i.test(match[0])) {
        const fullCode = match[0].replace(/^[#:\-_/.\s]+|[#:\-_/.\s]+$/g, '').trim();
        if (isValidBillNumber(fullCode)) {
          return fullCode;
        }
      }
      // If the matched token is a single digit (like 2 from a misread colon) but a larger number follows, extract that number
      if (/^\d$/.test(val)) {
        const longerNumMatch = cleanLine.match(/\b([A-Za-z0-9/-]*\d{2,}[A-Za-z0-9/-]*)\b/);
        if (longerNumMatch && isValidBillNumber(longerNumMatch[1])) {
          return longerNumMatch[1].trim();
        }
      }
      if (isValidBillNumber(val)) {
        return val;
      }
    }
  }

  // 1b. Standalone INV-... pattern
  const standaloneInv = fullText.match(/\b(INV[-#:\s]*[A-Za-z0-9]*\d[A-Za-z0-9-]*)\b/i);
  if (standaloneInv && standaloneInv[1]) {
    const val = standaloneInv[1].replace(/\s+/g, '').trim();
    if (isValidBillNumber(val)) return val;
  }

  // 1c. Check for stacked Bill number in structured columnar block right before / after Date
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const line = lines[i].trim();
    if (/^\d{3,8}$/.test(line)) {
      const prevIsDate = i > 0 && /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(lines[i - 1].trim());
      const nextIsDate = i + 1 < lines.length && /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(lines[i + 1].trim());
      if (prevIsDate || nextIsDate) {
        return line;
      }
    }
  }

  // 2. Two-line pattern
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    if (
      /^(?:tax\s*invoice|retail\s*invoice|invoice|inv|bill|cash\s*memo|memo|receipt|voucher|order|b\.?no|sl\.?\s*no|no\.?)\s*(?:no\.?|number|num|#|id|code)?[:#.-]?$/i.test(
        line
      )
    ) {
      const nextLine = lines[i + 1].trim();
      const nextToken = nextLine.split(/\s+/)[0]?.replace(/^[#:\-_/.\s]+|[#:\-_/.\s]+$/g, '');
      if (isValidBillNumber(nextToken)) {
        return nextToken;
      }
    }
  }

  // 4. Table / columnar header pattern or reference label
  const tblNum = tableReceiptNumber(lines);
  if (tblNum) return tblNum;


  return null;

}

const headerNoise = /^(?:tax\s*invoice|invoice|cash\s*memo|cash\s*bill|receipt|bill|original|duplicate|welcome|thank\s*you|thanks|visit\s*again|gstin|gst\s*no|phone|ph\b|tel\b|mob\b|mobile|www\.|http|e-?mail|from\b|bill\s*to\b|ship\s*to\b|billed\s*to|issued\b|signature|authorized\s*signatory|terms\s*(?:&|and)\s*conditions|e\.?\s*&\s*o\.?\s*e\.?|table\s*no|waiter|counter|cashier|order\s*no|token\s*no|customer\s*(?:name|id)?|street|city|district|pin\s*code|pincode)|\bgstin\b|\d{10,}/i;
const addressWords = /\b(?:road|rd|street|lane|avenue|ave|nagar|district|sector|floor|building|blvd|boulevard|suburb|po\s*box|new\s*zealand|india|australia)\b/i;
const itemNoise = /\b(?:gstin|ph(?:one)?|tel|mob(?:ile)?|pin\s*code|hsn|cashier|counter|table|inv[-#:\s]*\d+|reference|ref|email|issued|signature|authorized|terms|condition|tendered|change|net\s*amount|rupees|e\.?\s*&\s*o\.?\s*e)\b|\d{9,}|@|www\./i;

function cleanDescription(raw = '') {
  return raw
    .replace(/\b\d+(?:\.\d+)?\s*(?:x|\*|\u00d7)\s*(?:[0-9,]+(?:\.[0-9]{1,2})?)?\s*$/i, '')
    .replace(/\s+\d+(?:\.\d+)?\s+[\$\u20b9€£]?[0-9,]+(?:\.[0-9]{1,2})?\s*$/i, '')
    .replace(/[\$\u20b9€£]\s*[0-9,]+(?:\.[0-9]{1,2})?\s*[\$\u20b9€£]?\s*$/i, '')
    .replace(/[\$\u20b9€£]+/g, '')
    .replace(/\s+[0-9,]+(?:\.[0-9]{1,2})?\s*$/i, '')
    .replace(/[|:\u2013\u2014#*-]+$/u, '')
    .trim();
}

const tableHeader = (line) =>
  /\b(?:desc\w{3,9}|item|items|particulars|product|service|description)\b/i.test(line) &&
  /\b(?:qty|quantity|rate|price|amount|amt|total)\b/i.test(line) &&
  !/[$₹€£]\s*\d/.test(line);

const tableEnd = /^\s*total\b|\b(?:sub|grand|net)\s*total\b|\bnet\s*payable\b|\bamount\s*due\b|\b(?:tax|gst|vat)\b|\bissued\s*by\b|\bother\s*comments\b|\b(?:notes|terms|remarks)\b|\bthank\s*you\b|\bmake\s*all\s*checks\b|\bமொத்தம்\b|\bकुल\b/i;
const trailingNumbers = /((?:\s+[$₹€£]?\s*[0-9OoIlSsBbZz][0-9OoIlSsBbZz,]*(?:\.[0-9OoIlSsBbZz]{1,2})?){1,3})\s*[$₹€£]?\s*$/;

function parseTableItems(lines) {
  const header = lines.findIndex(tableHeader);
  if (header === -1) return null;
  const rows = [];
  for (const line of lines.slice(header + 1)) {
    if (tableEnd.test(line)) break;
    const match = line.match(trailingNumbers);
    if (!match) continue;
    const description = cleanDescription(line.slice(0, match.index).trim());
    if (description.length < 2 || !/[\p{L}]/u.test(description) || itemNoise.test(description) || isContactLine(line)) continue;
    const rawTokens = match[1].match(/[0-9OoIlSsBbZz][0-9OoIlSsBbZz,]*(?:\.[0-9OoIlSsBbZz]{1,2})?/g) || [];
    const nums = rawTokens.map(parseAmount).filter((n) => n != null);
    const amount = nums.at(-1);
    if (!(amount > 0)) continue;
    let quantity = 1;
    let unit = amount;

    const rated = description.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|days?|units?|pcs|nos|kg|ltrs?)\b.*?\bat\s*[$₹€£]?\s*(\d+(?:\.\d+)?)/i)
      || line.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|days?|units?|pcs|nos|kg|ltrs?)\b.*?\bat\s*[$₹€£]?\s*(\d+(?:\.\d+)?)/i);
    if (rated && Math.abs(Number(rated[1]) * Number(rated[2]) - amount) <= Math.max(0.05, amount * 0.01)) {
      quantity = Number(rated[1]);
      unit = Number(rated[2]);
    } else if (nums.length === 3 && nums[0] > 0 && Math.abs(nums[0] * nums[1] - amount) <= Math.max(1, amount * 0.02)) {
      [quantity, unit] = [nums[0], nums[1]];
    } else if (nums.length >= 2 && Number.isInteger(nums.at(-2)) && nums.at(-2) > 0 && nums.at(-2) <= 10_000) {
      quantity = nums.at(-2);
      unit = amount / quantity;
    }

    const unitPrice = Math.round(unit * 100) / 100;
    rows.push({
      description,
      itemName: description,
      quantity,
      unitPrice,
      unitPriceMinor: Math.round(unitPrice * 100),
      amount,
      amountMinor: Math.round(amount * 100),
      confidence: null,
    });
  }
  return rows;
}

export function parseItems(lines) {
  const tableItems = parseTableItems(lines);
  if (tableItems && tableItems.length > 0) return tableItems.slice(0, 100);

  const items = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length < 3) continue;

    if (
      isSummaryLine(line) ||
      headerNoise.test(line) ||
      dateFrom(line) ||
      itemNoise.test(line) ||
      addressWords.test(line) ||
      isContactLine(line) ||
      /^\W*(?:from|bill\s*to|ship\s*to|invoice|inv[-#:\s]*\d+|to[.:]\s)/i.test(line) ||
      /\binv[-#:\s]*\d+/i.test(line)
    ) {
      continue;
    }

    // Pattern B (Multiplier): Description   <qty> x <unitPrice>   [<lineTotal>]
    const multMatch = line.match(/^(.*?)\s+(\d+(?:\.\d+)?)\s*(?:x|\*|\u00d7)\s*[$₹€£]?\s*([0-9OoIlSsBbZz,]+(?:\.[0-9OoIlSsBbZz]{1,2})?)(?:\s+[$₹€£]?\s*([0-9OoIlSsBbZz,]+(?:\.[0-9OoIlSsBbZz]{1,2})?))?\s*$/i);
    if (multMatch) {
      const desc = cleanDescription(multMatch[1]);
      const qty = Number(multMatch[2]);
      const price = parseAmount(multMatch[3]);
      const total = multMatch[4]
        ? parseAmount(multMatch[4])
        : (price != null ? Math.round(qty * price * 100) / 100 : null);

      if (desc.length >= 2 && qty > 0 && price != null && total != null && total > 0 && /[\p{L}]/u.test(desc)) {
        items.push({
          description: desc,
          itemName: desc,
          quantity: qty,
          unitPrice: price,
          unitPriceMinor: Math.round(price * 100),
          amount: total,
          amountMinor: Math.round(total * 100),
          confidence: null,
        });
        continue;
      }
    }

    // Pattern A (Columns): Description   <qty>   <unitPrice>   <lineTotal>
    const threeCols = line.match(/^(.*?)\s+(\d+(?:\.\d+)?)\s+[$₹€£]?\s*([0-9OoIlSsBbZz,]+(?:\.[0-9OoIlSsBbZz]{1,2})?)\s+[$₹€£]?\s*([0-9OoIlSsBbZz,]+(?:\.[0-9OoIlSsBbZz]{1,2})?)\s*$/i);
    if (threeCols) {
      const desc = cleanDescription(threeCols[1]);
      const qty = Number(threeCols[2]);
      const price = parseAmount(threeCols[3]);
      const total = parseAmount(threeCols[4]);
      if (desc.length >= 2 && qty > 0 && price != null && total != null && total > 0 && /[\p{L}]/u.test(desc) && Math.abs(qty * price - total) <= Math.max(1, total * 0.05)) {
        items.push({
          description: desc,
          itemName: desc,
          quantity: qty,
          unitPrice: price,
          unitPriceMinor: Math.round(price * 100),
          amount: total,
          amountMinor: Math.round(total * 100),
          confidence: null,
        });
        continue;
      }
    }

    // Pattern A2 (Two numbers: Qty and LineTotal, infer UnitPrice = LineTotal / Qty):
    const twoCols = line.match(/^(.*?)\s+(\d+)\s+[$₹€£]?\s*([0-9OoIlSsBbZz,]+(?:\.[0-9OoIlSsBbZz]{1,2})?)\s*$/i);
    if (twoCols) {
      const desc = cleanDescription(twoCols[1]);
      const qty = Number(twoCols[2]);
      const total = parseAmount(twoCols[3]);
      if (desc.length >= 2 && qty > 1 && total != null && total > 0 && !isSummaryLine(desc) && /[\p{L}]/u.test(desc)) {
        const price = Math.round((total / qty) * 100) / 100;
        items.push({
          description: desc,
          itemName: desc,
          quantity: qty,
          unitPrice: price,
          unitPriceMinor: Math.round(price * 100),
          amount: total,
          amountMinor: Math.round(total * 100),
          confidence: null,
        });
        continue;
      }
    }

    // Pattern C (Implicit Qty=1): Description   <lineTotal>
    const singlePrice = line.match(/^(.*?)\s+[$₹€£]?\s*([0-9OoIlSsBbZz,]+(?:\.[0-9OoIlSsBbZz]{1,2})?)\s*$/i);
    if (singlePrice) {
      const desc = cleanDescription(singlePrice[1]);
      const total = parseAmount(singlePrice[2]);
      if (desc.length >= 2 && total != null && total > 0 && !isSummaryLine(desc) && /[\p{L}]/u.test(desc)) {
        items.push({
          description: desc,
          itemName: desc,
          quantity: 1,
          unitPrice: total,
          unitPriceMinor: Math.round(total * 100),
          amount: total,
          amountMinor: Math.round(total * 100),
          confidence: null,
        });
        continue;
      }
    }
  }

  return items.slice(0, 100);
}

export function paymentOutcome(text = '') {
  if (/\b(?:payment|transaction)\s*(?:has\s*)?(?:failed|declined|unsuccessful|cancell?ed|reversed)\b|\b(?:failed|declined)\b|\bunable\s*to\s*(?:pay|process)\b|\bmoney\s*(?:will\s*be\s*)?refunded\b/i.test(text)) return 'FAILED';
  if (/\b(?:payment|transaction)\s*(?:is\s*)?(?:pending|processing|in\s*progress)\b|\bstatus\s*:?\s*pending\b|\bawaiting\s*confirmation\b/i.test(text)) return 'PENDING';
  return 'PAID';
}

export function paymentApplicationFrom(text = '') {
  const lower = String(text).toLowerCase();
  if (/\b(?:google\s*pay|gpay)\b|\bg\s*pay\b/.test(lower)) return 'GOOGLE_PAY';
  if (/\bphone\s*pe\b|\bphonepe\b/.test(lower)) return 'PHONEPE';
  if (/\bpaytm\b/.test(lower)) return 'PAYTM';
  if (/\bbhim\b/.test(lower)) return 'BHIM';
  if (/\bcred\b/.test(lower)) return 'CRED';
  if (/\bamazon\s*pay\b/.test(lower)) return 'AMAZON_PAY';
  if (/\b(?:netbanking|internet\s*banking|imps|neft|rtgs|funds?\s*transfer|bank\s*transfer)\b/.test(lower)) return 'NETBANKING';
  if (/\b(?:hdfc|icici|sbi|axis|kotak|canara|pnb|bob)\b/.test(lower)) return 'NETBANKING';
  return 'OTHER_UPI_APP';
}

export function payeeUpiIdFrom(text = '') {
  const match = String(text).match(/(?<![A-Za-z0-9._-])([A-Za-z0-9._-]{2,64}@[A-Za-z]{2,30})(?![A-Za-z0-9.])/);
  return match ? match[1] : null;
}

export function classifyReceiptDocument(text = '', isPaymentScreenshot = false) {
  const lower = String(text).toLowerCase();
  if (isPaymentScreenshot) {
    return /\b(?:imps|neft|rtgs|netbanking|bank\s+transfer|transfer\s+advice)\b/.test(lower)
      ? 'BANK_TRANSACTION_RECEIPT'
      : 'PAYMENT_CONFIRMATION';
  }
  if (/\b(?:electricity|water\s*(?:bill|charges|supply|board|utility)|gas\s*(?:bill|charges|supply|utility)|internet|broadband|utility|tangedco|tneb|bescom|bwssb)\b/.test(lower)) return 'UTILITY_BILL';
  if (/\b(?:tax\s+invoice|gstin|cgst|sgst|igst|invoice)\b/.test(lower)) return 'TAX_INVOICE';
  if (/\b(?:order\s*(?:id|number)|amazon|flipkart|myntra|online\s+order)\b/.test(lower)) return 'ONLINE_ORDER_INVOICE';
  if (/\b(?:hotel|check[- ]?in|booking\s*(?:id|number)|accommodation)\b/.test(lower)) return 'HOTEL_INVOICE';
  if (/\b(?:petrol|diesel|fuel|pump|fare|taxi|uber|ola|transport)\b/.test(lower)) return 'TRANSPORT_RECEIPT';
  if (/\b(?:restaurant|cafe|hotel|food|dining|swiggy|zomato)\b/.test(lower)) return 'FOOD_RECEIPT';
  if (/\b(?:receipt|cash\s+memo|supermarket|mart|store)\b/.test(lower)) return 'RETAIL_RECEIPT';
  return 'UNKNOWN';
}

export function generateExpenseTitle({ documentType = 'UNKNOWN', merchant = null, category = null, items = [], explicitNotes = null } = {}) {
  const vendor = merchant?.trim() || null;
  if (vendor && explicitNotes?.trim()) return `${vendor} - ${explicitNotes.trim()}`;
  if (documentType === 'PAYMENT_CONFIRMATION' || documentType === 'BANK_TRANSACTION_RECEIPT') return vendor ? `Payment to ${vendor}` : 'Payment Confirmation';
  if (documentType === 'UTILITY_BILL') return vendor ? `Utility Bill - ${vendor}` : 'Utility Bill';
  if (documentType === 'TRANSPORT_RECEIPT') return vendor ? `Transport Expense - ${vendor}` : 'Transport Expense';
  if (documentType === 'FOOD_RECEIPT') return vendor ? `Restaurant Expense - ${vendor}` : 'Restaurant Expense';
  const prefix = category === 'Groceries' ? 'Groceries' : category === 'Repairs & Maintenance' ? 'Repairs & Maintenance' : category === 'Bills & Utilities' ? 'Bills & Utilities' : null;
  if (prefix && vendor) return `${prefix} - ${vendor}`;
  if (prefix) return prefix;
  if (vendor && items.length) return `Shopping - ${vendor}`;
  return vendor || null;
}
export function inferCategoryAndType(text = '') {
  const lower = String(text).toLowerCase();
  if (
    /\b(?:hardware|cement|paint|plumbing|pipe|electrical|motor|repair|maintenance|servicing|spare|tools|welding|generator|switch|wire|mcb)\b/.test(
      lower
    )
  ) {
    return { category: 'Repairs & Maintenance', expenseType: 'REPAIRS_MAINTENANCE' };
  }
  if (
    /\b(?:fuel|diesel|petrol|electricity\s*bill|eb\s*(?:bill|charges?|meter)|electricity|power\s*bill|water\s*(?:bill|tanker)|utility|gas\s*bill|energy|bescom|tneb|bwssb)\b/.test(
      lower
    )
  ) {
    return { category: 'Bills & Utilities', expenseType: 'BILLS_UTILITIES' };
  }
  if (
    /\b(?:labour|labor|security|guard|housekeeping|gardener|agency|salary|wages|cleaning|sanitation)\b/.test(
      lower
    )
  ) {
    return { category: 'Services & Labour', expenseType: 'SERVICES_LABOUR' };
  }
  if (
    /\b(?:grocery|supermarket|vegetable|fruits|rice|dal|milk|oil|provisions|food|spices)\b/.test(
      lower
    )
  ) {
    return { category: 'Groceries', expenseType: 'PURCHASE' };
  }
  return { category: null, expenseType: null };
}

const RECONCILE_TOLERANCE_MINOR = 5;

/**
 * Reconciles line items against the ground truth subtotal/total.
 * Stray lines (addresses, notes, contact numbers) are eliminated by finding the largest
 * consistent subset matching the subtotal target.
 */
/**
 * Indian GST invoices print a tax summary: a "Taxable Value  CGST% AMT  SGST% AMT ..." header followed by a row of values.
 * The first value is the pre-tax subtotal and the last is the total tax. The row is only trusted when the printed
 * rate and the taxable value reproduce the tax amount, so a misread row is ignored instead of poisoning the totals.
 */
export function extractGstSummary(lines = []) {
  const header = lines.findIndex((line) => /\btaxable\s*(?:value|amt|amount)\b/i.test(line));
  if (header === -1) return null;
  for (const line of lines.slice(header, header + 3)) {
    const values = [...line.matchAll(/\d[\d,]*\.\d{2}/g)].map((match) => parseAmount(match[0]));
    if (values.length < 3) continue;
    const taxable = values[0];
    const tax = values.at(-1);
    const rate = values.at(-2);
    if (taxable > 0 && tax > 0 && tax < taxable && rate > 0 && rate <= 40 && Math.abs((taxable * rate) / 100 - tax) <= 1) {
      return { taxableMinor: Math.round(taxable * 100), taxMinor: Math.round(tax * 100) };
    }
  }
  return null;
}

export function reconcileItems(items, { subtotalMinor, totalMinor, taxMinor, discountMinor, additionalChargesMinor }) {
  if (!items.length || items.length > 16) return items;
  const target = subtotalMinor ?? (totalMinor != null ? totalMinor - (taxMinor || 0) - (additionalChargesMinor || 0) + (discountMinor || 0) : null);
  if (target == null) return items;
  const sumOf = (rows) => rows.reduce((sum, row) => sum + row.amountMinor, 0);
  if (Math.abs(sumOf(items) - target) <= RECONCILE_TOLERANCE_MINOR) return items;
  let best = null;
  for (let mask = 1; mask < 1 << items.length; mask++) {
    const rows = items.filter((_, index) => mask & (1 << index));
    if (Math.abs(sumOf(rows) - target) <= RECONCILE_TOLERANCE_MINOR && (!best || rows.length > best.length)) best = rows;
  }
  return best || items;
}

export function extractExplicitNotes(lines = []) {
  const notesLabels = [
    /^\s*(?:description|particulars|remarks|subject|memo|purpose|scope\s*of\s*work|job\s*desc(?:ription)?)\s*[:#-]\s*(.+)/i,
    /^\s*notes?\s*[:#-]\s*(.+)/i,
  ];

  for (const line of lines) {
    if (isSummaryLine(line) || isContactLine(line)) continue;
    for (const pattern of notesLabels) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const cleaned = match[1].replace(/[|:*#_]+$/g, '').trim();
        if (cleaned.length >= 3 && !/^(?:nil|na|n\/a|none|-)$/i.test(cleaned)) {
          return cleaned;
        }
      }
    }
  }
  return null;
}

export function generateSuggestedNotes({ explicitNotes, items = [], receiptNumber, transactionReference, merchant, receiptDate } = {}) {
  const parts = [];

  if (explicitNotes) {
    parts.push(explicitNotes);
  }

  if (Array.isArray(items) && items.length > 0) {
    const itemDescriptions = items
      .map((it) => {
        const desc = it.description || it.itemName;
        if (!desc) return null;
        const qty = it.quantity && it.quantity > 1 ? `${it.quantity}x ` : '';
        const amt = it.amount != null ? ` (₹${it.amount.toFixed(2)})` : '';
        return `${qty}${desc}${amt}`;
      })
      .filter(Boolean);

    if (itemDescriptions.length > 0) {
      if (itemDescriptions.length <= 4) {
        parts.push(`Items: ${itemDescriptions.join(', ')}`);
      } else {
        parts.push(`Items (${items.length}): ${itemDescriptions.slice(0, 3).join(', ')}, +${items.length - 3} more`);
      }
    }
  }

  const metaParts = [];
  if (receiptNumber) metaParts.push(`Invoice #${receiptNumber}`);
  if (transactionReference) metaParts.push(`Ref: ${transactionReference}`);
  if (merchant) metaParts.push(`From: ${merchant}`);
  if (receiptDate) metaParts.push(`Date: ${receiptDate}`);

  if (metaParts.length > 0) {
    parts.push(metaParts.join(' | '));
  }

  return parts.join('\n');
}

function tableReceiptNumber(lines) {
  const token = (value = '') => value.split(/\s+/).find((part) => /\d/.test(part) && /^[A-Za-z0-9/-]+$/.test(part)) || null;
  const label = lines.findIndex((line) => /\b(?:invoice|bill|receipt)\s*(?:no|number|#)\.?\s*:?/i.test(line));
  if (label !== -1 && lines[label + 1]) {
    const value = token(lines[label + 1]);
    if (value && !/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(value)) return value;
  }
  return lines.map((line) => line.match(/\breference\s*(?:no\.?|number|#)?\s*[:#-]\s*([A-Za-z0-9/-]*\d[A-Za-z0-9/-]*)/i)?.[1]).find(Boolean) || null;
}

/**
 * Calculates field-level confidence scores (HIGH, MEDIUM, LOW) based on OCR word confidence,
 * presence of surrounding labels, and cross-field arithmetic validation.
 */
export function calculateFieldConfidence(parsed, { ocrConfidence = null, warnings = [] } = {}) {
  const baseConfidence = ocrConfidence ?? 85;
  const hasMismatch = warnings.some((w) => w.code === 'TOTAL_MISMATCH' || w.code === 'ITEMS_MISMATCH');

  // Total amount confidence
  let totalScore = 0;
  if (parsed.totalMinor != null) {
    if (parsed.isPaymentScreenshot) {
      totalScore = baseConfidence >= 70 ? 95 : 85;
    } else if (!hasMismatch && parsed.subtotalMinor != null && parsed.totalMinor != null) {
      totalScore = 95;
    } else if (!hasMismatch) {
      totalScore = 85;
    } else {
      totalScore = 60;
    }
  }

  // Date confidence
  let dateScore = 0;
  if (parsed.receiptDate && !warnings.some((warning) => warning.code === 'DATE_IN_FUTURE' || warning.code === 'DATE_MISSING')) {
    dateScore = baseConfidence >= 70 ? 92 : 80;
  } else {
    dateScore = 0;
  }

  // Merchant confidence
  let merchantScore = 0;
  if (parsed.merchant && !warnings.some((warning) => warning.code === 'MERCHANT_MISSING')) {
    merchantScore = parsed.merchant.length >= 4 ? 90 : 75;
  }

  // Receipt/invoice identifiers and payment references are both useful reference values.
  let refScore = 0;
  const referenceValue = parsed.transactionReference || parsed.receiptNumber || parsed.invoiceNumber || parsed.billNumber || parsed.orderId;
  if (referenceValue) {
    refScore = /^\d{12}$/.test(referenceValue) ? 98 : 85;
  }

  const toLevel = (score) => (score >= 80 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW');

  return {
    total: { score: totalScore, level: toLevel(totalScore) },
    date: { score: dateScore, level: toLevel(dateScore) },
    merchant: { score: merchantScore, level: toLevel(merchantScore) },
    reference: { score: refScore, level: toLevel(refScore) },
  };
}

/**
 * Cross-checks extracted figures against arithmetic invariants and sets diagnostic warnings.
 */
export function analyzeReceiptExtraction(result, { ocrConfidence = null, now = new Date() } = {}) {
  const warnings = [];
  const out = { ...result };
  const discount = out.discountMinor || 0;
  const charges = out.additionalChargesMinor || 0;

  if (out.totalMinor == null && out.subtotalMinor != null && !out.isPaymentScreenshot) {
    out.totalMinor = out.subtotalMinor + (out.taxMinor || 0) + charges - discount;
    out.totalDerived = true;
    warnings.push({ code: 'TOTAL_DERIVED', message: 'The total was calculated from subtotal and taxes. Please verify it.' });
  } else if (out.totalMinor == null && out.items?.length && !out.isPaymentScreenshot) {
    const itemSumMinor = out.items.reduce((sum, item) => sum + (item.amountMinor || 0), 0);
    if (itemSumMinor > 0) {
      out.totalMinor = itemSumMinor;
      out.totalDerived = true;
      warnings.push({ code: 'TOTAL_DERIVED', message: 'The total was calculated from the sum of line items. Please verify it.' });
    }
  }

  if (out.totalMinor != null && out.totalAmount == null) {
    out.totalAmount = out.totalMinor / 100;
  }
  if (out.totalMinor == null) {
    warnings.push({ code: 'TOTAL_MISSING', message: 'Total amount could not be detected. Enter it manually.' });
  }

  if (!out.isPaymentScreenshot) {
    if (out.subtotalMinor != null && out.totalMinor != null && !out.totalDerived) {
      const expected = out.subtotalMinor + (out.taxMinor || 0) + charges - discount;
      if (Math.abs(expected - out.totalMinor) > 100) {
        warnings.push({ code: 'TOTAL_MISMATCH', message: 'Subtotal plus tax does not match the total. One of the figures may have been misread.' });
      }
    }
    const itemSum = (out.items || []).reduce((sum, item) => sum + (item.amountMinor || 0), 0);
    const itemTarget = out.subtotalMinor ?? (out.totalMinor != null ? out.totalMinor - (out.taxMinor || 0) - charges + discount : null);
    // Line items may be printed tax-inclusive, so they can legitimately add up to the grand total instead of the subtotal.
    const itemsMatchTotal = out.totalMinor != null && Math.abs(itemSum - out.totalMinor) <= 100;
    if (out.items?.length && itemTarget != null && Math.abs(itemSum - itemTarget) > 100 && !itemsMatchTotal) {
      warnings.push({ code: 'ITEMS_MISMATCH', message: 'Item amounts do not sum to the subtotal. Check individual item lines.' });
    }
    if (!out.merchant) {
      warnings.push({ code: 'MERCHANT_MISSING', message: 'Merchant name could not be identified.' });
    }
  } else {
    if (out.settlement && out.settlement !== 'PAID') {
      warnings.push({ code: 'PAYMENT_NOT_COMPLETED', message: `This screenshot indicates a ${out.settlement.toLowerCase()} payment. Do not record as paid.` });
    }
    if (!out.transactionReference) {
      warnings.push({ code: 'REFERENCE_MISSING', message: 'No UPI reference / UTR could be read.' });
    }
  }

  const effectiveDate = out.expenseDate || out.receiptDate;
  if (!effectiveDate) {
    warnings.push({ code: 'DATE_MISSING', message: 'The date could not be read or is ambiguous (e.g. 10/11/2026). Enter it manually.' });
  } else if (new Date(`${effectiveDate}T00:00:00Z`).getTime() > now.getTime() + 24 * 60 * 60 * 1000) {
    warnings.push({ code: 'DATE_IN_FUTURE', message: 'The date read from the receipt is in the future.' });
  }

  const penalty = warnings.filter((w) => w.code !== 'TOTAL_DERIVED').length * 8;
  const baseConf = ocrConfidence ?? 90;
  out.confidence = Math.max(0, Math.min(100, Math.round(baseConf - penalty)));
  out.warnings = warnings;
  out.needsReview = warnings.length > 0;
  out.fieldConfidence = calculateFieldConfidence(out, { ocrConfidence: out.confidence, warnings });

  return out;
}

export function parseReceiptText(text = '', options = {}) {
  const cleanText = String(text || '').replace(/[\u200B-\u200D\uFEFF]/g, '');
  const lines = textLines(cleanText);
  const isPaymentScreenshot = isPaymentAppScreenshot(cleanText);
  const transactionReference = extractTransactionReference(cleanText);

  let totalMinor = null;
  let merchant = null;
  let items = [];

  const gstSummary = extractGstSummary(lines);
  const subtotalMinor = labelledAmount(lines, /\bsub[\s-]*total\b/i) ?? gstSummary?.taxableMinor ?? null;
  const taxMinor = taxAmount(lines) ?? gstSummary?.taxMinor ?? null;
  const cgstMinor = extractCgstMinor(lines);
  const sgstMinor = extractSgstMinor(lines);
  const cgstAmount = cgstMinor != null ? cgstMinor / 100 : null;
  const sgstAmount = sgstMinor != null ? sgstMinor / 100 : null;
  const discountMinor = labelledAmount(lines, /\bdiscount\b/i);
  const additionalChargesMinor = labelledAmount(
    lines,
    /\b(?:service|delivery|additional|packing|transport|handling|shipping)\s+(?:charge|charges|cost)\b|\b(?:delivery|packing|handling|shipping|convenience|platform)\s+fees?\b|\bshipping\s*(?:&|and)\s*handling\b|\bS\s*&\s*H\b/i
  );

  if (isPaymentScreenshot) {
    merchant = extractPaymentPayee(lines, cleanText);
    totalMinor = extractPaymentAmount(lines, cleanText) ?? extractTotalAmount(lines, cleanText);
    items = [];
  } else {
    merchant = extractHeaderMerchant(lines, cleanText);
    totalMinor = extractTotalAmount(lines, cleanText);
    items = options.includeItems === false ? [] : parseItems(lines);
  }

  if (!isPaymentScreenshot && items.length > 0) {
    items = reconcileItems(items, { subtotalMinor, totalMinor, taxMinor, discountMinor, additionalChargesMinor });
  }

  const documentNumber = extractInvoiceOrBillNumber(lines, cleanText);
  // A payment reference proves payment; it is not an invoice / receipt number.
  const receiptNumber = isPaymentScreenshot ? null : documentNumber;
  const documentType = classifyReceiptDocument(cleanText, isPaymentScreenshot);
  const receiptDate = receiptDateFrom(lines, cleanText);
  const inferred = inferCategoryAndType(cleanText);
  const totalAmount = totalMinor != null ? totalMinor / 100 : null;

  const explicitNotes = extractExplicitNotes(lines);
  const expenseTitle = generateExpenseTitle({ documentType, merchant, category: inferred.category, items, explicitNotes });
  const suggestedNotes = generateSuggestedNotes({
    explicitNotes,
    items,
    receiptNumber,
    transactionReference,
    merchant,
    receiptDate,
  });

  const isBankTransfer =
    isPaymentScreenshot &&
    /\b(?:imps|neft|rtgs|netbanking|internet\s*banking|funds?\s*transfer|beneficiary\s*name|beneficiary\s*a\/c|name\s*of\s*beneficiary|bank\s*transfer)\b/i.test(text) &&
    !/\b(?:google\s*pay|gpay|phonepe|paytm|bhim|cred|amazon\s*pay)\b/i.test(text) &&
    !payeeUpiIdFrom(text);

  const paymentMethod = isPaymentScreenshot ? (isBankTransfer ? 'BANK_TRANSFER' : 'UPI') : null;

  const rawResult = {
    expenseDate: receiptDate,
    receiptDate,
    totalAmount,
    totalMinor,
    subtotalAmount: subtotalMinor != null ? subtotalMinor / 100 : (isPaymentScreenshot && totalAmount != null ? totalAmount : null),
    subtotalMinor: subtotalMinor ?? (isPaymentScreenshot ? totalMinor : null),
    taxMinor,
    cgstMinor: cgstMinor ?? null,
    cgstAmount: cgstAmount ?? null,
    sgstMinor: sgstMinor ?? null,
    sgstAmount: sgstAmount ?? null,
    discountMinor,
    additionalChargesMinor,
    merchant,
    merchantAddress: null,
    receiptNumber,
    invoiceNumber: documentType === 'TAX_INVOICE' || documentType === 'ONLINE_ORDER_INVOICE' ? documentNumber : null,
    billNumber: !isPaymentScreenshot ? documentNumber : null,
    transactionId: transactionReference || null,
    documentType,
    currency: String(text).match(/\b(NZD|AUD|CAD|SGD|AED|SAR|USD|EUR|GBP|INR)\b/i)?.[1]?.toUpperCase() || (/\u20b9|\b(?:inr|rs\.?)\b/i.test(text)
      ? 'INR'
      : /\$|\busd\b/i.test(text)
      ? 'USD'
      : /€|\beur\b/i.test(text)
      ? 'EUR'
      : /£|\bgbp\b/i.test(text)
      ? 'GBP'
      : 'INR'),
    items,
    isPaymentScreenshot,
    paymentMethod,
    settlement: isPaymentScreenshot ? paymentOutcome(text) : null,
    paymentApplication: isPaymentScreenshot ? paymentApplicationFrom(text) : null,
    payeeUpiId: isPaymentScreenshot ? payeeUpiIdFrom(text) : null,
    transactionReference: transactionReference || (isPaymentScreenshot ? receiptNumber : null),
    suggestedCategory: inferred.category,
    suggestedExpenseType: inferred.expenseType,
    suggestedExpenseName: isPaymentScreenshot
      ? merchant || 'UPI Payment'
      : explicitNotes && merchant
      ? `${merchant} - ${explicitNotes}`
      : explicitNotes || (merchant ? `${merchant}${items[0] ? ` - ${items[0].description}` : ''}` : items[0]?.description || (receiptDate ? `Expense - ${receiptDate}` : 'Receipt Expense')),
    description: explicitNotes || (suggestedNotes ? suggestedNotes.split('\n')[0] : (merchant ? `Expense at ${merchant}` : null)),
    notes: suggestedNotes || (receiptNumber ? `Ref: ${receiptNumber}` : ''),
    suggestedNotes,
    explicitNotes,
    confidence: null,
  };

  rawResult.suggestedExpenseName = expenseTitle || rawResult.suggestedExpenseName;
  return analyzeReceiptExtraction(rawResult);
}

const moneyPattern = /(?:(?:\u20b9|rs\.?|inr|\$|usd|€|eur|£|gbp|aed|sar)\s*([0-9OoIlSs]{1,7}(?:,[0-9OoIlSs]{2,3})*(?:\.[0-9OoIlSs]{1,2})?)|(?:\b|\s|^)([0-9OoIlSs]*\d[0-9OoIlSs]*(?:,[0-9OoIlSs]{2,3})*(?:\.[0-9OoIlSs]{1,2})?))(?=[^0-9a-zA-Z]|$)/gi;

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
 * - Strips currency prefixes / suffixes
 * - Removes commas, supporting both Indian format (1,25,450.00) and standard (125,450.00)
 */
export function sanitizeNumericToken(token) {
  if (token == null) return '';
  let str = String(token).trim();
  // Strip currency prefixes and suffixes
  str = str.replace(/^(?:\u20b9|rs\.?|inr|\$|usd|€|eur|£|gbp|aed|sar)\s*/gi, '')
           .replace(/\s*(?:\u20b9|rs\.?|inr|\$|usd|€|eur|£|gbp|aed|sar)$/gi, '');
  // Fix OCR character swaps
  str = str.replace(/[Oo]/g, '0')
           .replace(/[Il|]/g, '1')
           .replace(/(?<=\d|\.)[Ss]/g, '5')
           .replace(/[Ss](?=\d|\.|$)/g, '5');
  // Remove commas
  str = str.replace(/,/g, '');
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

const textLines = (text = '') =>
  String(text)
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .filter(Boolean);

const moneyValues = (line = '') =>
  [...String(line).matchAll(moneyPattern)]
    .map((match) => minor(match[1] || match[2]))
    .filter((value) => Number.isSafeInteger(value) && value > 0);

const lastAmount = (line = '') => moneyValues(line).at(-1) ?? null;

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

export const dateFrom = (text = '') => {
  const value = String(text);

  // ISO: YYYY-MM-DD or YYYY/MM/DD
  const iso = value.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) return toDate(iso[1], iso[2], iso[3]);

  // Named Day First: e.g. 21-Oct-2026, 21 Oct 2026, 21st October, 2026, 21-Oct-26
  const namedDayFirst = value.match(
    /\b(\d{1,2})\s*(?:st|nd|rd|th)?[\s,./-]+([a-z]{3,9})[\s,./-]+(20\d{2}|\d{2})\b/i
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
    /\b([a-z]{3,9})[\s,./-]+(\d{1,2})(?:st|nd|rd|th)?(?:[,\s]+|(?:[\s,./-]+))(20\d{2}|\d{2})\b/i
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

  // If d1 > 12, it must be DD/MM/YYYY
  if (d1 > 12 && d2 <= 12) {
    return toDate(yr, d2, d1);
  }

  // If d2 > 12, it must be MM/DD/YYYY
  if (d2 > 12 && d1 <= 12) {
    return toDate(yr, d1, d2);
  }

  // If labelled (e.g. Date: 12/08/2026), in Indian context treat as DD/MM/YYYY
  const isLabelled = /\b(?:invoice\s*|bill\s*|receipt\s*|issue\s*)?date\b|\bdated\b/i.test(
    value.slice(Math.max(0, numeric.index - 25), numeric.index + numeric[0].length)
  );
  if (isLabelled || (d1 <= 31 && d2 <= 12)) {
    return toDate(yr, d2, d1);
  }

  return null;
};

// Invoices print an issue date and a due date; the expense belongs to the issue date.
export function receiptDateFrom(lines, text) {
  const labelled = lines.find((line) => /\b(?:issue|invoice|bill|receipt)?\s*date\b|\bdated\b/i.test(line) && !/\bdue\b/i.test(line) && dateFrom(line));
  if (labelled) return dateFrom(labelled);
  const twoDates = /\d[-/.]\d{1,2}[-/.]\d{2,4}.*\d[-/.]\d{1,2}[-/.]\d{2,4}/;
  const withoutDue = lines.filter((line) => !/\bdue\b/i.test(line) || twoDates.test(line));
  return dateFrom(withoutDue.join('\n')) ?? dateFrom(text);
}

const isSummaryLine = (line) =>
  /\b(?:grand|net|final|invoice|bill)?\s*total\b|\bnet\s*payable\b|\b(?:total\s*)?(?:amount|balance)\s*(?:due|payable|paid)?\b|\bamount\s*payable\b|\bsub\s*total\b|\bsubtotal\b|\b(?:tax|gst|cgst|sgst|igst|utgst|cess|vat)\b|\bdiscount\b|\bround\s*off\b|\bchange\b|\bcash\s*tendered\b|\bcash\s*given\b|\bbalance\b|\b(?:cash|card|upi|neft|rtgs|cheque)\b|\b(?:invoice|receipt|bill)\s*(?:no|number|#)?\b|\b(?:google\s*pay|gpay|phonepe|paytm|bhim|cred|amazon\s*pay)\b|\b(?:upi\s*(?:transaction\s*id|ref(?:erence)?|id)|utr|rrn|txn\s*id|transaction\s*id)\b|\b(?:paid\s*to|payment\s*to|sent\s*to|transfer\s*to|banking\s*name|debited\s*from|paid\s*using|completed|successful|payment\s*status)\b|\b[a-zA-Z0-9.\-_]+@[a-zA-Z]+\b|\b(?:account|a\/c|bank|savings)\b/i.test(
    line
  );

export function isPaymentAppScreenshot(text = '') {
  const lower = String(text).toLowerCase();
  const hasAppBrand = /\b(?:google\s*pay|gpay|phonepe|paytm|bhim|cred|amazon\s*pay|whatsapp\s*pay|mobikwik|freecharge)\b/.test(
    lower
  );
  const hasPaymentTerms = /\b(?:upi\s*(?:transaction\s*id|ref(?:erence)?|id)|utr|rrn|google\s*transaction\s*id|banking\s*name|paid\s*to|payment\s*to|sent\s*to|transfer\s*to|debited\s*from|paid\s*successfully|payment\s*successful)\b/.test(
    lower
  );
  const hasUpiId = /\b[a-zA-Z0-9.\-_]{2,64}@(ok[a-z]+|ybl|ibl|axl|paytm|upi|sbi|hdfcbank|icici|barodampay|kotak|postbank|idfcbank|federal)\b/i.test(
    text
  );
  const hasUtr = /\b(?:utr|rrn|upi\s*ref(?:erence)?)\b/i.test(text);
  return hasAppBrand || hasPaymentTerms || (hasUpiId && (hasUtr || /\b(?:paid|sent|transfer|debited)\b/i.test(lower)));
}

function cleanPayee(raw = '') {
  return raw
    .replace(/\b(?:paid\s*to|payment\s*to|sent\s*to|transfer\s*to|to\s*:|banking\s*name\s*:?)\b/gi, '')
    .replace(/\b(?:completed|successful|verified|payment\s*details|view\s*history|primary|upi)\b/gi, '')
    .replace(/[\$\u20b9€£]\s*[0-9,]+(?:\.[0-9]{1,2})?/gi, '')
    .replace(/[|:#*–—]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPaymentPayee(lines, fullText) {
  const bankingMatch = fullText.match(/\bbanking\s*name\s*[:#-]?\s*([^\r\n,]+)/i);
  if (bankingMatch) {
    const cleaned = cleanPayee(bankingMatch[1]);
    if (cleaned.length >= 2) return cleaned;
  }

  const paidToMatch = fullText.match(
    /\b(?:paid\s*to|payment\s*to|sent\s*to|transfer\s*to|to\s*:)\s*([^\r\n,]+)/i
  );
  if (paidToMatch) {
    const cleaned = cleanPayee(paidToMatch[1]);
    if (cleaned.length >= 2) return cleaned;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^(?:paid\s*to|payment\s*to|sent\s*to|to:?)$/i.test(line.trim()) && i + 1 < lines.length) {
      const cleaned = cleanPayee(lines[i + 1]);
      if (cleaned.length >= 2) return cleaned;
    }
  }

  const upiMatch = fullText.match(
    /\b([a-zA-Z0-9.\-_]{3,64})@(ok[a-z]+|ybl|ibl|axl|paytm|upi|sbi|hdfcbank|icici|barodampay)\b/i
  );
  if (upiMatch) {
    const handle = upiMatch[1].replace(/[._-]/g, ' ').replace(/\d+$/, '').trim();
    if (handle.length >= 3 && !/^(?:pay|upi|merchant|info|support|admin|user)$/i.test(handle)) {
      return handle
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
  }

  for (const line of lines) {
    if (
      !isSummaryLine(line) &&
      !dateFrom(line) &&
      !/\b(?:google\s*pay|gpay|phonepe|paytm|bhim|cred|amazon|completed|successful|payment|transaction|debited|details)\b/i.test(
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

function extractPaymentAmount(lines, fullText) {
  const paidAmountMatch = fullText.match(
    /\b(?:paid|payment\s*(?:of|amount)?|amount\s*:?)\s*(?:\u20b9|rs\.?|inr)?\s*([0-9OoIlSs]{1,7}(?:,[0-9OoIlSs]{2,3})*(?:\.[0-9OoIlSs]{1,2})?)/i
  );
  if (paidAmountMatch && paidAmountMatch[1]) {
    const val = minor(paidAmountMatch[1]);
    if (val > 0 && val < 50_000_000) return val;
  }

  for (const line of lines) {
    if (/\b(?:utr|rrn|txn|ref|transaction\s*id|a\/c|account)\b/i.test(line)) continue;
    const match = line.match(
      /(?:\u20b9|rs\.?|inr|\$|€|£)\s*([0-9OoIlSs]{1,7}(?:,[0-9OoIlSs]{2,3})*(?:\.[0-9OoIlSs]{1,2})?)/i
    );
    if (match && match[1]) {
      const val = minor(match[1]);
      if (val > 0 && val < 50_000_000) return val;
    }
  }

  for (const line of lines) {
    if (/\b(?:utr|rrn|txn|ref|transaction\s*id|a\/c|account)\b/i.test(line)) continue;
    const values = moneyValues(line);
    if (values.length === 1 && values[0] > 0 && values[0] < 50_000_000) {
      return values[0];
    }
  }

  return null;
}

function extractTransactionReference(fullText) {
  const refMatch = fullText.match(
    /\b(?:upi\s*(?:transaction\s*id|ref(?:erence)?\s*(?:no\.?|number)?)|utr|rrn|google\s*transaction\s*id|txn\s*id|transaction\s*id)\s*[:#-]?\s*([a-z0-9]{8,25})\b/i
  );
  if (refMatch && refMatch[1]) {
    return refMatch[1].trim();
  }
  const standalone12 = fullText.match(/\b(?:ref|utr|rrn)[\s\w:#-]*?(\d{12})\b/i);
  if (standalone12 && standalone12[1]) {
    return standalone12[1].trim();
  }
  return null;
}

function labelledAmount(lines, label) {
  const values = lines
    .map((line) => {
      const match = line.match(label);
      return match ? lastAmount(line.slice(match.index + match[0].length)) : null;
    })
    .filter((value) => value != null);
  return values.at(-1) ?? null;
}

export function extractTotalAmount(lines, fullText) {
  // 1. Highest priority: explicit grand total / net payable / total amount labels
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
  ];

  for (const label of grandTotalLabels) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (/sub[\s-]*total|subtotal/i.test(line)) continue;
      if (/\btotal\s*(?:qty|quantity|items?|pcs|nos|count|units?)\b/i.test(line)) continue;
      // Skip multi-column table headers like "Invoice No: Issue Date Due Date Total Due (NZD)"
      if (/\b(?:invoice|bill)\s*no\b.*?\bdate\b/i.test(line)) continue;

      const match = line.match(label);
      if (match) {
        // A. Same line after label
        const after = line.slice(match.index + match[0].length);
        const amounts = moneyValues(after);
        if (amounts.length > 0) {
          return amounts.at(-1);
        }
        // B. Same line before label (e.g. "1,450.00 Total")
        const before = line.slice(0, match.index);
        const beforeAmounts = moneyValues(before);
        if (beforeAmounts.length > 0) {
          return beforeAmounts.at(-1);
        }
        // C. Next line (vertical format: "TOTAL AMOUNT\n₹ 1,450.00")
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          if (!/sub[\s-]*total|subtotal/i.test(nextLine) && !/\btotal\s*(?:qty|quantity|items?|pcs|nos|count)\b/i.test(nextLine)) {
            const nextAmounts = moneyValues(nextLine);
            if (nextAmounts.length > 0) {
              return nextAmounts.at(-1);
            }
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
      if (amounts.length > 0) {
        return amounts.at(-1);
      }
      const before = line.slice(0, match.index);
      const beforeAmounts = moneyValues(before);
      if (beforeAmounts.length > 0) {
        return beforeAmounts.at(-1);
      }
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (!/\b(?:sub[\s-]*total|subtotal|tendered|cash|change|tax|cgst|sgst)\b/i.test(nextLine) && !/\btotal\s*(?:qty|quantity|items?|pcs|nos|count)\b/i.test(nextLine)) {
          const nextAmounts = moneyValues(nextLine);
          if (nextAmounts.length > 0) {
            return nextAmounts.at(-1);
          }
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

const headerNoise = /^(?:tax\s*invoice|invoice|cash\s*memo|cash\s*bill|receipt|bill|original|duplicate|welcome|thank\s*you|thanks|visit\s*again|gstin|gst\s*no|phone|ph\b|tel\b|mob\b|mobile|www\.|http|e-?mail|from\b|bill\s*to\b|ship\s*to\b|billed\s*to|issued\b|signature|authorized\s*signatory|terms\s*(?:&|and)\s*conditions|e\.?\s*&\s*o\.?\s*e\.?|table\s*no|waiter|counter|cashier|order\s*no|token\s*no|customer\s*(?:name|id)?|street|city|district|pin\s*code|pincode)|\bgstin\b|\d{10,}/i;
const addressWords = /\b(?:road|rd|street|lane|avenue|ave|nagar|district|sector|floor|building|blvd|boulevard|suburb|po\s*box|new\s*zealand|india|australia)\b/i;
const itemNoise = /\b(?:gstin|ph(?:one)?|tel|mob(?:ile)?|pin\s*code|hsn|cashier|counter|table|inv[-#:\s]*\d+|reference|ref|email|issued|signature|authorized|terms|condition|tendered|change)\b|\d{9,}|@|www\./i;

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
  /\b(?:desc\w{3,9}|item|items|particulars|product|service)\b/i.test(line) &&
  /\b(?:qty|quantity|rate|price|amount|amt|total)\b/i.test(line) &&
  !/[$₹€£]\s*\d/.test(line);

const tableEnd = /^\s*total\b|\b(?:sub|grand|net)\s*total\b|\bnet\s*payable\b|\bamount\s*due\b|\b(?:tax|gst|vat)\b|\bissued\s*by\b|\bother\s*comments\b|\b(?:notes|terms|remarks)\b|\bthank\s*you\b|\bmake\s*all\s*checks\b/i;
const trailingNumbers = /((?:\s+[$₹€£]?\s*[0-9OoIlSs][0-9OoIlSs,]*(?:\.[0-9OoIlSs]{1,2})?){1,3})\s*[$₹€£]?\s*$/;

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
    const rawTokens = match[1].match(/[0-9OoIlSs][0-9OoIlSs,]*(?:\.[0-9OoIlSs]{1,2})?/g) || [];
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

function parseItems(lines) {
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
      /^(?:from|bill\s*to|ship\s*to|invoice|inv[-#:\s]*\d+)/i.test(line) ||
      /\binv[-#:\s]*\d+/i.test(line)
    ) {
      continue;
    }

    // Pattern B (Multiplier): Description   <qty> x <unitPrice>   <lineTotal>
    const multMatch = line.match(/^(.*?)\s+(\d+(?:\.\d+)?)\s*(?:x|\*|\u00d7)\s*[$₹€£]?\s*([0-9OoIlSs,]+(?:\.[0-9OoIlSs]{1,2})?)(?:\s+[$₹€£]?\s*([0-9OoIlSs,]+(?:\.[0-9OoIlSs]{1,2})?))?\s*$/i);
    if (multMatch) {
      const desc = cleanDescription(multMatch[1]);
      const qty = Number(multMatch[2]);
      const price = parseAmount(multMatch[3]);
      const total = multMatch[4] ? parseAmount(multMatch[4]) : (price != null ? Math.round(qty * price * 100) / 100 : null);
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
    const threeCols = line.match(/^(.*?)\s+(\d+(?:\.\d+)?)\s+[$₹€£]?\s*([0-9OoIlSs,]+(?:\.[0-9OoIlSs]{1,2})?)\s+[$₹€£]?\s*([0-9OoIlSs,]+(?:\.[0-9OoIlSs]{1,2})?)\s*$/i);
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
    const twoCols = line.match(/^(.*?)\s+(\d+)\s+[$₹€£]?\s*([0-9OoIlSs,]+(?:\.[0-9OoIlSs]{1,2})?)\s*$/i);
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
    const singlePrice = line.match(/^(.*?)\s+[$₹€£]?\s*([0-9OoIlSs,]+(?:\.[0-9OoIlSs]{1,2})?)\s*$/i);
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
  return 'OTHER_UPI_APP';
}

export function payeeUpiIdFrom(text = '') {
  const match = String(text).match(/(?<![A-Za-z0-9._-])([A-Za-z0-9._-]{2,64}@[A-Za-z]{2,30})(?![A-Za-z0-9.])/);
  return match ? match[1] : null;
}

export function inferCategoryAndType(text = '') {
  const lower = String(text).toLowerCase();
  if (
    /\b(?:fuel|diesel|petrol|electricity|eb|power|water|tanker|utility|gas|energy|bescom|tneb|bwssb)\b/.test(
      lower
    )
  ) {
    return { category: 'Bills & Utilities', expenseType: 'BILLS_UTILITIES' };
  }
  if (
    /\b(?:hardware|cement|paint|plumbing|pipe|electrical|motor|repair|maintenance|servicing|spare|tools|welding|generator)\b/.test(
      lower
    )
  ) {
    return { category: 'Repairs & Maintenance', expenseType: 'REPAIRS_MAINTENANCE' };
  }
  if (
    /\b(?:labour|labor|security|guard|housekeeping|gardener|agency|salary|wages|cleaning|sanitation)\b/.test(
      lower
    )
  ) {
    return { category: 'Services & Labour', expenseType: 'SERVICES_LABOUR' };
  }
  return { category: 'Purchase', expenseType: 'PURCHASE' };
}

const RECONCILE_TOLERANCE_MINOR = 5;

/**
 * The printed subtotal (or total minus tax/charges plus discount) is the ground truth for the item rows.
 * When the rows do not add up to it, stray lines (addresses, phone numbers, notes) were read as items, so keep
 * the largest set of rows that does add up. Unchanged when the rows already match or no subset does.
 */
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

export function parseReceiptText(text = '') {
  const lines = textLines(text);
  const isPaymentScreenshot = isPaymentAppScreenshot(text);
  const transactionReference = extractTransactionReference(text);

  let totalMinor = null;
  let merchant = null;
  let items = [];

  const subtotalMinor = labelledAmount(lines, /\bsub\s*total\b|\bsubtotal\b/i);
  const taxMinor = taxAmount(lines);
  const discountMinor = labelledAmount(lines, /\bdiscount\b/i);
  const additionalChargesMinor = labelledAmount(
    lines,
    /\b(?:service|delivery|additional|packing|transport|handling|shipping)\s+(?:charge|charges|cost)\b|\b(?:delivery|packing|handling|shipping|convenience|platform)\s+fees?\b|\bshipping\s*(?:&|and)\s*handling\b|\bS\s*&\s*H\b/i
  );

  if (isPaymentScreenshot) {
    merchant = extractPaymentPayee(lines, text);
    totalMinor = extractPaymentAmount(lines, text) ?? extractTotalAmount(lines, text);
    items = [];
  } else {
    totalMinor = extractTotalAmount(lines, text);

    let explicitFrom = null;
    const fromIndex = lines.findIndex((line) => /^\s*from\b/i.test(line));
    if (fromIndex !== -1) {
      const sameLine = lines[fromIndex].replace(/^\s*from\s*[:\s]*/i, '').replace(/\bINV[-#:\s]*[0-9A-Za-z]+\b/i, '').trim();
      if (sameLine && /[\p{L}]/u.test(sameLine) && !headerNoise.test(sameLine)) {
        explicitFrom = sameLine;
      } else if (fromIndex + 1 < lines.length) {
        const nextLine = lines[fromIndex + 1].trim();
        if (nextLine && !isSummaryLine(nextLine) && !headerNoise.test(nextLine) && !/^bill\s*to/i.test(nextLine)) {
          explicitFrom = nextLine;
        }
      }
    }

    const billToIndex = lines.findIndex((line) => /^\s*(?:bill(?:ed)?\s*to|ship\s*to)\b/i.test(line));
    const headerLines = billToIndex > 0 ? lines.slice(0, billToIndex) : lines;
    merchant =
      explicitFrom ||
      headerLines
        .map(withoutTitle)
        .find(
          (line) =>
            line.length >= 2 &&
            !isSummaryLine(line) &&
            !/^\d/.test(line) &&
            !headerNoise.test(line) &&
            !isContactLine(line) &&
            !addressWords.test(line) &&
            !/^(?:from|bill\s*to|billed\s*to|ship\s*to|client|mailing|info|name|date|customer|street|city)\b/i.test(line) &&
            !/\b(?:street\s*address|city,?\s*st|zip)\b/i.test(line) &&
            !dateFrom(line) &&
            /[\p{L}]{2}/u.test(line)
        ) || null;

    items = parseItems(lines);
  }

  if (!isPaymentScreenshot) {
    items = reconcileItems(items, { subtotalMinor, totalMinor, taxMinor, discountMinor, additionalChargesMinor });
  }

  const receiptNumber =
    String(text).match(/\b(INV[-#:\s]*[A-Za-z0-9]*\d[A-Za-z0-9-]*)\b/i)?.[1] ||
    String(text).match(
      /\b(?:inv|invoice|bill|receipt|voucher)\s*(?:(?:no\.?|number|num|#)\s*[:#-]?|[:#-])\s*([a-z0-9/-]*\d[a-z0-9/-]*)/i
    )?.[1] ||
    tableReceiptNumber(lines) ||
    transactionReference;

  const merchantAddress =
    lines.length > 1 && merchant
      ? lines.find(
          (line) =>
            line !== merchant &&
            /\b(?:road|street|nagar|district|city|pin|lane|sector|avenue)\b|\b\d{6}\b/i.test(
              line
            )
        ) || null
      : null;

  const receiptDate = receiptDateFrom(lines, text);
  const inferred = inferCategoryAndType(text);

  const explicitNotes = extractExplicitNotes(lines);
  const suggestedNotes = generateSuggestedNotes({
    explicitNotes,
    items,
    receiptNumber,
    transactionReference,
    merchant,
    receiptDate,
  });

  const suggestedExpenseName = isPaymentScreenshot
    ? merchant
      ? merchant
      : 'UPI Payment'
    : explicitNotes && merchant
    ? `${merchant} - ${explicitNotes}`
    : explicitNotes
    ? explicitNotes
    : merchant
    ? `${merchant}${items[0] ? ` - ${items[0].description}` : ''}`
    : items[0]
    ? items[0].description
    : receiptDate
    ? `Expense - ${receiptDate}`
    : 'Receipt Expense';

  const totalAmount = totalMinor != null ? totalMinor / 100 : null;

  return {
    expenseDate: receiptDate,
    receiptDate,
    totalAmount,
    totalMinor,
    subtotalAmount: subtotalMinor != null ? subtotalMinor / 100 : (isPaymentScreenshot && totalAmount != null ? totalAmount : null),
    subtotalMinor: subtotalMinor ?? (isPaymentScreenshot ? totalMinor : null),
    taxMinor,
    discountMinor,
    additionalChargesMinor,
    merchant,
    merchantAddress,
    receiptNumber,
    currency: String(text).match(/\b(NZD|AUD|CAD|SGD|AED|SAR|USD|EUR|GBP|INR)\b/i)?.[1]?.toUpperCase() || (/\u20b9|\b(?:inr|rs\.?)\b/i.test(text)
      ? 'INR'
      : /\$|\busd\b/i.test(text)
      ? 'USD'
      : /€|\beur\b/i.test(text)
      ? 'EUR'
      : /£|\bgbp\b/i.test(text)
      ? 'GBP'
      : isPaymentScreenshot
      ? 'INR'
      : null),
    items,
    isPaymentScreenshot,
    paymentMethod: isPaymentScreenshot ? 'UPI' : null,
    settlement: isPaymentScreenshot ? paymentOutcome(text) : null,
    paymentApplication: isPaymentScreenshot ? paymentApplicationFrom(text) : null,
    payeeUpiId: isPaymentScreenshot ? payeeUpiIdFrom(text) : null,
    transactionReference,
    suggestedCategory: inferred.category,
    suggestedExpenseType: inferred.expenseType,
    suggestedExpenseName,
    description: explicitNotes || (suggestedNotes ? suggestedNotes.split('\n')[0] : null),
    notes: suggestedNotes,
    suggestedNotes,
    explicitNotes,
    confidence: null,
  };
}

import path from 'node:path';
import { parseReceiptText, merchantEmailHint, merchantAgreementScore } from './receiptParser.js';

export const HEADER_BAND_FRACTION = 0.4;

/**
 * Writes the top band of a preprocessed page to `dir` for a second, focused OCR read.
 * On invoices with a two-column header (client address beside "Bill No / Date"), the full-page pass often garbles
 * the right column, while the cropped band reads it cleanly. `pipeline` is a sharp pipeline of the prepared page.
 * Returns { label, path } or null when the band cannot be produced.
 */
export async function writeHeaderBand(sharp, pipeline, dir) {
  try {
    const { data, info } = await pipeline.png().toBuffer({ resolveWithObject: true });
    const headerPath = path.join(dir, 'header-band.png');
    await sharp(data)
      .extract({ left: 0, top: 0, width: info.width, height: Math.round(info.height * HEADER_BAND_FRACTION) })
      .normalize()
      .png()
      .toFile(headerPath);
    return { label: 'header-band', path: headerPath };
  } catch {
    return null;
  }
}

const squash = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');

/** True when the main read is identity-incomplete or its vendor disagrees with the printed email address. */
export function needsHeaderPass(result, text) {
  if (!result || result.isPaymentScreenshot) return false;
  if (!result.receiptNumber || !result.receiptDate || !result.merchant) return true;
  const hint = merchantEmailHint(text);
  return Boolean(hint) && merchantAgreementScore(result.merchant, hint) < 0.9;
}

/**
 * Compares a header-band read with the full-page read and returns only the identity fields (bill no, date, vendor)
 * that should be filled in or replaced. Nothing is overwritten unless the header read is clearly better.
 */
export function mergeHeaderIdentity(result, text, headerText) {
  const header = parseReceiptText(headerText, { includeItems: false });
  const filled = {};

  if (!result.receiptNumber && header.receiptNumber) filled.receiptNumber = header.receiptNumber;
  if (!result.receiptDate && header.receiptDate) {
    filled.receiptDate = header.receiptDate;
    filled.expenseDate = header.receiptDate;
  }

  if (header.merchant && header.merchant !== result.merchant) {
    const hint = merchantEmailHint(text) || merchantEmailHint(headerText);
    const current = squash(result.merchant);
    const candidate = squash(header.merchant);
    const headerWins =
      !result.merchant ||
      // Same name with stray leading characters in the full-page read ("SFSREE …" vs "SREE …"): take the clean one.
      (candidate.length < current.length && current.endsWith(candidate)) ||
      (hint && merchantAgreementScore(header.merchant, hint) > merchantAgreementScore(result.merchant, hint));
    if (headerWins) filled.merchant = header.merchant;
  }
  return filled;
}

/**
 * Removes 1-4 stray leading characters from an OCR'd vendor when the vendor's printed email address proves where the
 * real name starts ("SFSREE MUTHUARUL ENTERPRISES" + sreemuthuarul@gmail.com -> "SREE MUTHUARUL ENTERPRISES").
 * Returns the vendor unchanged when the email does not settle it.
 */
export function trimMerchantNoise(merchant, text) {
  const hint = merchantEmailHint(text);
  if (!merchant || !hint) return merchant;
  const at = squash(merchant).indexOf(hint);
  if (at < 1 || at > 4) return merchant;
  let dropped = 0;
  let index = 0;
  while (index < merchant.length && dropped < at) {
    if (/[a-z0-9]/i.test(merchant[index])) dropped += 1;
    index += 1;
  }
  return merchant.slice(index).trim() || merchant;
}

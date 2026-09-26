import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Normalizes an incoming raw phone string to canonical E.164 format.
 * @param {string} rawPhone - The input phone number string.
 * @param {string} [defaultCountry='IN'] - Fallback country code if rawPhone lacks country prefix.
 * @returns {string|null} Canonical E.164 formatted string (e.g. "+919876543210") or fallback format.
 */
export function normalizePhone(rawPhone, defaultCountry = 'IN') {
  if (!rawPhone || typeof rawPhone !== 'string') return null;
  const trimmed = rawPhone.trim();
  if (!trimmed) return null;

  try {
    const phoneNumber = parsePhoneNumberFromString(trimmed, defaultCountry);
    const compactInternational = trimmed.replace(/[\s().-]/g, '');
    const hasRepeatedNationalDigits = /^(?:\+?\d{1,3})?(\d)\1{6,}$/.test(compactInternational);
    const isExplicitPossibleInternational = trimmed.startsWith('+')
      && /^\+[\d\s().-]+$/.test(trimmed)
      && phoneNumber?.isPossible()
      && !hasRepeatedNationalDigits;
    if (phoneNumber && (phoneNumber.isValid() || isExplicitPossibleInternational)) {
      return phoneNumber.format('E.164');
    }
  } catch (err) {
    // If parsing fails, fall back below
  }

  return null;
}

/**
 * Safely masks a phone number for logging output.
 * E.g., "+919876543210" -> "+91*****3210"
 * @param {string} phone
 * @returns {string}
 */
export function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const trimmed = phone.trim();
  if (trimmed.length <= 4) return '****';
  
  const visibleTail = 4;
  if (trimmed.startsWith('+')) {
    const countryPrefix = trimmed.slice(0, 3);
    const middleLength = trimmed.length - countryPrefix.length - visibleTail;
    if (middleLength <= 0) return countryPrefix + '****';
    return countryPrefix + '*'.repeat(middleLength) + trimmed.slice(-visibleTail);
  }

  const maskedLength = trimmed.length - visibleTail;
  return '*'.repeat(maskedLength) + trimmed.slice(-visibleTail);
}

/**
 * Safely masks an email address for logging output.
 * E.g., "john.doe@example.com" -> "j***e@example.com"
 * @param {string} email
 * @returns {string}
 */
export function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return '****';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

export default {
  normalizePhone,
  maskPhone,
  maskEmail,
};

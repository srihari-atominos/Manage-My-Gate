import crypto from 'crypto';
import HttpError from './httpError.utils.js';

/**
 * Single source of truth for signing and verifying staff gate passes, shared by the
 * technician (issuing) and staffAttendance (verifying) features.
 */

const SIGNATURE_HEX_LENGTH = 16;

/**
 * Returns the active signing secret, enforcing production strength rules.
 */
export function getActiveQrSecret() {
  let secret = process.env.QR_HMAC_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new HttpError(
      500,
      'Cryptographic configuration error: QR_HMAC_SECRET must be explicitly configured in production.'
    );
  }
  secret = secret || process.env.JWT_SECRET || 'secret';
  if (process.env.NODE_ENV === 'production' && (secret === 'secret' || secret.length < 32)) {
    throw new HttpError(500, 'Cryptographic secret does not meet security requirements.');
  }
  return secret;
}

function qrParts(orgId, technician) {
  return {
    techId: String(technician._id),
    code: technician.staffCode || String(technician._id),
    validUntilIso: technician.qrValidUntil ? new Date(technician.qrValidUntil).toISOString() : '',
    version: Number(technician.qrVersion) || 0,
  };
}

function hmac(secret, message) {
  return crypto.createHmac('sha256', secret).update(message).digest('hex').slice(0, SIGNATURE_HEX_LENGTH);
}

/**
 * Signature for the technician's current pass. Passes that were never rotated keep the original
 * message format (so already-printed passes stay valid); rotated passes bind the version number.
 */
export function signStaffQr(orgId, technician, secret = getActiveQrSecret()) {
  const { techId, code, validUntilIso, version } = qrParts(orgId, technician);
  const base = `${orgId}:${techId}:${code}:${validUntilIso}`;
  return hmac(secret, version > 0 ? `${base}:v${version}` : base);
}

/**
 * Verifies a scanned signature in constant time. Throws 401 when it does not match.
 * Honours the previous secret for key rotation. Once a pass has been rotated (qrVersion > 0),
 * every older format (including the un-timestamped legacy one) is rejected, which is what makes
 * a lost or shared pass revocable.
 */
export function verifyStaffQrSignature(orgId, technician, providedSignature) {
  if (
    !providedSignature ||
    typeof providedSignature !== 'string' ||
    !/^[0-9a-fA-F]{16}$/.test(providedSignature)
  ) {
    throw new HttpError(401, 'Invalid or tampered staff QR code signature.');
  }

  const now = new Date();
  if (technician.qrValidFrom && now < new Date(technician.qrValidFrom)) {
    throw new HttpError(403, 'Staff QR pass is not yet active.');
  }
  if (technician.qrValidUntil && now > new Date(technician.qrValidUntil)) {
    throw new HttpError(403, 'Staff QR pass has expired. Please contact Community Admin for renewal.');
  }

  const secrets = [getActiveQrSecret()];
  if (process.env.QR_HMAC_SECRET_PREVIOUS) secrets.push(process.env.QR_HMAC_SECRET_PREVIOUS);

  const { techId, code, version } = qrParts(orgId, technician);
  const provided = Buffer.from(providedSignature, 'hex');
  const matches = (expected) => {
    const buf = Buffer.from(expected, 'hex');
    return buf.length === provided.length && crypto.timingSafeEqual(buf, provided);
  };

  for (const secret of secrets) {
    if (matches(signStaffQr(orgId, technician, secret))) return true;
    // Backward compatibility with un-timestamped signatures, only for never-rotated passes.
    if (version === 0 && matches(hmac(secret, `${orgId}:${techId}:${code}`))) return true;
  }

  throw new HttpError(401, 'Invalid or tampered staff QR token signature.');
}


import Otp from './otp.model.js';
import OtpThrottle from './otpThrottle.model.js';
import { hashPassword, comparePassword } from '../../utils/crypto.utils.js';
import HttpError from '../../utils/httpError.utils.js';
import crypto from 'crypto';

export const OTP_MAX_ATTEMPTS = 3;
export const OTP_RESEND_COOLDOWN_SECONDS = 25;
export const OTP_MAX_SENDS_PER_WINDOW = 5;
export const OTP_SEND_WINDOW_MINUTES = 60;
export const OTP_LOCK_MINUTES = 15;

const normalizeIdentifier = (identifier) => (identifier ? String(identifier).trim().toLowerCase() : '');
const secondsUntil = (date) => Math.max(1, Math.ceil((date.getTime() - Date.now()) / 1000));

/**
 * Whether plain OTP codes may be echoed back in API responses or logs.
 * Requires an explicit OTP_DEBUG=true and is never allowed in production.
 */
export const isOtpDebugEnabled = () =>
  process.env.OTP_DEBUG === 'true' && process.env.NODE_ENV !== 'production';

export class OtpService {
  /**
   * Generates a random 4-digit OTP code.
   * @returns {string} The plain OTP code
   */
  generateCode() {
    return crypto.randomInt(1000, 9999).toString();
  }

  /**
   * Throws 429 if a new code may not be sent to this identifier yet
   * (resend cooldown, hourly request limit, or temporary lock). Does not record a send.
   * Call before contacting an external SMS provider; createOTP checks again.
   * @param {string} identifier - Email or phone
   */
  async assertCanSend(identifier) {
    if (process.env.NODE_ENV !== 'production') return;
    const id = normalizeIdentifier(identifier);
    const throttle = await OtpThrottle.findOne({ identifier: id }).lean();
    if (!throttle) return;
    const now = new Date();

    if (throttle.lockedUntil && throttle.lockedUntil > now) {
      const retryAfterSeconds = secondsUntil(throttle.lockedUntil);
      throw new HttpError(
        429,
        `Too many code requests. Please try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).`,
        { code: 'OTP_LOCKED', retryAfterSeconds }
      );
    }

    if (throttle.lastSentAt) {
      const cooldownEnds = new Date(throttle.lastSentAt.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000);
      if (cooldownEnds > now) {
        const retryAfterSeconds = secondsUntil(cooldownEnds);
        throw new HttpError(429, `Resend available in ${retryAfterSeconds} seconds.`, {
          code: 'OTP_COOLDOWN',
          retryAfterSeconds,
        });
      }
    }
  }

  /**
   * Records a send and applies the hourly limit. Runs outside any caller
   * transaction so an aborted transaction can never erase the count.
   */
  async recordSend(identifier) {
    const id = normalizeIdentifier(identifier);
    const now = new Date();
    const windowMs = OTP_SEND_WINDOW_MINUTES * 60 * 1000;
    const throttle = await OtpThrottle.findOne({ identifier: id });

    const inWindow = throttle && now.getTime() - throttle.windowStart.getTime() < windowMs;
    const sendCount = inWindow ? throttle.sendCount + 1 : 1;
    const windowStart = inWindow ? throttle.windowStart : now;
    const lockedUntil =
      sendCount > OTP_MAX_SENDS_PER_WINDOW ? new Date(now.getTime() + OTP_LOCK_MINUTES * 60 * 1000) : null;

    await OtpThrottle.updateOne(
      { identifier: id },
      {
        $set: {
          windowStart,
          sendCount,
          lastSentAt: now,
          lockedUntil,
          expiresAt: new Date(now.getTime() + windowMs + OTP_LOCK_MINUTES * 60 * 1000),
        },
      },
      { upsert: true }
    );

    if (lockedUntil) {
      throw new HttpError(
        429,
        `Too many code requests. Please try again in ${OTP_LOCK_MINUTES} minutes.`,
        { code: 'OTP_LOCKED', retryAfterSeconds: OTP_LOCK_MINUTES * 60 }
      );
    }
  }

  /**
   * Creates and saves an OTP for a given identifier and type. Any earlier code
   * of the same type for this identifier stops working.
   * @param {string} identifier - Email or Phone
   * @param {string} type - OTP type (REGISTER, LOGIN, RESET, VERIFY)
   * @param {number} validityMinutes - Validity duration in minutes
   * @param {object} [session] - Mongoose session
   * @param {string} [sessionInfo] - Optional third-party session info (e.g. Firebase)
   */
  async createOTP(identifier, type, validityMinutes = 5, session = null, sessionInfo = null) {
    const id = normalizeIdentifier(identifier);
    await this.assertCanSend(id);
    await this.recordSend(id);

    let plainCode = this.generateCode();
    let hashedCode;

    if (sessionInfo) {
      // For Firebase/third-party, we don't generate/hash a real code since the provider handles it
      hashedCode = 'THIRD_PARTY_MANAGED';
      plainCode = 'THIRD_PARTY_MANAGED';
    } else {
      hashedCode = await hashPassword(plainCode);
    }

    const expiresAt = new Date(Date.now() + validityMinutes * 60000);

    // A new code always invalidates every earlier code of this type
    await Otp.deleteMany({ identifier: id, type }).session(session);

    const otpDoc = new Otp({
      identifier: id,
      code: hashedCode,
      type,
      sessionInfo,
      expiresAt,
    });

    await otpDoc.save({ session });

    return plainCode;
  }

  /**
   * Counts one failed attempt against the current code, outside any transaction.
   * Deletes the code and throws OTP_EXHAUSTED once the limit is reached,
   * otherwise throws OTP_INVALID with the attempts remaining.
   */
  async recordFailedAttempt(identifier, type) {
    const id = normalizeIdentifier(identifier);
    const updated = await Otp.findOneAndUpdate(
      { identifier: id, type },
      { $inc: { attempts: 1 } },
      { sort: { createdAt: -1 }, returnDocument: 'after' }
    );
    const attemptsRemaining = updated ? Math.max(0, OTP_MAX_ATTEMPTS - updated.attempts) : 0;
    if (attemptsRemaining <= 0) {
      if (updated) await Otp.deleteOne({ _id: updated._id });
      throw new HttpError(
        400,
        'Too many incorrect attempts. Your current OTP is no longer valid. Please request a new OTP to continue.',
        { code: 'OTP_EXHAUSTED', attemptsRemaining: 0 }
      );
    }
    throw new HttpError(
      400,
      `Incorrect OTP. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining.`,
      { code: 'OTP_INVALID', attemptsRemaining }
    );
  }

  /**
   * Verifies an OTP code.
   * @param {string} identifier - Email or Phone
   * @param {string} code - Plain OTP code provided by user
   * @param {string} type - OTP type
   * @param {object} [session] - Mongoose session
   * @param {boolean} [deleteOnSuccess=true] - Consume the code on success (single use)
   * @returns {Promise<true|{sessionInfo: string}>} For third-party codes, the caller must
  async verifyOTP(identifier, code, type, session = null, deleteOnSuccess = true) {
    const id = normalizeIdentifier(identifier);
    const cleanCode = String(code || '').trim();

    const otpDoc = await Otp.findOne({ identifier: id, type })
      .sort({ createdAt: -1 })
      .session(session);

    if (!otpDoc) {
      throw new HttpError(400, 'This code has expired or is no longer valid. Please request a new OTP.', {
        code: 'OTP_EXPIRED',
      });
    }
    if (otpDoc.expiresAt && otpDoc.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: otpDoc._id }).session(session);
      throw new HttpError(400, 'Invalid or expired OTP');
    }

    // Don't rely on the TTL index alone; it can lag by up to a minute
    if (otpDoc.expiresAt <= new Date()) {
      await Otp.deleteOne({ _id: otpDoc._id });
      throw new HttpError(400, 'This code has expired. Please request a new OTP.', { code: 'OTP_EXPIRED' });
    }

    if (otpDoc.attempts >= OTP_MAX_ATTEMPTS) {
      await Otp.deleteOne({ _id: otpDoc._id });
      throw new HttpError(
        400,
        'Too many incorrect attempts. Your current OTP is no longer valid. Please request a new OTP to continue.',
        { code: 'OTP_EXHAUSTED', attemptsRemaining: 0 }
      );
    }

    if (otpDoc.sessionInfo) {
      // Managed by a third party: the caller verifies with the provider, then
      // consumes the code (clearOTP) or records a failure (recordFailedAttempt).
      return { sessionInfo: otpDoc.sessionInfo };
    }

    const isValid = await comparePassword(String(code || ''), otpDoc.code);
    if (!isValid) {
      otpDoc.attempts += 1;
      const remainingAttempts = Math.max(0, 3 - otpDoc.attempts);
      if (remainingAttempts === 0) {
        await Otp.deleteOne({ _id: otpDoc._id }).session(session);
        throw new HttpError(400, 'Too many incorrect attempts. Your current OTP is no longer valid. Please request a new OTP.');
      }
      await otpDoc.save({ session });
      throw new HttpError(400, `Incorrect OTP. ${remainingAttempts === 1 ? '1 attempt' : `${remainingAttempts} attempts`} remaining.`);
    }

    if (deleteOnSuccess) {
      // Atomic consume: if two requests race with the same code, only one wins
      const consumed = await Otp.findOneAndDelete({ _id: otpDoc._id, attempts: otpDoc.attempts }).session(session);
      if (!consumed) {
        throw new HttpError(400, 'This code has already been used. Please request a new OTP.', {
          code: 'OTP_EXPIRED',
        });
      }
    }

    return true;
  }

  /**
   * Clears any existing OTPs for the identifier and type.
   * Useful when an OTP flow is aborted or reset.
   */
  async clearOTP(identifier, type, session = null) {
    await Otp.deleteMany({ identifier: normalizeIdentifier(identifier), type }).session(session);
  }
}

export default new OtpService();

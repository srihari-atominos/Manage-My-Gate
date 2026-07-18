import Otp from './otp.model.js';
import { hashPassword, comparePassword } from '../../utils/crypto.utils.js';
import HttpError from '../../utils/httpError.utils.js';
import crypto from 'crypto';

export class OtpService {
  /**
   * Generates a random 6-digit OTP code.
   * @returns {string} The plain OTP code
   */
  generateCode() {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Creates and saves an OTP for a given identifier and type.
   * @param {string} identifier - Email or Phone
   * @param {string} type - OTP type (REGISTER, LOGIN, RESET, VERIFY)
   * @param {number} validityMinutes - Validity duration in minutes
   * @param {object} [session] - Mongoose session
   * @param {string} [sessionInfo] - Optional third-party session info (e.g. Firebase)
   */
  async createOTP(identifier, type, validityMinutes = 5, session = null, sessionInfo = null) {
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

    // Delete existing OTPs of the same type for this identifier to prevent spam
    await Otp.deleteMany({ identifier: identifier.toLowerCase(), type }).session(session);

    const otpDoc = new Otp({
      identifier: identifier.toLowerCase(),
      code: hashedCode,
      type,
      sessionInfo,
      expiresAt,
    });

    await otpDoc.save({ session });

    return plainCode;
  }

  /**
   * Verifies an OTP code.
   * @param {string} identifier - Email or Phone
   * @param {string} code - Plain OTP code provided by user
   * @param {string} type - OTP type
   * @param {object} [session] - Mongoose session
   */
  async verifyOTP(identifier, code, type, session = null, deleteOnSuccess = true) {
    const otpDoc = await Otp.findOne({ identifier: identifier.toLowerCase(), type })
      .sort({ createdAt: -1 })
      .session(session);

    if (!otpDoc) {
      throw new HttpError(400, 'Invalid or expired OTP');
    }

    if (otpDoc.attempts >= 3) {
      await Otp.deleteOne({ _id: otpDoc._id }).session(session);
      throw new HttpError(400, 'Too many failed attempts. Please request a new OTP.');
    }

    if (otpDoc.sessionInfo) {
      // If it's managed by a third party, just return the sessionInfo so the caller can verify it
      if (deleteOnSuccess) {
        await Otp.deleteOne({ _id: otpDoc._id }).session(session);
      }
      return { sessionInfo: otpDoc.sessionInfo };
    }

    const isValid = await comparePassword(code, otpDoc.code);

    if (!isValid) {
      otpDoc.attempts += 1;
      await otpDoc.save({ session });
      throw new HttpError(400, 'Invalid OTP');
    }

    // OTP is valid, conditionally delete it
    if (deleteOnSuccess) {
      await Otp.deleteOne({ _id: otpDoc._id }).session(session);
    }

    return true;
  }

  /**
   * Clears any existing OTPs for the identifier and type.
   * Useful when an OTP flow is aborted or reset.
   */
  async clearOTP(identifier, type, session = null) {
    await Otp.deleteMany({ identifier: identifier.toLowerCase(), type }).session(session);
  }
}

export default new OtpService();

import mongoose from 'mongoose';

/**
 * Per-identifier (email or phone) record of OTP sends, used for the resend
 * cooldown and the hourly request limit. Kept separate from Otp documents,
 * which are deleted every time a new code is issued.
 */
const otpThrottleSchema = new mongoose.Schema(
  {
    identifier: { type: String, required: true, unique: true, trim: true, lowercase: true },
    windowStart: { type: Date, required: true },
    sendCount: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: null },
    lockedUntil: { type: Date, default: null },
    // Auto-cleanup once nothing about this identifier is still relevant
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

export const OtpThrottle = mongoose.model('OtpThrottle', otpThrottleSchema);
export default OtpThrottle;

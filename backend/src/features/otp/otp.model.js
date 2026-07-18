import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      required: [true, 'Identifier (Email or Phone) is required'],
      trim: true,
      lowercase: true, // ensure case-insensitive matching
    },
    code: {
      type: String, // will store the hashed OTP
      required: [true, 'OTP Code is required'],
    },
    type: {
      type: String,
      enum: ['REGISTER', 'LOGIN', 'RESET', 'VERIFY'],
      required: [true, 'OTP Type is required'],
    },
    attempts: {
      type: Number,
      default: 0,
    },
    sessionInfo: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index: document will be auto-deleted when expiresAt is reached
    },
  },
  {
    timestamps: true,
  }
);

// We want to easily find the latest OTP for a specific identifier and type
otpSchema.index({ identifier: 1, type: 1, createdAt: -1 });

export const Otp = mongoose.model('Otp', otpSchema);
export default Otp;

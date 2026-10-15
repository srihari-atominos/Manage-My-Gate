import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    refreshToken: {
      type: String, // Hashed refresh token
      required: [true, 'Refresh token is required'],
    },
    deviceName: {
      type: String,
      default: 'Unknown Device',
    },
    browser: {
      type: String,
      default: 'Unknown Browser',
    },
    os: {
      type: String,
      default: 'Unknown OS',
    },
    ipAddress: {
      type: String,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      // Rotated: replaced by a newer refresh token; honoured briefly for concurrent refreshes
      enum: ['Active', 'Revoked', 'Rotated'],
      default: 'Active',
    },
    rotatedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  }
);

export const Session = mongoose.model('Session', sessionSchema);
export default Session;

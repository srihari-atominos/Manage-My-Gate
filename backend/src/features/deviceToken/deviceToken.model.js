import mongoose from 'mongoose';

const deviceTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    pushToken: {
      type: String,
      required: [true, 'Push token string is required'],
      trim: true,
      unique: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ['ios', 'android', 'web'],
      default: 'android',
    },
    deviceId: {
      type: String,
      trim: true,
      default: null,
    },
    deviceModel: {
      type: String,
      trim: true,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient user device lookups
deviceTokenSchema.index({ userId: 1, isActive: 1 });

export const DeviceToken = mongoose.model('DeviceToken', deviceTokenSchema);
export default DeviceToken;

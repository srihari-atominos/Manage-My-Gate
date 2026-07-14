import mongoose from 'mongoose';

const visitorPassTokenSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    passId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VisitorPass',
      required: [true, 'Visitor Pass ID is required'],
      index: true,
    },
    passCode: {
      type: String,
      required: [true, 'Pass code is required'],
      unique: true, // format: `${orgId}_${6_digit_key}`
      index: true,
    },
    shortKey: {
      type: String,
      required: [true, 'Short key is required'],
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Native MongoDB TTL index to auto-delete mapping document once pass validity expires
visitorPassTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const VisitorPassToken = mongoose.model('VisitorPassToken', visitorPassTokenSchema);
export default VisitorPassToken;

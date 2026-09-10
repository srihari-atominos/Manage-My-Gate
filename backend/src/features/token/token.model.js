import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: false,
      default: null,
    },
    inviterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
      index: true,
    },
    token: {
      type: String,
      required: [true, 'Token is required'],
      index: true,
    },
    type: {
      type: String,
      enum: ['INVITATION', 'RESET', 'MOBILE_HANDOFF'],
      required: [true, 'Token type is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'REVOKED', 'EXPIRED', 'EXCHANGED'],
      default: 'PENDING',
      index: true,
    },
    invitationSource: {
      type: String,
      enum: ['WEB', 'APP'],
      default: 'WEB',
    },
    used: {
      type: Boolean,
      default: false,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours standard window
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

tokenSchema.index({ token: 1, type: 1, status: 1 });
tokenSchema.index({ userId: 1, orgId: 1, type: 1 });
tokenSchema.index({ orgId: 1, type: 1, createdAt: -1 });

export const Token = mongoose.model('Token', tokenSchema);
export default Token;


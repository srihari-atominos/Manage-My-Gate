import mongoose from 'mongoose';

const communityNoteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    text: {
      type: String,
      required: [true, 'Text content is required'],
      trim: true,
      maxlength: [80, 'Community note text cannot exceed 80 characters'],
    },
    category: {
      type: String,
      enum: ['ACTIVITY', 'LOOKING_FOR', 'AVAILABLE', 'SOCIAL', 'HELP', 'INTRODUCTION', 'GENERAL'],
      default: 'GENERAL',
    },
    emoji: {
      type: String,
      default: '💬',
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

communityNoteSchema.index({ orgId: 1, isActive: 1, expiresAt: 1 });
communityNoteSchema.index({ userId: 1, isActive: 1 });

export const CommunityNote =
  mongoose.models.CommunityNote || mongoose.model('CommunityNote', communityNoteSchema);

export default CommunityNote;

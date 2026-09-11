import mongoose from 'mongoose';

const noticeVersionSchema = new mongoose.Schema(
  {
    noticeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notice',
      required: [true, 'Notice ID is required'],
      index: true,
    },
    version: {
      type: Number,
      required: [true, 'Version number is required'],
    },
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      required: true,
    },
    targetAudience: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    attachments: {
      type: [String],
      default: [],
    },
    images: {
      type: [
        {
          url: { type: String, required: true },
          filename: { type: String, required: true },
          uploadTimestamp: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    isCritical: {
      type: Boolean,
      default: false,
    },
    requiresAcknowledgement: {
      type: Boolean,
      default: false,
    },
    acknowledgementDeadline: {
      type: Date,
      default: null,
    },
    allowComments: {
      type: Boolean,
      default: true,
    },
    allowReactions: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

noticeVersionSchema.index({ noticeId: 1, version: 1 }, { unique: true });
noticeVersionSchema.index({ orgId: 1, noticeId: 1, version: -1 });

export const NoticeVersion = mongoose.model('NoticeVersion', noticeVersionSchema);
export default NoticeVersion;

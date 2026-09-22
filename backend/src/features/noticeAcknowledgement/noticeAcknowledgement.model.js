import mongoose from 'mongoose';

const noticeAcknowledgementSchema = new mongoose.Schema(
  {
    noticeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notice',
      required: [true, 'Notice ID is required'],
      index: true,
    },
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
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Villa',
      default: null,
    },
    acknowledgedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce unique acknowledgement per user per notice
noticeAcknowledgementSchema.index({ noticeId: 1, userId: 1 }, { unique: true });
noticeAcknowledgementSchema.index({ orgId: 1, noticeId: 1, acknowledgedAt: -1 });

export const NoticeAcknowledgement = mongoose.model('NoticeAcknowledgement', noticeAcknowledgementSchema);
export default NoticeAcknowledgement;

import mongoose from 'mongoose';

export const NOTICE_REACTION_TYPES = ['LIKE', 'LOVE', 'HELPFUL', 'APPLAUD', 'DISLIKE'];

const noticeReactionSchema = new mongoose.Schema(
  {
    noticeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notice',
      required: [true, 'Notice ID is required'],
      index: true,
    },
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    reactionType: {
      type: String,
      required: [true, 'Reaction type is required'],
      enum: NOTICE_REACTION_TYPES,
      default: 'LIKE',
    },
  },
  {
    timestamps: true,
  }
);

// One reaction per user per notice
noticeReactionSchema.index({ noticeId: 1, userId: 1 }, { unique: true });
noticeReactionSchema.index({ orgId: 1, noticeId: 1, reactionType: 1 });

export const NoticeReaction = mongoose.model('NoticeReaction', noticeReactionSchema);
export default NoticeReaction;

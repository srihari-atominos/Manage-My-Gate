import mongoose from 'mongoose';

export const POLL_REACTION_TYPES = ['LIKE', 'LOVE', 'HELPFUL', 'APPLAUD', 'DISLIKE', 'IMPORTANT', 'THANKS'];

const pollReactionSchema = new mongoose.Schema(
  {
    pollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Poll',
      required: [true, 'Poll ID is required'],
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
      enum: POLL_REACTION_TYPES,
      default: 'LIKE',
    },
  },
  {
    timestamps: true,
  }
);

// One reaction per user per poll
pollReactionSchema.index({ pollId: 1, userId: 1 }, { unique: true });
pollReactionSchema.index({ orgId: 1, pollId: 1, reactionType: 1 });

export const PollReaction = mongoose.model('PollReaction', pollReactionSchema);
export default PollReaction;

import mongoose from 'mongoose';

const pollVoteSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    pollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Poll',
      required: true,
      index: true
    },
    residentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    optionIndex: {
      type: Number,
      required: true
    }
  },
  { timestamps: true }
);

// Prevent a resident from voting twice on the same poll
pollVoteSchema.index({ pollId: 1, residentId: 1 }, { unique: true });

const PollVote = mongoose.model('PollVote', pollVoteSchema);

export default PollVote;

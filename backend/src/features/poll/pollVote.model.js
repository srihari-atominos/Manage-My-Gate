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
      required: false
    },
    selectedOptions: {
      type: [Number],
      required: true,
      default: function () {
        return typeof this.optionIndex === 'number' ? [this.optionIndex] : [];
      }
    },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Villa',
      default: null,
      index: true
    }
  },
  { timestamps: true }
);

// Pre-save hook: ensure optionIndex and selectedOptions stay synchronized
pollVoteSchema.pre('save', function (next) {
  if (Array.isArray(this.selectedOptions) && this.selectedOptions.length > 0) {
    this.optionIndex = this.selectedOptions[0];
  } else if (typeof this.optionIndex === 'number') {
    this.selectedOptions = [this.optionIndex];
  }
  next();
});

// Prevent a resident from voting twice on the same poll
pollVoteSchema.index({ pollId: 1, residentId: 1 }, { unique: true });
// Fast query for unit votes in ONE_PER_UNIT mode
pollVoteSchema.index({ pollId: 1, unitId: 1 });

const PollVote = mongoose.model('PollVote', pollVoteSchema);

export default PollVote;

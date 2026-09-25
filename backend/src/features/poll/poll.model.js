import mongoose from 'mongoose';
import targetAudienceSchema from '../audience/audience.schema.js';

const pollOptionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100
  },
  votesCount: {
    type: Number,
    default: 0
  }
});

const pollSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    question: {
      type: String,
      required: [true, 'Poll question is required'],
      trim: true,
      minlength: [3, 'Poll question must be at least 3 characters'],
      maxlength: [200, 'Poll question cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    options: {
      type: [pollOptionSchema],
      validate: [
        {
          validator: function (v) {
            if (this.status === 'Draft') {
              return !v || (v.length >= 0 && v.length <= 10);
            }
            return v && v.length >= 2 && v.length <= 10;
          },
          message: 'Poll must have between 2 and 10 options.'
        },
        {
          validator: function (v) {
            if (!v || v.length === 0) return true;
            const texts = v.map((opt) => (opt.text ? opt.text.trim().toLowerCase() : '')).filter(Boolean);
            const uniqueTexts = new Set(texts);
            return uniqueTexts.size === texts.length;
          },
          message: 'Poll options must be unique.'
        }
      ],
      required: false
    },
    status: {
      type: String,
      enum: ['Draft', 'Scheduled', 'Active', 'Closed'],
      default: 'Draft',
      index: true
    },
    scheduleDate: {
      type: Date,
      default: null,
      index: true
    },
    endDate: {
      type: Date,
      required: [
        function () {
          return this.status !== 'Draft';
        },
        'End date is required'
      ]
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    visibility: {
      type: String,
      enum: ['Everyone', 'Community Admin Only', 'Residents Only'],
      default: 'Everyone'
    },
    closedAt: {
      type: Date
    },
    targetAudience: {
      type: targetAudienceSchema,
      default: () => ({ targetType: 'ALL' })
    },
    choiceType: {
      type: String,
      enum: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE'],
      default: 'SINGLE_CHOICE'
    },
    maxChoices: {
      type: Number,
      default: 1,
      min: 1
    },
    votingMode: {
      type: String,
      enum: ['ONE_PER_USER', 'ONE_PER_UNIT'],
      default: 'ONE_PER_USER'
    },
    resultsVisibility: {
      type: String,
      enum: ['ALWAYS', 'AFTER_VOTE', 'AFTER_EXPIRY', 'ADMIN_ONLY'],
      default: 'ALWAYS'
    },
    isAnonymous: {
      type: Boolean,
      default: false
    },
    quorumPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    totalEligibleVoters: {
      type: Number,
      default: 0,
      min: 0
    },
    totalVotes: {
      type: Number,
      default: 0,
      min: 0
    },
    outcome: {
      type: String,
      enum: ['PENDING', 'PASSED', 'REJECTED', 'NO_QUORUM', 'TIED'],
      default: 'PENDING'
    },
    winningOption: {
      index: { type: Number },
      text: { type: String },
      votesCount: { type: Number }
    },
    finalizedAt: {
      type: Date
    },
    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

// Auto-close poll if endDate has passed
pollSchema.methods.checkAndClose = function () {
  if (this.status === 'Active' && this.endDate && this.endDate < new Date()) {
    this.status = 'Closed';
    this.closedAt = this.endDate;
    return true; // indicates it was changed
  }
  return false;
};

const Poll = mongoose.model('Poll', pollSchema);

export default Poll;

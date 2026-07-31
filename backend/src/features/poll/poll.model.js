import mongoose from 'mongoose';

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
      minlength: [5, 'Poll question must be at least 5 characters'],
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
            return v && v.length >= 2 && v.length <= 5;
          },
          message: 'Poll must have between 2 and 5 options.'
        },
        {
          validator: function (v) {
            const texts = v.map((opt) => opt.text.trim().toLowerCase());
            const uniqueTexts = new Set(texts);
            return uniqueTexts.size === texts.length;
          },
          message: 'Poll options must be unique.'
        }
      ],
      required: true
    },
    status: {
      type: String,
      enum: ['Draft', 'Active', 'Closed'],
      default: 'Draft',
      index: true
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
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

import mongoose from 'mongoose';

const { Schema } = mongoose;

const quoteApprovalSchema = new Schema(
  {
    quoteId: {
      type: Schema.Types.ObjectId,
      ref: 'PlatformQuote',
      required: true,
      index: true,
    },
    approvalTier: {
      type: String,
      enum: ['NONE', 'SALES_MANAGER', 'PLATFORM_ADMIN'],
      required: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    decision: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    comments: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const QuoteApproval = mongoose.models.QuoteApproval || mongoose.model('QuoteApproval', quoteApprovalSchema);

export default QuoteApproval;
